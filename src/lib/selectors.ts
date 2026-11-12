/**
 * Mọi "chỗ bám" vào giao diện AI Studio nằm ở đây. Trang này đổi liên tục nên:
 *  - mỗi thứ có NHIỀU cách dò (danh sách ứng viên, thử lần lượt);
 *  - nút bấm ưu tiên dò theo NHÃN/CHỮ (aria-label, text) thay vì tên class;
 *  - nhãn có kèm bản tiếng Việt phòng khi giao diện bị dịch.
 * Khi AI Studio đổi, chỉ cần sửa file này (và `health()` trong bridge sẽ báo thứ nào không dò được).
 */
export const SEL = {
  turn: [".chat-turn-container", "ms-chat-turn [class*='turn-container' i]"],
  scroller: ["ms-autoscroll-container", "ms-chat-session", "[class*='autoscroll' i]"],
  runWrap: ["ms-run-button", "[class*='run-button' i]"],
  runBtn: ["ms-run-button button", "[class*='run-button' i] button"],
  promptBox: ["ms-prompt-box", "[class*='prompt-box' i]"],
  promptTextarea: ["ms-prompt-box textarea", "[class*='prompt-box' i] textarea", "textarea[aria-label*='prompt' i]"],
  promptAudio: ["ms-prompt-box ms-prompt-audio", "ms-prompt-box [class*='audio' i]"],
  userText: ["ms-text-chunk", "[class*='text-chunk' i]", "ms-cmark-node"],
  audioMarker: ["ms-audio-chunk", "ms-prompt-audio", "[class*='audio-chunk' i]", "audio"],
  thought: ["ms-thought-chunk", "[class*='thought' i]", "[class*='thinking' i]"],
  micDialog: ["ms-mic-audio-dialog"],
  addMedia: ["ms-add-media-button button"],
  modelSelector: ["ms-model-selector", "[class*='model-selector' i]"],
  overlay: [".cdk-overlay-container", "[class*='overlay-container' i]"],
  dialogs: ["mat-dialog-container", "[role=dialog]", ".cdk-overlay-pane"],
  snackbar: [".mat-mdc-snack-bar-container", "[class*='snack-bar' i]"],
  errorLike: ["[class*='model-error' i]", "[class*='error' i]", "[role=alert]"],
  systemTextarea: ["textarea[aria-label*='system instruction' i]"],
  systemCard: ["button.system-instructions-card"],
};

/** Nhãn (regex) cho nút/mục cần bấm; có bản tiếng Việt. */
export const LABEL = {
  stop: /\bstop\b|dừng/i,
  startRec: /start recording|bắt đầu ghi/i,
  stopRec: /stop recording|dừng ghi/i,
  reRecord: /re-?record|ghi lại/i,
  addToPrompt: /add to prompt|thêm vào (câu lệnh|prompt)/i,
  close: /^\s*(close|đóng)\s*$/i,
  closePanel: /close( panel)?|đóng/i,
  recordAudio: /record audio|ghi âm/i,
  addMedia: /insert|add (media|files?|content)|attach|upload|thêm (phương tiện|tệp)/i,
  systemInstr: /system instruction|hướng dẫn hệ thống/i,
  modelCard: /model/i,
};

export const first = <T extends Element = HTMLElement>(cands: string[], root: ParentNode = document): T | null => {
  for (const c of cands) {
    try { const el = root.querySelector<T>(c); if (el) return el; } catch { /* selector không hợp lệ */ }
  }
  return null;
};
export const all = <T extends Element = HTMLElement>(cands: string[], root: ParentNode = document): T[] => {
  for (const c of cands) {
    try { const l = Array.from(root.querySelectorAll<T>(c)); if (l.length) return l; } catch { /* */ }
  }
  return [];
};

const CLICKABLE = "button, [role=button], [role=menuitem], [role=option]";
const labelOf = (el: Element) => `${(el as HTMLElement).innerText ?? el.textContent ?? ""} ${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`;
/** Tìm nút theo chữ/nhãn, không phụ thuộc tên thẻ hay class. */
export const byLabel = (re: RegExp, root: ParentNode = document): HTMLElement | undefined =>
  Array.from(root.querySelectorAll<HTMLElement>(CLICKABLE)).find((b) => re.test(labelOf(b)));
export const allByLabel = (re: RegExp, root: ParentNode = document): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(CLICKABLE)).filter((b) => re.test(labelOf(b)));
