import { wordCount } from "./scoring";

/** Khoảng cách giữa hai mẫu mức âm (recorder lưu đỉnh ~ 55ms một lần). */
export const PEAK_MS = 55;

export interface Fluency {
  /** tổng thời lượng bản ghi (ms) */
  durMs: number;
  /** thời gian có tiếng nói, không tính im lặng đầu/cuối (ms) */
  speechMs: number;
  /** số lần ngừng giữa chừng dài hơn 2 giây */
  longPauses: number;
  /** lần ngừng dài nhất giữa chừng (ms) */
  longestPauseMs: number;
  /** tỉ lệ im lặng giữa chừng trên đoạn từ lúc bắt đầu tới lúc dứt lời (0..1) */
  silenceRatio: number;
}

const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };

/** Ngưỡng "có tiếng" thích nghi theo độ ồn nền của từng bản ghi. */
export function voiceThreshold(peaks: number[]): number {
  const floor = pct(peaks, 0.15), loud = pct(peaks, 0.9);
  return Math.max(0.012, floor + (loud - floor) * 0.18);
}

/**
 * Đo trôi chảy khách quan từ mức âm. Đây là số đo xấp xỉ (ồn nền, micro nhỏ có thể làm lệch),
 * dùng làm bằng chứng phụ cho giám khảo, không thay việc nghe.
 * Trả null khi không có dữ liệu sóng âm (tap.js không bắt được luồng micro).
 */
export function analyzePeaks(peaks: number[], durMs?: number): Fluency | null {
  if (peaks.length < 10) return null;
  const thr = voiceThreshold(peaks);
  const voiced = peaks.map((p) => p >= thr);
  const firstV = voiced.indexOf(true), lastV = voiced.lastIndexOf(true);
  const total = durMs ?? peaks.length * PEAK_MS;
  if (firstV < 0) return { durMs: total, speechMs: 0, longPauses: 0, longestPauseMs: 0, silenceRatio: 1 };
  let run = 0, longPauses = 0, longest = 0, silent = 0;
  const minRun = Math.ceil(2000 / PEAK_MS);
  // Bỏ khoảng lặng ngắn < 0,25s (giữa các âm tiết) khi tính im lặng.
  const shortRun = Math.ceil(250 / PEAK_MS);
  for (let i = firstV; i <= lastV + 1; i++) {
    if (i <= lastV && !voiced[i]) { run++; continue; }
    if (run >= minRun) longPauses++;
    if (run >= shortRun) silent += run;
    longest = Math.max(longest, run);
    run = 0;
  }
  const span = lastV - firstV + 1;
  return {
    durMs: total,
    speechMs: Math.round((span - silent) * PEAK_MS),
    longPauses,
    longestPauseMs: Math.round(longest * PEAK_MS),
    silenceRatio: span ? silent / span : 1,
  };
}

/** Tốc độ nói (từ/phút) tính trên thời gian có tiếng. */
export function speechRate(transcript: string, f: Fluency | null): number | undefined {
  if (!f || f.speechMs < 1500) return undefined;
  const w = wordCount(transcript);
  return w ? Math.round(w / (f.speechMs / 60000)) : undefined;
}

/** Tự dừng ghi âm: đã nói ít nhất ~1,5s và đuôi bản ghi im lặng liên tục `silenceMs`. */
export function silentTail(peaks: number[], silenceMs = 2500): boolean {
  const n = Math.ceil(silenceMs / PEAK_MS);
  if (peaks.length < n + 20) return false;
  const thr = voiceThreshold(peaks);
  const head = peaks.slice(0, -n);
  if (head.filter((p) => p >= thr).length * PEAK_MS < 1500) return false;
  return peaks.slice(-n).every((p) => p < thr);
}
