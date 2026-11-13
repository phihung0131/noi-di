/** Thông tin liên hệ / ủng hộ của tác giả (do tác giả cung cấp để đặt trong extension). */
export const SUPPORT = {
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

/** Form báo sự cố (Google Forms, ghi vào bảng tính của tác giả). Ô ảnh chụp là câu tải tệp, người dùng tự đính kèm trong form. */
export const REPORT_FORM = {
  url: "https://docs.google.com/forms/d/e/1FAIpQLSe5zMviFmKyxofU32NRZQBy3TKzbIxYpe6NSMjDNYrmWR1jOg/viewform",
  entry: { category: "entry.1535044484", note: "entry.1865843056", diag: "entry.1112845089" },
};

/** Nội dung báo cáo: người dùng chỉ cần bổ sung mô tả. */
export function buildReport(o: { category: CategoryId; note: string; diag?: Diag }) {
  const label = CATEGORIES.find((c) => c.id === o.category)?.label ?? "Khác";
  return {
    category: label,
    note: o.note.trim() || "(mình sẽ bổ sung: đang làm gì, điều gì xảy ra, mong đợi gì)",
    diag: o.diag ? formatDiag(o.diag) : "",
  };
}

/** Link form đã điền sẵn loại sự cố, mô tả và thông tin kỹ thuật. */
export function reportFormUrl(r: { category: string; note: string; diag: string }): string {
  const q = new URLSearchParams({ usp: "pp_url" });
  q.set(REPORT_FORM.entry.category, r.category);
  q.set(REPORT_FORM.entry.note, r.note);
  if (r.diag) q.set(REPORT_FORM.entry.diag, r.diag);
  return `${REPORT_FORM.url}?${q.toString()}`;
}

/** Chụp tab đang xem (qua service worker). */
export async function captureTab(): Promise<string> {
  const r = (await chrome.runtime.sendMessage({ noidi: "capture" })) as { dataUrl?: string; error?: string } | undefined;
  if (!r?.dataUrl) throw new Error(r?.error ?? "Không chụp được màn hình.");
  return r.dataUrl;
}

export function downloadImage(dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `noi-di-bao-loi-${Date.now()}.png`;
  a.click();
}

export const assetUrl = (f: string) =>
  typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`dist/${f}`) : `dist/${f}`;
