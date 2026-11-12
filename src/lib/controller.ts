import { Store } from "@tanstack/store";
import { applyPrompt, chatId, hydrate, isGenerating, isHydrating, isNewChatPage, native, resetChatCache, sendText, snapshot } from "./bridge";
import { DEFAULT_CONFIG } from "./langs";
import { mic } from "./recorder";
import { speak, speechStore, stopSpeaking } from "./speech";
import { DEFAULT_PREFS, storage } from "./storage";
import type { ModelTurn, Prefs, RecState, SessionConfig, Turn } from "./types";
import { sleep } from "./utils";

export interface SentRec { url: string; ms: number; peaks: number[] }
export interface AppState {
  on: boolean;
  ready: boolean;
  turns: Turn[];
  generating: boolean;
  hydrating: boolean;
  chatId: string | null;
  session: SessionConfig;
  prefs: Prefs;
  rec: { state: RecState; startedAt: number; ms: number; url: string | null; peaks: number[] };
  sent: Record<number, SentRec>;
  playingRec: string | null;
  toast: { id: number; msg: string } | null;
  dialog: null | "new" | "settings" | "notebook";
}

export const appStore = new Store<AppState>({
  on: false, ready: false, turns: [], generating: false, hydrating: false, chatId: null,
  session: { ...DEFAULT_CONFIG } as SessionConfig, prefs: DEFAULT_PREFS,
  rec: { state: "idle", startedAt: 0, ms: 0, url: null, peaks: [] },
  sent: {}, playingRec: null, toast: null, dialog: null,
});
const set = (p: Partial<AppState>) => appStore.setState((s) => ({ ...s, ...p }));
const get = () => appStore.state;

/** Cố định khi cuộc trò chuyện đã bắt đầu: ngôn ngữ, chế độ, trình độ… chỉ đổi được bằng buổi mới. */
export const isLocked = (s: Pick<AppState, "turns" | "chatId">) => s.turns.length > 0 || (!!s.chatId);

let toastId = 0;
export const toast = (msg: string) => set({ toast: { id: ++toastId, msg } });

