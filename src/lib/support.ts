/** Thông tin liên hệ / ủng hộ của tác giả (do tác giả cung cấp để đặt trong extension). */
export const SUPPORT = {
  email: "phihung0131@gmail.com",
  repo: "https://github.com/phihung0131/noi-di",
  bank: { owner: "HO NGUYEN PHI HUNG", name: "TPBank", number: "10002751087", display: "1000 2751 087" },
};

export const CATEGORIES = [
  { id: "ui", label: "Giao diện bị lỗi" },
  { id: "record", label: "Ghi âm / micro" },
  { id: "tts", label: "Giọng đọc" },
  { id: "ai", label: "Giám khảo / chấm điểm" },
  { id: "studio", label: "AI Studio báo lỗi" },
  { id: "other", label: "Khác" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type Diag = Record<string, string | number | boolean | undefined>;

export function formatDiag(d: Diag): string {
  return Object.entries(d)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "boolean" ? (v ? "có" : "không") : v}`)
    .join("\n");
}

/** Soạn sẵn nội dung thư: người dùng chỉ cần bổ sung mô tả. */
export function buildReport(o: { category: CategoryId; note: string; diag?: Diag }) {
  const label = CATEGORIES.find((c) => c.id === o.category)?.label ?? "Khác";
  const first = o.note.trim().split("\n")[0].slice(0, 60);
  const subject = `[Nói Đi] Báo sự cố: ${label}${first ? ` — ${first}` : ""}`;
  const body = [
    "Chào Hùng, mình gặp sự cố khi dùng Nói Đi.",
    "",
    `Loại sự cố: ${label}`,
    "",
    "Mô tả:",
    o.note.trim() || "(mình sẽ bổ sung: đang làm gì, điều gì xảy ra, mong đợi gì)",
    "",
    "Ảnh chụp màn hình (nếu có): dán vào đây bằng Ctrl+V.",
    "",
    ...(o.diag ? ["--- Thông tin kỹ thuật (tự động, không có nội dung hội thoại) ---", formatDiag(o.diag)] : []),
  ].join("\n");
  return { subject, body };
}

export const gmailUrl = (subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export const mailtoUrl = (subject: string, body: string) =>
  `mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** Chụp tab đang xem (qua service worker). */
export async function captureTab(): Promise<string> {
  const r = (await chrome.runtime.sendMessage({ noidi: "capture" })) as { dataUrl?: string; error?: string } | undefined;
  if (!r?.dataUrl) throw new Error(r?.error ?? "Không chụp được màn hình.");
  return r.dataUrl;
}

/** mailto/Gmail không đính kèm file được, nên ảnh được chép vào clipboard để người dùng dán vào thư. */
export async function copyImage(dataUrl: string): Promise<boolean> {
  const attempt = (async () => {
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  })().catch(() => false);
  // clipboard có thể treo chờ quyền/tiêu điểm: không để chặn việc mở thư
  return Promise.race([attempt, new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]);
}
export function downloadImage(dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `noi-di-bao-loi-${Date.now()}.png`;
  a.click();
}

export const assetUrl = (f: string) =>
  typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`dist/${f}`) : `dist/${f}`;
