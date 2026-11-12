import { Store } from "@tanstack/store";
import { applyPrompt, chatId, hydrate, isGenerating, isHydrating, isNewChatPage, currentModelId, health, lastDomActivity, native, snackbarText, switchToLighterModel, resetChatCache, selectModel, sendText, snapshot } from "./bridge";
import { DEFAULT_CONFIG } from "./langs";
import { mic } from "./recorder";
import { speak, speechStore, stopSpeaking } from "./speech";
import { DEFAULT_PREFS, storage } from "./storage";
import type { ModelTurn, Prefs, RecState, SessionConfig, Turn } from "./types";
import { sleep, waitFor } from "./utils";

export interface SentRec { url: string; ms: number; peaks: number[] }
export interface AppState {
  on: boolean;
  ready: boolean;
  turns: Turn[];
  generating: boolean;
  /** Giám khảo không trả lời (lượt rỗng / không có phản hồi) sau khi đã gửi */
  stalled: boolean;
  hydrating: boolean;
  chatId: string | null;
  session: SessionConfig;
  prefs: Prefs;
  rec: { state: RecState; startedAt: number; ms: number; url: string | null; peaks: number[] };
  sent: Record<number, SentRec>;
  playingRec: string | null;
  toast: { id: number; msg: string } | null;
  dialog: null | "new" | "settings" | "notebook" | "model";
  /** Model đang chọn trong AI Studio */
  model: string;
}