/* ---------- đọc ---------- */
export function say(key: string, text: string, slow = false, onEnd?: () => void) {
  const { session, prefs } = get();
  stopPlayback();
  speak({ key, text, lang: session.lang, rate: prefs.rate, voiceName: prefs.voiceName, slow, onEnd });
}
export const sayWord = (w: string) => say("word:" + w, w.replace(/[^\p{L}\p{N}'’-]/gu, ""));

export function latestSpeakable(turns: Turn[], _mode: SessionConfig["mode"]): { key: string; text: string }[] {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.role !== "model" || t.empty) continue;
    const out: { key: string; text: string }[] = [];
    if (t.say) out.push({ key: `say:${t.key}`, text: t.say });
    if (t.q) out.push({ key: `q:${t.key}`, text: t.q.text });
    if (out.length) return out;
  }
  return [];
}
export function playLatest() {
  const items = latestSpeakable(get().turns, get().session.mode);
  const run = (i: number) => { if (items[i]) say(items[i].key, items[i].text, false, () => run(i + 1)); };
  run(0);
}

/* ---------- nghe lại bản ghi ---------- */
const player = new Audio();
player.addEventListener("ended", () => stopPlayback());
export function stopPlayback() { player.pause(); if (get().playingRec) set({ playingRec: null }); }
export function playRec(id: string, url: string | null | undefined) {
  if (!url) return;
  const same = get().playingRec === id && !player.paused;
  stopSpeaking(); stopPlayback();
  if (same) return;
  player.src = url;
  player.play().then(() => set({ playingRec: id })).catch(() => toast("Không phát được bản ghi."));
}
export const playerEl = player;

/* ---------- ghi âm ---------- */
let busy = false;
const setRec = (p: Partial<AppState["rec"]>) => set({ rec: { ...get().rec, ...p } });
async function guarded(fn: () => Promise<void>, fallback: RecState = "idle") {
  if (busy) return;
  busy = true;
  try { await fn(); } catch (e) { toast((e as Error).message || String(e)); mic.abort(); setRec({ state: get().rec.state === "recorded" ? "recorded" : fallback }); }
  finally { busy = false; }
}

async function beginNative() {
  setRec({ state: "starting" });
  await native.start(() => mic.start());
  setRec({ state: "recording", startedAt: Date.now(), ms: 0, peaks: [] });
}
export const startRecording = () => guarded(async () => {
  stopSpeaking(); stopPlayback();
  await native.open();
  await beginNative();
});
export const stopRecording = () => guarded(async () => {
  const ms = Date.now() - get().rec.startedAt;
  setRec({ state: "stopping" });
  await native.stop();
  const blob = await mic.stop();
  const prev = get().rec.url; if (prev) URL.revokeObjectURL(prev);
  setRec({ state: "recorded", ms, url: blob ? URL.createObjectURL(blob) : null, peaks: [...mic.peaks] });
}, "recorded");
export const redoRecording = () => guarded(async () => {
  stopPlayback();
  const prev = get().rec.url; if (prev) URL.revokeObjectURL(prev);
  setRec({ url: null, peaks: [] });
  native.redo();
  await beginNative();
});
export const cancelRecording = () => guarded(async () => {
  stopPlayback(); mic.abort();
  const prev = get().rec.url; if (prev) URL.revokeObjectURL(prev);
  await native.cancel();
  setRec({ state: "idle", url: null, ms: 0, peaks: [] });
});
export const sendRecording = () => guarded(async () => {
  stopPlayback();
  const { rec } = get();
  setRec({ state: "sending" });
  const idx = await native.send();
  if (rec.url) set({ sent: { ...get().sent, [idx]: { url: rec.url, ms: rec.ms, peaks: rec.peaks } } });
  setRec({ state: "idle", url: null, ms: 0, peaks: [] });
}, "recorded");

export async function summarize() {
  try { await sendText(get().session.output === "en" ? "Summarize session" : "Tổng kết buổi"); } catch (e) { toast((e as Error).message); }
}

/* ---------- buổi mới ---------- */
let bindConfig: SessionConfig | null = null;

async function startFlow(cfg: SessionConfig) {
  await applyPrompt(cfg);
  await sendText(cfg.output === "en" ? "Start" : "Bắt đầu");
}
async function runPending() {
  const p = await storage.pending();
  if (!p) return;
  await storage.setPending(null);
  bindConfig = p.config;
  set({ session: p.config });
  await sleep(800);
  try { await startFlow(p.config); toast("Đã nạp prompt và bắt đầu buổi mới."); } catch (e) { toast((e as Error).message); }
}
export async function startNewSession(cfg: SessionConfig) {
  stopSpeaking(); stopPlayback();
  await storage.setLastConfig(cfg);
  await storage.setPending({ config: cfg });
  set({ dialog: null });
  if (isNewChatPage()) void runPending();
  else location.href = "https://aistudio.google.com/prompts/new_chat";
}

/* ---------- vòng lặp chính ---------- */
let route = "";
let primed = false;
const played = new Set<string>();
let hydrateKey = "";

async function onRoute() {
  resetChatCache(); played.clear(); primed = false; hydrateKey = "";
  const id = chatId();
  set({ chatId: id, turns: [], sent: {} });
  if (id) {
    const sessions = await storage.sessions();
    const cfg = sessions[id] ?? (await storage.lastConfig());
    set({ session: cfg });
  } else if (get().on) void runPending();
}

function tick() {
  if (!get().on) return;
  const p = location.pathname;
  if (p !== route) { route = p; void onRoute(); return; }

  const turns = snapshot();
  const gen = isGenerating();
  const same = turns.length === get().turns.length && turns.every((t, i) => t === get().turns[i]);
  if (!same || gen !== get().generating || isHydrating() !== get().hydrating) set({ turns: same ? get().turns : turns, generating: gen, hydrating: isHydrating() });

  // gắn cấu hình cho chat vừa tạo
  const id = chatId();
  if (id && bindConfig) { void storage.setSession(id, bindConfig); bindConfig = null; }

  // nạp các lượt lazy chưa render
  const lazy = turns.some((t, i) => t.empty && !(gen && i === turns.length - 1) && !(t.role === "model" && i > 0 && turns[i - 1].role === "model"));
  const hk = `${id}:${turns.length}`;
  if (lazy && !gen && hk !== hydrateKey && !isHydrating()) { hydrateKey = hk; void hydrate(() => tick()); }

  // tự đọc câu hỏi mới
  if (!primed) {
    if (turns.length && !gen) { turns.forEach((t) => played.add(t.key)); primed = true; }
    else if (!turns.length && id === null) primed = true;
    else if (gen) primed = true;
  } else if (!gen) {
    const last = turns[turns.length - 1] as ModelTurn | undefined;
    if (last && last.role === "model" && !last.empty && !played.has(last.key)) {
      played.add(last.key);
      if (get().prefs.autoPlay && (last.q || last.say)) playLatest();
    }
  }

  // đồng bộ khi hộp thoại gốc bị đóng bằng cách khác
  const rs = get().rec.state;
  if (!busy && (rs === "recording" || rs === "recorded") && !native.isOpen()) { mic.abort(); stopPlayback(); setRec({ state: "idle", url: null, peaks: [] }); }
}

export async function setOn(v: boolean) {
  set({ on: v });
  await storage.setOn(v);
  document.documentElement.classList.toggle("noidi-on", v);
  if (v) { route = ""; tick(); } else { stopSpeaking(); stopPlayback(); }
}
export async function updatePrefs(p: Partial<Prefs>) {
  const next = { ...get().prefs, ...p };
  set({ prefs: next });
  await storage.setPrefs(next);
}
export const setDialog = (d: AppState["dialog"]) => set({ dialog: d });

export async function boot() {
  const [on, prefs] = await Promise.all([storage.on(), storage.prefs()]);
  set({ prefs, ready: true });
  await setOn(on);
  let n = 0;
  setInterval(() => { n++; if (get().generating || n % 3 === 0) tick(); }, 350);

  window.addEventListener("keydown", (e) => {
    if (!get().on || !e.altKey) return;
    const s = get().rec.state;
    if (e.code === "KeyR") { e.preventDefault(); if (s === "idle") void startRecording(); else if (s === "recording") void stopRecording(); }
    else if (e.code === "Enter" && s === "recorded") { e.preventDefault(); void sendRecording(); }
    else if (e.code === "KeyP" && s === "recorded") { e.preventDefault(); playRec("draft", get().rec.url); }
    else if (e.code === "KeyL") { e.preventDefault(); playLatest(); }
  }, true);
  void speechStore;
}
