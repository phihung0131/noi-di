import type { HistoryItem } from "./types";

const DAY = 86400000;
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : undefined);

export interface Progress {
  total: number;
  days: number;
  /** số ngày liên tiếp có luyện, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa luyện) */
  streak: number;
  last7?: number;
  prev7?: number;
  /** NATIVE các lượt gần nhất (cũ → mới) */
  recent: number[];
  /** điểm trung bình từng tiêu chí trên 20 lượt gần nhất, thấp nhất trước */
  criteria: { key: string; value: number }[];
}

export function computeProgress(items: HistoryItem[], now = Date.now()): Progress {
  const list = [...items].sort((a, b) => a.at - b.at);
  const days = new Set(list.map((h) => dayKey(h.at)));
  let streak = 0;
  let t = now;
  if (!days.has(dayKey(t))) t -= DAY;
  while (days.has(dayKey(t))) { streak++; t -= DAY; }
  const inRange = (from: number, to: number) => list.filter((h) => h.at > now - from * DAY && h.at <= now - to * DAY).map((h) => h.native);
  const last20 = list.slice(-20);
  const keys = [...new Set(last20.flatMap((h) => Object.keys(h.sub)))];
  const criteria = keys
    .map((key) => ({ key, value: avg(last20.map((h) => h.sub[key]).filter((v) => Number.isFinite(v))) }))
    .filter((c): c is { key: string; value: number } => c.value !== undefined)
    .sort((a, b) => a.value - b.value);
  return { total: list.length, days: days.size, streak, last7: avg(inRange(7, 0)), prev7: avg(inRange(14, 7)), recent: list.slice(-40).map((h) => h.native), criteria };
}