export const appStore = new Store<AppState>({
  on: false, ready: false, turns: [], generating: false, stalled: false, hydrating: false, chatId: null,
  session: { ...DEFAULT_CONFIG } as SessionConfig, prefs: DEFAULT_PREFS,
  rec: { state: "idle", startedAt: 0, ms: 0, url: null, peaks: [] },
  sent: {}, playingRec: null, toast: null, dialog: null, model: "",
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
  try { await fn(); } catch (e) { toast((e as Error).message || String(e)); mic.abort(); const next = get().rec.state === "recorded" ? "recorded" : fallback; setRec({ state: next }); if (next === "idle" && native.isOpen()) void native.cancel(); }
  finally { busy = false; }
}

const MIC_BLOCKED = "Chưa có quyền dùng micro. Bấm biểu tượng ổ khoá cạnh thanh địa chỉ → Micro → Cho phép, rồi tải lại trang.";
async function micPermission(): Promise<PermissionState> {
  try { return (await navigator.permissions.query({ name: "microphone" as PermissionName })).state; } catch { return "prompt"; }
}

async function beginNative() {
  const perm = await micPermission();
  if (perm === "denied") throw new Error(MIC_BLOCKED);
  setRec({ state: "starting" });
  mic.begin();
  await native.start();
  // "Stop recording" hiện ra chưa chắc là micro đã chạy (bị chặn quyền thì hộp thoại gốc quay lại "Start recording").
  // Chờ luồng micro thật sự mở: tối đa 30s khi Chrome đang hỏi quyền, 3s khi đã cấp quyền.
  const limit = perm === "granted" ? 3000 : 30000;
  await waitFor(() => mic.tapped || !native.hasStop(), limit, 100);
  if (!native.hasStop()) throw new Error(MIC_BLOCKED);
  if (!mic.tapped && perm !== "granted") throw new Error(MIC_BLOCKED);
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
  try {
    await native.stop();
  } catch (e) {
    // Dừng thất bại: dọn sạch để không kẹt ở trạng thái "đã ghi" mà không có bản ghi.
    console.warn("[noidi] native stop failed", (e as Error).message, native.debugButtons());
    mic.abort();
    await native.cancel();
    setRec({ state: "idle", url: null, ms: 0, peaks: [] });
    throw new Error("Không dừng được bản ghi của AI Studio. Hãy thử ghi lại; nếu vẫn lỗi, kiểm tra micro và quyền micro của Chrome.");
  }
  const prev = get().rec.url; if (prev) { try { URL.revokeObjectURL(prev); } catch { /* */ } }
  const r = await mic.stop();
  setRec({ state: "recorded", ms: r?.ms || ms, url: r?.url ?? null, peaks: [...mic.peaks] });
  if (!r?.url) toast("Đã ghi xong nhưng chưa nghe lại được bản ghi này. Bạn vẫn có thể gửi.");
}, "idle");
export const redoRecording = () => guarded(async () => {
  stopPlayback();
  const prev = get().rec.url; if (prev) { try { URL.revokeObjectURL(prev); } catch { /* */ } }
  setRec({ url: null, peaks: [] });
  native.redo();
  await beginNative();
});
export const cancelRecording = () => guarded(async () => {
  stopPlayback(); mic.abort();
  const prev = get().rec.url; if (prev) { try { URL.revokeObjectURL(prev); } catch { /* */ } }
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

const sendQuick = async (vi: string, en: string) => {
  try { await sendText(get().session.output === "en" ? en : vi); } catch (e) { toast((e as Error).message); }
};
/** Nhận ra tin nhắn do extension tự gửi để hiện gọn thay vì lộ nội dung kỹ thuật. */
export function quickLabel(text: string): { kind: "retry" | "skip" | "summary"; label: string } | null {
  if (/^(Phản hồi trước bị thiếu|Your previous reply was missing)/i.test(text)) return { kind: "retry", label: "Đã nhờ giám khảo trả lời lại" };
  if (/^(Câu khác|Next question)$/i.test(text)) return { kind: "skip", label: "Đã đổi sang câu hỏi khác" };
  if (/^(Tổng kết buổi|Summarize session)$/i.test(text)) return { kind: "summary", label: "Đã yêu cầu tổng kết buổi" };
  return null;
}

/** Đổi sang câu hỏi khác mà không chấm. */
export const skipQuestion = () => sendQuick("Câu khác", "Next question");
/** Yêu cầu giám khảo trả lời lại khi lượt trước bị rỗng/lỗi. */
export const retryReply = () => sendQuick(
  "Phản hồi trước bị thiếu hoặc bị cắt. Hãy trả lời lại câu trả lời trước của tôi đầy đủ theo giao thức marker, kết thúc bằng @@VERDICT và @@Q.",
  "Your previous reply was missing or cut off. Please answer my previous message again in full using the marker protocol, ending with @@VERDICT and @@Q.",
);

/** Hết hạn mức: chuyển sang model nhẹ hơn rồi nhờ giám khảo trả lời lại. */
export async function switchModelAndRetry() {
  try {
    const id = await switchToLighterModel();
    toast(`Đã chuyển sang ${id}. Đang gửi lại…`);
    await sleep(600);
    await retryReply();
  } catch (e) { toast((e as Error).message); }
}

export async function pickModel(id: string) {
  try {
    await selectModel(id);
    set({ model: id, dialog: null });
    toast(`Đã chuyển sang ${id}.`);
  } catch (e) { toast((e as Error).message); }
}

export async function summarize() {
  try { await sendText(get().session.output === "en" ? "Summarize session" : "Tổng kết buổi"); } catch (e) { toast((e as Error).message); }
}

/* ---------- buổi mới ---------- */
let bindConfig: SessionConfig | null = null;
/** Buổi vừa tạo: câu hỏi đầu tiên phải được tự đọc dù URL đổi giữa chừng. */
let freshSession = false;

async function startFlow(cfg: SessionConfig) {
  await applyPrompt(cfg);
  await sendText(cfg.output === "en" ? "Start" : "Bắt đầu");
}
async function runPending() {
  const p = await storage.pending();
  if (!p) return;
  await storage.setPending(null);
  bindConfig = p.config;
  freshSession = true;
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
  resetChatCache(); played.clear(); primed = freshSession; freshSession = false; hydrateKey = "";
  const id = chatId();
  set({ chatId: id, turns: [], sent: {} });
  if (id) {
    const sessions = await storage.sessions();
    const cfg = sessions[id] ?? (await storage.lastConfig());
    set({ session: cfg });
  } else if (get().on) void runPending();
}

let quietSince = 0;
let lastSnack = "";
let healthTick = 0;
const healthWarned = new Set<string>();
/**
 * Giám khảo "im lặng": lượt cuối là của user / model rỗng, hoặc model trả lời nửa chừng
 * (đã chấm nhưng thiếu verdict lẫn câu hỏi, không phải bản tổng kết). Chờ 7s trước khi báo.
 */
export function isStalledState(turns: Turn[], gen: boolean): boolean {
  const last = turns[turns.length - 1];
  if (!last || gen) return false;
  if (last.role === "model" && last.error) return false;
  if (last.role === "user" || last.empty) return true;
  const prevUser = [...turns].reverse().find((t) => t.role === "user");
  const askedSummary = prevUser?.role === "user" && /tổng kết|summari[sz]e/i.test(prevUser.text);
  return !!(last.transcript || last.score) && !last.verdict && !last.q && !askedSummary;
}
function stallCheck(turns: Turn[], gen: boolean): boolean {
  if (!isStalledState(turns, gen)) { quietSince = 0; return false; }
  if (!quietSince) quietSince = Date.now();
  // phải im lặng cả về trạng thái lẫn DOM (AI Studio có lúc đang nghĩ mà nút Stop chưa hiện)
  return Date.now() - quietSince > 7000 && Date.now() - lastDomActivity() > 20000;
}

function tick() {
  if (!get().on) return;
  const p = location.pathname;
  if (p !== route) { route = p; void onRoute(); return; }

  const turns = snapshot();
  const gen = isGenerating();
  const stalled = stallCheck(turns, gen);
  const model = currentModelId();
  if (model && model !== get().model) set({ model });
  const same = turns.length === get().turns.length && turns.every((t, i) => t === get().turns[i]);
  if (!same || gen !== get().generating || stalled !== get().stalled || isHydrating() !== get().hydrating) set({ turns: same ? get().turns : turns, generating: gen, stalled, hydrating: isHydrating() });

  // AI Studio đổi giao diện? báo một lần cho từng thứ không dò được
  if (++healthTick % 20 === 0) {
    const miss = health().filter((m) => !healthWarned.has(m));
    if (miss.length) { miss.forEach((m) => healthWarned.add(m)); console.warn("[noidi] không dò được:", miss); toast(`AI Studio có thể đã đổi giao diện: không thấy ${miss.join(", ")}. Một số tính năng có thể lỗi.`); }
  }

  // thông báo (snackbar) của AI Studio: báo lỗi cho người dùng thay vì để im lặng
  const sb = snackbarText();
  if (sb && sb !== lastSnack) { lastSnack = sb; if (/error|fail|limit|quota|unable|lỗi/i.test(sb)) toast(`AI Studio: ${sb}`); }
  if (!sb) lastSnack = "";

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

/** Lệnh từ popup của extension (thanh công cụ Chrome). */
function listenPopup() {
  if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;
  chrome.runtime.onMessage.addListener((m: { noidi?: string }, _sender, reply) => {
    const st = get();
    switch (m?.noidi) {
      case "status": {
        const score = [...st.turns].reverse().map((t) => (t.role === "model" ? t.score?.find((x) => x.key === "NATIVE")?.value : undefined)).find(Boolean);
        reply({ on: st.on, hasSession: st.turns.length > 0, rec: st.rec.state, model: st.model, session: st.session, generating: st.generating, score: score ? Number(score) : undefined });
        break;
      }
      case "open": void setOn(true); reply({ ok: true }); break;
      case "record": void (async () => { await setOn(true); if (get().turns.length > 0) void startRecording(); else set({ dialog: "new" }); })(); reply({ ok: true }); break;
      case "new": void setOn(true).then(() => set({ dialog: "new" })); reply({ ok: true }); break;
      case "model": void setOn(true).then(() => set({ dialog: "model" })); reply({ ok: true }); break;
      default: return false;
    }
    return false;
  });
  // cài đặt đổi từ popup áp dụng ngay
  chrome.storage?.onChanged?.addListener((ch) => { if (ch.prefs?.newValue) set({ prefs: { ...DEFAULT_PREFS, ...ch.prefs.newValue } }); });
}

export async function boot() {
  const [on, prefs] = await Promise.all([storage.on(), storage.prefs()]);
  set({ prefs, ready: true });
  await setOn(on);
  listenPopup();
  let n = 0;
  setInterval(() => { n++; if (get().generating || n % 3 === 0) tick(); }, 350);

  window.addEventListener("keydown", (e) => {
    if (!get().on || !e.altKey) return;
    const s = get().rec.state;
    if (e.code === "KeyR") { e.preventDefault(); if (s === "idle" && get().turns.length > 0) void startRecording(); else if (s === "recording") void stopRecording(); }
    else if (e.code === "Enter" && s === "recorded") { e.preventDefault(); void sendRecording(); }
    else if (e.code === "KeyP" && s === "recorded") { e.preventDefault(); playRec("draft", get().rec.url); }
    else if (e.code === "KeyL") { e.preventDefault(); playLatest(); }
  }, true);
  void speechStore;
}
