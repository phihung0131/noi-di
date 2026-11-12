import { parseModelElement } from "./parser";
import { buildPrompt } from "./prompt";
import type { SessionConfig, Turn } from "./types";
import { sleep, waitFor } from "./utils";

/* Mọi thứ chạm vào DOM của AI Studio nằm ở đây. */
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

export const chatId = () => {
  const id = location.pathname.match(/^\/prompts\/([^/?#]+)/)?.[1];
  return id && id !== "new_chat" ? id : null;
};
export const isNewChatPage = () => location.pathname.startsWith("/prompts/new_chat");
export const scroller = () => $("ms-autoscroll-container");
export const isGenerating = () => /stop/i.test($("ms-run-button")?.textContent ?? "");
const runButton = () => {
  const b = $<HTMLButtonElement>("ms-run-button button");
  return b && !b.disabled && b.getAttribute("aria-disabled") !== "true" ? b : null;
};

/* ---------- đọc hội thoại (có cache vì AI Studio chỉ render turn đang hiện trên màn hình) ---------- */
const cache = new Map<number, Turn>();
const sigs = new Map<number, string>();
let domChangedAt = Date.now();
/** Lần cuối nội dung chat gốc thay đổi (kể cả phần "thinking" không hiển thị). */
export const lastDomActivity = () => domChangedAt;
export const resetChatCache = () => { cache.clear(); sigs.clear(); domChangedAt = Date.now(); };

function parseTurn(el: Element, idx: number, userIdx: number): Turn {
  if (!el.classList.contains("model")) {
    const text = (el.querySelector("ms-text-chunk")?.textContent ?? "").replace(/\s+/g, " ").trim();
    const audio = !!el.querySelector("ms-audio-chunk, ms-prompt-audio");
    return { role: "user", key: "u" + idx, idx: userIdx, text, audio, hidden: userIdx === 0 && /^(bắt đầu|start)$/i.test(text), empty: !text && !audio };
  }
  return { key: "m" + idx, ...parseModelElement(el) };
}

/** Quét DOM hiện có, trả danh sách turn đầy đủ nhất (kết hợp cache). */
export function snapshot(): Turn[] {
  const els = $$(".chat-turn-container");
  let userIdx = 0;
  els.forEach((el, i) => {
    const isUser = !el.classList.contains("model");
    const sig = (isUser ? "u" : "m") + (el.textContent?.length ?? 0) + ":" + (el.querySelector("ms-audio-chunk") ? 1 : 0);
    const uIdx = isUser ? userIdx++ : -1;
    if (sigs.get(i) === sig && cache.has(i)) return;
    domChangedAt = Date.now();
    const t = parseTurn(el, i, uIdx);
    const old = cache.get(i);
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
const dlg = () => $("ms-mic-audio-dialog");
const dlgBtn = (re: RegExp) => $$<HTMLButtonElement>("ms-mic-audio-dialog button").find((b) => re.test(b.innerText + " " + (b.getAttribute("aria-label") ?? "")));

function setNative(el: HTMLTextAreaElement, v: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export const native = {
  async open() {
    if (dlg()) return;
    const add = $<HTMLButtonElement>("ms-add-media-button button");
    if (!add) throw new Error("Không thấy nút thêm media của AI Studio.");
    add.click();
    const item = await waitFor(() => $$(".mat-mdc-menu-panel button, .mat-mdc-menu-panel [role=menuitem]").find((b) => /record audio/i.test(b.innerText)));
    if (!item) throw new Error("Không thấy mục Record Audio.");
    item.click();
    if (!(await waitFor(dlg))) throw new Error("Hộp thoại ghi âm không mở.");
  },
  async start() {
    const start = await waitFor(() => dlgBtn(/start recording/i));
    if (!start) throw new Error("Không thấy nút Start recording.");
    start.click();
    // Lần đầu Chrome hỏi quyền micro: chờ người dùng bấm Cho phép (tối đa 30s).
    if (!(await waitFor(() => dlgBtn(/stop recording/i), 30000))) throw new Error("Không bắt đầu ghi được. Hãy cho phép micro trong Chrome (biểu tượng khoá cạnh thanh địa chỉ) rồi thử lại.");
  },
  async stop() {
    const b = dlgBtn(/stop recording/i);
    if (!b) throw new Error("Không đang ghi âm.");
    b.click();
    if (!(await waitFor(() => dlgBtn(/add to prompt/i), 15000))) throw new Error("Không dừng được bản ghi.");
  },
  redo() { dlgBtn(/re-record/i)?.click(); },
  async cancel() { dlgBtn(/^\s*close\s*$/i)?.click(); await waitFor(() => !dlg(), 3000); },
  isOpen: () => !!dlg(),
  /** Nhãn các nút trong hộp thoại ghi âm (để gỡ lỗi khi UI gốc đổi). */
  debugButtons: () => $$<HTMLButtonElement>("ms-mic-audio-dialog button").map((b) => (b.innerText + "|" + (b.getAttribute("aria-label") ?? "")).replace(/\s+/g, " ").trim()),
  /** Gửi bản ghi; trả về chỉ số lượt user mới (để gắn bản nghe lại). */
  async send(): Promise<number> {
    const add = dlgBtn(/add to prompt/i);
    if (!add) throw new Error("Chưa có bản ghi để gửi.");
    const userCount = $$(".chat-turn-container:not(.model)").length;
    add.click();
    if (!(await waitFor(() => !dlg() && $("ms-prompt-box ms-prompt-audio"), 8000))) throw new Error("Không đính kèm được audio.");
    let btn = await waitFor(runButton, 1500);
    if (!btn) {
      const ta = $<HTMLTextAreaElement>("ms-prompt-box textarea");
      if (ta && !ta.value.trim()) setNative(ta, "(Câu trả lời của tôi nằm trong audio. / My answer is in the audio.)");
      btn = await waitFor(runButton, 4000);
    }
    if (!btn) throw new Error("Nút Run đang bị khoá, hãy bấm Run thủ công.");
    btn.click();
    return userCount;
  },
};

export async function sendText(text: string) {
  const ta = await waitFor(() => $<HTMLTextAreaElement>("ms-prompt-box textarea"), 8000);
  if (!ta) throw new Error("Không thấy ô nhập chat.");
  setNative(ta, text);
  const btn = await waitFor(runButton, 5000);
  if (!btn) throw new Error("Nút Run đang bị khoá.");
  btn.click();
}

/* ---------- nạp prompt hệ thống ---------- */
const sysTa = () => $<HTMLTextAreaElement>('textarea[aria-label="System instructions"]');
export async function applyPrompt(c: SessionConfig) {
  let ta = sysTa();
  if (!ta) {
    const card = await waitFor(() => $<HTMLButtonElement>("button.system-instructions-card"), 15000);
    if (!card) throw new Error("Không thấy ô System instructions. Hãy mở panel Run settings một lần rồi thử lại.");
    card.click();
    ta = await waitFor(sysTa, 5000);
  }
  if (!ta) throw new Error("Không mở được ô System instructions.");
  setNative(ta, buildPrompt(c));
  await sleep(400);
  $<HTMLButtonElement>('.ms-sliding-right-panel-dialog button[aria-label="Close panel"]')?.click();
  await sleep(500);
}
