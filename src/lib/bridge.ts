import { parseModelElement } from "./parser";
import { pickLighter } from "./errors";
import { buildPrompt } from "./prompt";
import type { SessionConfig, Turn } from "./types";
import { byLabel, first, all, LABEL, SEL } from "./selectors";
import { sleep, waitFor } from "./utils";

/* Mọi thứ chạm vào DOM của AI Studio nằm ở đây. */
const CLICKABLE_ALL = "button, [role=button], [role=option], [role=menuitem]";

export const chatId = () => {
  const id = location.pathname.match(/^\/prompts\/([^/?#]+)/)?.[1];
  return id && id !== "new_chat" ? id : null;
};
export const isNewChatPage = () => location.pathname.startsWith("/prompts/new_chat");
export const scroller = () => first(SEL.scroller);
const runWrap = () => first(SEL.runWrap);
export const isGenerating = () => LABEL.stop.test(`${runWrap()?.textContent ?? ""} ${first(SEL.runBtn)?.getAttribute("aria-label") ?? ""}`);
const runButton = () => {
  const b = first<HTMLButtonElement>(SEL.runBtn);
  return b && !b.disabled && b.getAttribute("aria-disabled") !== "true" ? b : null;
};
const turnEls = () => all(SEL.turn);
/** Lượt của model hay của người dùng: dò theo class/ cấu trúc, có dự phòng. */
const isModelTurn = (el: Element) =>
  /\bmodel\b|model-/i.test(el.className?.toString() ?? "") || !!el.querySelector("[class*='model-prompt' i], [class*='model-turn' i]");

/* ---------- đọc hội thoại (có cache vì AI Studio chỉ render turn đang hiện trên màn hình) ---------- */
const cache = new Map<number, Turn>();
const sigs = new Map<number, string>();
let wasGen = false;
let domChangedAt = Date.now();
/** Lần cuối nội dung chat gốc thay đổi (kể cả phần "thinking" không hiển thị). */
export const lastDomActivity = () => domChangedAt;
export const resetChatCache = () => { cache.clear(); sigs.clear(); domChangedAt = Date.now(); };

/** Lỗi AI Studio in trong lượt: phần tử "giống lỗi" nhỏ nhất, không chứa nội dung trả lời. */
function findError(turn: Element): string | undefined {
  const cands: Element[] = [];
  for (const c of SEL.errorLike) { try { cands.push(...turn.querySelectorAll(c)); } catch { /* */ } }
  const small = cands
    .filter((e) => !e.closest("[data-noidi]") && !first(SEL.thought, e.parentElement ?? turn)?.contains(e))
    .map((e) => ({ e, t: (e.textContent ?? "").replace(/\s+/g, " ").trim() }))
    .filter((x) => x.t.length > 0 && x.t.length < 400 && !x.e.querySelector("p, table, ul, ol, blockquote"))
    .sort((a, b) => a.t.length - b.t.length)[0];
  if (!small) return undefined;
  return small.t.replace(/^\s*(error|warning|lỗi)\s*[:\-]?\s*/i, "").trim() || "Lỗi không rõ từ AI Studio.";
}

function parseTurn(el: Element, idx: number, userIdx: number): Turn {
  if (!isModelTurn(el)) {
    const text = (first(SEL.userText, el)?.textContent ?? "").replace(/\s+/g, " ").trim();
    const audio = !!first(SEL.audioMarker, el);
    return { role: "user", key: "u" + idx, idx: userIdx, text, audio, hidden: userIdx === 0 && /^(bắt đầu|start)$/i.test(text), empty: !text && !audio };
  }
  const error = findError(el);
  const parsed = parseModelElement(el);
  return { key: "m" + idx, ...parsed, ...(error ? { error, empty: false } : {}) };
}

/** Quét DOM hiện có, trả danh sách turn đầy đủ nhất (kết hợp cache). */
/** Khi đang stream, không cho trường đã có biến mất hoặc ngắn lại (AI Studio thỉnh thoảng render lại tạm thời). */
function mergeStreaming(old: Turn, nu: Turn): Turn {
  if (old.role !== "model" || nu.role !== "model" || old.empty) return nu;
  const out: Record<string, unknown> = { ...nu };
  for (const k of Object.keys(old) as (keyof typeof old)[]) {
    if (k === "open" || k === "key") continue;
    if (out[k] === undefined && old[k] !== undefined) out[k] = old[k];
  }
  if (old.q && nu.q && old.q.text.length > nu.q.text.length && old.q.text.startsWith(nu.q.text)) out.q = old.q;
  if (old.say && nu.say && old.say.length > nu.say.length && old.say.startsWith(nu.say)) out.say = old.say;
  out.empty = false;
  return out as unknown as Turn;
}

export function snapshot(): Turn[] {
  const els = turnEls();
  const gen = isGenerating();
  // Vừa hết stream: parse lại lần cuối, không merge, để lấy bản chuẩn.
  if (wasGen && !gen) for (let k = Math.max(0, els.length - 2); k < els.length; k++) sigs.delete(k);
  wasGen = gen;
  let userIdx = 0;
  els.forEach((el, i) => {
    const isUser = !isModelTurn(el);
    const sig = (isUser ? "u" : "m") + (el.textContent?.length ?? 0) + ":" + (first(SEL.audioMarker, el) ? 1 : 0);
    const uIdx = isUser ? userIdx++ : -1;
    if (sigs.get(i) === sig && cache.has(i)) return;
    domChangedAt = Date.now();
    let t = parseTurn(el, i, uIdx);
    const old = cache.get(i);
    if (gen && old) t = mergeStreaming(old, t);
    // turn lazy chưa render (rỗng) không được ghi đè bản đã có
    if (t.empty && old && !old.empty) return;
    sigs.set(i, sig);
    if (old && JSON.stringify(old) === JSON.stringify(t)) return;
    cache.set(i, t);
  });
  for (const k of [...cache.keys()]) if (k >= els.length) { cache.delete(k); sigs.delete(k); domChangedAt = Date.now(); }
  return els.map((_, i) => cache.get(i)).filter((t): t is Turn => !!t);
}

let hydrating = false;
/** Cuộn khung chat ẩn của AI Studio từ đầu đến cuối để các turn lazy được render, rồi lưu cache. */
export async function hydrate(onProgress?: () => void): Promise<void> {
  const sc = scroller();
  if (!sc || hydrating) return;
  hydrating = true;
  const back = sc.scrollTop;
  try {
    const step = Math.max(200, sc.clientHeight * 0.6);
    for (let y = 0; y < sc.scrollHeight; y += step) {
      sc.scrollTop = y;
      await sleep(160);
      snapshot(); onProgress?.();
    }
    sc.scrollTop = sc.scrollHeight;
    await sleep(160);
    snapshot(); onProgress?.();
  } finally {
    if (!isGenerating()) sc.scrollTop = back > 0 ? back : sc.scrollHeight;
    hydrating = false;
  }
}
export const isHydrating = () => hydrating;

/* ---------- ghi âm bằng hộp thoại gốc ---------- */
/** Hộp thoại ghi âm: thẻ đã biết, hoặc bất kỳ hộp thoại nào đang có nút Start/Stop recording. */
const dlg = (): HTMLElement | null =>
  first(SEL.micDialog) ?? all(SEL.dialogs).find((d) => byLabel(LABEL.startRec, d) || byLabel(LABEL.stopRec, d) || byLabel(LABEL.addToPrompt, d)) ?? null;
const dlgBtn = (re: RegExp) => { const d = dlg(); return d ? byLabel(re, d) : undefined; };

const promptTa = () => first<HTMLTextAreaElement>(SEL.promptTextarea);

function setNative(el: HTMLTextAreaElement, v: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export const native = {
  async open() {
    if (dlg()) return;
    const add = first(SEL.addMedia) ?? byLabel(LABEL.addMedia, first(SEL.promptBox) ?? document);
    if (!add) throw new Error("Không thấy nút thêm media của AI Studio (giao diện có thể đã đổi).");
    add.click();
    const item = await waitFor(() => byLabel(LABEL.recordAudio, first(SEL.overlay) ?? document));
    if (!item) throw new Error("Không thấy mục Record Audio.");
    item.click();
    if (!(await waitFor(dlg))) throw new Error("Hộp thoại ghi âm không mở.");
  },
  async start() {
    const start = await waitFor(() => dlgBtn(LABEL.startRec));
    if (!start) throw new Error("Không thấy nút Start recording.");
    start.click();
    // Lần đầu Chrome hỏi quyền micro: chờ người dùng bấm Cho phép (tối đa 30s).
    if (!(await waitFor(() => dlgBtn(LABEL.stopRec), 30000))) throw new Error("Không bắt đầu ghi được. Hãy cho phép micro trong Chrome (biểu tượng khoá cạnh thanh địa chỉ) rồi thử lại.");
  },
  async stop() {
    const b = dlgBtn(LABEL.stopRec);
    if (!b) throw new Error("Không đang ghi âm.");
    b.click();
    if (!(await waitFor(() => dlgBtn(LABEL.addToPrompt), 15000))) throw new Error("Không dừng được bản ghi.");
  },
  redo() { dlgBtn(LABEL.reRecord)?.click(); },
  async cancel() { dlgBtn(LABEL.close)?.click(); await waitFor(() => !dlg(), 3000); },
  isOpen: () => !!dlg(),
  hasStop: () => !!dlgBtn(LABEL.stopRec),
  /** Nhãn các nút trong hộp thoại ghi âm (để gỡ lỗi khi UI gốc đổi). */
  debugButtons: () => Array.from(dlg()?.querySelectorAll<HTMLElement>("button, [role=button]") ?? []).map((b) => (b.innerText + "|" + (b.getAttribute("aria-label") ?? "")).replace(/\s+/g, " ").trim()),
  /** Gửi bản ghi; trả về chỉ số lượt user mới (để gắn bản nghe lại). */
  async send(): Promise<number> {
    const add = dlgBtn(LABEL.addToPrompt);
    if (!add) throw new Error("Chưa có bản ghi để gửi.");
    const userCount = turnEls().filter((e) => !isModelTurn(e)).length;
    add.click();
    if (!(await waitFor(() => !dlg() && first(SEL.promptAudio), 8000))) throw new Error("Không đính kèm được audio.");
    let btn = await waitFor(runButton, 1500);
    if (!btn) {
      const ta = promptTa();
      if (ta && !ta.value.trim()) setNative(ta, "(Câu trả lời của tôi nằm trong audio. / My answer is in the audio.)");
      btn = await waitFor(runButton, 4000);
    }
    if (!btn) throw new Error("Nút Run đang bị khoá, hãy bấm Run thủ công.");
    btn.click();
    return userCount;
  },
};

export async function sendText(text: string) {
  const ta = await waitFor(promptTa, 8000);
  if (!ta) throw new Error("Không thấy ô nhập chat.");
  setNative(ta, text);
  const btn = await waitFor(runButton, 5000);
  if (!btn) throw new Error("Nút Run đang bị khoá.");
  btn.click();
}

/* ---------- nạp prompt hệ thống ---------- */
const sysTa = () => first<HTMLTextAreaElement>(SEL.systemTextarea) ?? Array.from(document.querySelectorAll("textarea")).find((t) => LABEL.systemInstr.test(t.getAttribute("aria-label") ?? "")) ?? null;
export async function applyPrompt(c: SessionConfig) {
  let ta = sysTa();
  if (!ta) {
    const card = await waitFor(() => first<HTMLElement>(SEL.systemCard) ?? byLabel(LABEL.systemInstr), 15000);
    if (!card) throw new Error("Không thấy ô System instructions. Hãy mở panel Run settings một lần rồi thử lại.");
    card.click();
    ta = await waitFor(sysTa, 5000);
  }
  if (!ta) throw new Error("Không mở được ô System instructions.");
  setNative(ta, buildPrompt(c));
  await sleep(400);
  // đóng panel cài đặt: nút đóng trong panel chứa ô system instructions
  const panel = ta.closest("[class*='panel' i], [role=dialog]") ?? document;
  byLabel(LABEL.closePanel, panel)?.click();
  await sleep(500);
}

/* ---------- đổi model ---------- */
/** Mã model (gemini-… / gemma-…). Không dùng \b và không dùng cờ i: AI Studio dính chữ liền mã ("Litegemini-3.5-flash-liteOur…"), mã luôn viết thường còn chữ kề bên viết hoa. */
export const MODEL_ID = /((?:gemini|gemma)-[a-z0-9.-]*[a-z0-9])/;
const modelCard = () => {
  const root = first(SEL.modelSelector);
  return root ? (root.querySelector<HTMLElement>("button") ?? null) : null;
};
export const currentModelId = () => (modelCard()?.textContent ?? "").match(MODEL_ID)?.[1] ?? "";
/** Đóng bảng chọn model của AI Studio bằng nút đóng của nó. Không dùng phím Esc: Esc giả cũng đóng hộp thoại của Nói Đi. */
const pressEscape = () => {
  const d = all(SEL.dialogs).find((x) => MODEL_ID.test(x.textContent ?? "") && x.querySelectorAll("button").length > 5);
  const close = d && byLabel(LABEL.close, d);
  if (close) close.click();
  else d?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
};

export interface ModelInfo { id: string; name: string; desc: string; paid: boolean }
const CHAT_MODEL = (id: string) => !/image|live|tts|audio|veo|imagen|music|embed|robotics/i.test(id);

/** Mở bảng chọn model của AI Studio và đọc danh sách (các nút có chứa mã gemini-… / gemma-…). */
async function openModelPicker(): Promise<{ b: HTMLElement; info: ModelInfo }[]> {
  const card = modelCard();
  if (!card) throw new Error("Không thấy ô chọn model của AI Studio. Hãy thoát Nói Đi, đổi model trong AI Studio rồi quay lại.");
  card.click();
  const buttons = await waitFor(() => {
    const l = Array.from((first(SEL.overlay) ?? document).querySelectorAll<HTMLElement>(CLICKABLE_ALL)).filter((b) => MODEL_ID.test(b.textContent ?? ""));
    return l.length >= 2 ? l : null;
  }, 6000);
  if (!buttons) { pressEscape(); throw new Error("Không đọc được danh sách model. Hãy đổi model thủ công trong AI Studio."); }
  return buttons.map((b) => {
    const t = (b.textContent ?? "").replace(/\s+/g, " ").trim();
    const id = t.match(MODEL_ID)?.[1] ?? "";
    const at = t.indexOf(id);
    const name = t.slice(0, at).replace(/\b(spark|image_edit_auto)\b/g, "").replace(/(New)?(Paid)?\s*$/, "").replace(/\s+/g, " ").trim() || id;
    const desc = t.slice(at + id.length).replace(/^\s*info\s*/i, "").slice(0, 110).trim();
    return { b, info: { id, name, desc, paid: /paid|trả phí/i.test(t) } };
  }).filter((x) => x.info.id && CHAT_MODEL(x.info.id));
}
const modelPickerClosed = () => waitFor(() => !all(SEL.dialogs).some((d) => MODEL_ID.test(d.textContent ?? "") && d.querySelectorAll("button").length > 5), 4000);

export async function listModels(): Promise<ModelInfo[]> {
  const items = await openModelPicker();
  const out = items.map((x) => x.info);
  pressEscape();
  await modelPickerClosed();
  return out;
}

export async function selectModel(id: string): Promise<void> {
  const items = await openModelPicker();
  const hit = items.find((x) => x.info.id === id);
  if (!hit) { pressEscape(); throw new Error("Không tìm thấy model này trong AI Studio."); }
  hit.b.click();
  await modelPickerClosed();
}

/** Chuyển sang model nhẹ hơn (ưu tiên Lite, miễn phí). Trả về id model mới. */
export async function switchToLighterModel(): Promise<string> {
  const items = await openModelPicker();
  const pick = pickLighter(items.map((x) => x.info), currentModelId());
  const hit = pick && items.find((x) => x.info.id === pick.id);
  if (!hit) { pressEscape(); throw new Error("Không tìm thấy model nhẹ hơn miễn phí. Hãy chọn model thủ công."); }
  hit.b.click();
  await modelPickerClosed();
  return hit.info.id;
}

/** Thông báo ngắn (snackbar) của AI Studio, nếu có. */
export const snackbarText = () => (first(SEL.snackbar)?.textContent ?? "").replace(/\s+/g, " ").trim();

/** Kiểm tra các điểm bám chính còn dò được không (gọi khi đang ở trang prompt). */
export function health(): string[] {
  if (!location.pathname.startsWith("/prompts/")) return [];
  const missing: string[] = [];
  if (!first(SEL.promptTextarea)) missing.push("ô nhập prompt");
  if (!first(SEL.runBtn)) missing.push("nút Run");
  if (!first(SEL.modelSelector)) missing.push("ô chọn model");
  if (chatId() && !turnEls().length && !first(SEL.scroller)) missing.push("khung hội thoại");
  return missing;
}
