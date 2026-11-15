import { analyzePeaks, type Fluency } from "./fluency";
import { ieltsOverall } from "./exams";
import { overallKey, scoreOf } from "./scoring";
import type { ErrorRow, ModelTurn, Turn } from "./types";

/**
 * Dòng số đo gửi kèm audio. Model được dặn trong prompt: dòng bắt đầu bằng [NOIDI-META]
 * là số liệu của phần mềm, không phải lời học viên, không chép vào transcript, không xét ngôn ngữ.
 */
export const META_TAG = "[NOIDI-META]";
export const isMeta = (text: string) => text.includes(META_TAG);

const sec = (ms: number) => (ms / 1000).toFixed(1) + "s";

export function fluencyMeta(f: Fluency | null): string {
  if (!f) return "";
  return `audio=${sec(f.durMs)} speech=${sec(f.speechMs)} pauses_over_2s=${f.longPauses} longest_pause=${sec(f.longestPauseMs)} silence=${Math.round(f.silenceRatio * 100)}%`;
}

const scored = (turns: Turn[]) => turns.filter((t): t is ModelTurn => t.role === "model" && !!t.score && !!t.transcript);

/** Đếm lỗi theo loại và lấy vài lỗi gần nhất để giám khảo theo dõi lỗi lặp lại. */
export function errorMemory(turns: Turn[], maxRecent = 3): string {
  const rows: ErrorRow[] = turns.flatMap((t) => (t.role === "model" ? t.errors ?? [] : []));
  if (!rows.length) return "";
  const byType = new Map<string, number>();
  rows.forEach((r) => { const k = r.type.trim() || "?"; byType.set(k, (byType.get(k) ?? 0) + 1); });
  const types = [...byType].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(", ");
  const repeated = rows.filter((r) => /LẶP LẠI|REPEAT/i.test(r.why));
  const pick = (repeated.length ? repeated : rows).slice(-maxRecent);
  const recent = pick.map((r) => `"${r.said.slice(0, 40)}"->"${r.fix.slice(0, 40)}"`).join("; ");
  return `errors_so_far: ${types} | recent: ${recent}`;
}

export function prevScoreMeta(turns: Turn[]): string {
  const last = scored(turns).pop();
  if (!last?.score) return "";
  return "prev_score: " + last.score.map((s) => `${s.key}=${s.value}`).join(" ");
}

/** Toàn bộ dòng meta gửi kèm audio của một lượt. */
/** Bản chép lời độc lập của Chrome, gói gọn trong ngoặc kép để giám khảo không nhầm với lời học viên. */
export function asrMeta(asr?: string): string {
  const t = (asr ?? "").replace(/["\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  return t ? `asr_check: "${t}"` : "";
}

export function turnMeta(turns: Turn[], peaks: number[], durMs: number, asr?: string): string {
  const parts = [fluencyMeta(analyzePeaks(peaks, durMs)), prevScoreMeta(turns), errorMemory(turns), asrMeta(asr)].filter(Boolean);
  return parts.length ? `${META_TAG} ${parts.join(" | ")}` : "";
}

/** Số liệu tổng kết do client tính (trung bình các lượt đã chấm). */
export function summaryMeta(turns: Turn[]): string {
  const list = scored(turns);
  if (!list.length) return "";
  const keys = [...new Set(list.flatMap((t) => t.score!.map((s) => s.key)))];
  const mean = (k: string) => {
    const v = list.map((t) => scoreOf(t.score, k)).filter((x): x is number => x !== undefined);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  // Band IELTS (0–9) giữ 1 chữ số thập phân; thang 100 làm tròn số nguyên.
  const ielts = ["FC", "LR", "GRA", "P"].every((k) => keys.includes(k));
  const fmt = (k: string, v: number) => (ielts ? String(Math.round(v * 10) / 10) : String(Math.round(v)));
  const avg = keys.map((k) => { const v = mean(k); return v === undefined ? "" : `${k}=${fmt(k, v)}`; }).filter(Boolean).join(" ");
  // IELTS: band tổng từ trung bình từng tiêu chí (làm tròn về band nguyên), rồi làm tròn theo quy tắc IELTS.
  const bandOverall = ielts ? ` band_overall=${ieltsOverall(["FC", "LR", "GRA", "P"].map((k) => Math.round(mean(k)!)))}` : "";
  const ok = overallKey(keys) ?? "NATIVE";
  const nat = list.map((t) => scoreOf(t.score, ok)).filter((x): x is number => x !== undefined);
  const trend = nat.length > 1 ? ` first=${nat[0]} last=${nat[nat.length - 1]} best=${Math.max(...nat)} worst=${Math.min(...nat)}` : "";
  const mem = errorMemory(turns, 5);
  return `${META_TAG} scored_turns=${list.length} avg: ${avg}${bandOverall}${trend}${mem ? " | " + mem : ""}`;
}
