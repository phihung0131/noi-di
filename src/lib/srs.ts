import type { NoteItem } from "./types";

/**
 * Ôn sổ theo lịch lặp lại ngắt quãng (hộp Leitner).
 * Mục mới ở hộp 0 và đến hạn ngay. Nhớ: lên một hộp, lần ôn sau cách xa hơn. Chưa nhớ: về hộp 0, ôn lại sau 10 phút.
 */
const DAY = 86400000;
export const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = INTERVAL_DAYS.length - 1;
const RELEARN_MS = 10 * 60 * 1000;

export const boxOf = (n: NoteItem) => n.box ?? 0;
export const dueAt = (n: NoteItem) => n.due ?? n.at;

/** Các mục đến hạn ôn, lâu nhất trước; lọc theo ngôn ngữ nếu có. */
export function dueNotes(items: NoteItem[], now = Date.now(), lang?: string): NoteItem[] {
  return items
    .filter((n) => dueAt(n) <= now && (!lang || n.lang === lang))
    .sort((a, b) => dueAt(a) - dueAt(b));
}

/** Cập nhật lịch sau một lần ôn. */
export function grade(n: NoteItem, remembered: boolean, now = Date.now()): NoteItem {
  if (!remembered) return { ...n, box: 0, due: now + RELEARN_MS, reviews: (n.reviews ?? 0) + 1 };
  const box = Math.min(MAX_BOX, boxOf(n) + 1);
  return { ...n, box, due: now + INTERVAL_DAYS[box] * DAY, reviews: (n.reviews ?? 0) + 1 };
}

/** Mặt trước thẻ ôn: điều cần nhớ ra (nghĩa, hoặc câu bạn đã nói sai). Mặt sau là `text`. */
export function cardFront(n: NoteItem): string {
  if (n.kind === "error") return n.tr?.trim() || "Nói lại cho đúng";
  return n.tr?.trim() || "Nhớ lại cách nói";
}
