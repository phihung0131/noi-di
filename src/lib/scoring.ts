import { diffWords } from "./diff";
import type { ModelTurn, ScoreItem } from "./types";

/**
 * Chấm lại phía client. Model hay tính sai phép cộng có trọng số và quên giới hạn điểm (cap),
 * nên NATIVE luôn được tính lại từ điểm từng tiêu chí theo đúng công thức trong prompt.
 * Công thức phải khớp src/lib/prompt.ts.
 */
export const FORMULAS: Record<string, Record<string, number>> = {
  /** Hỏi đáp có chấm, hội thoại */
  speak: { PRON: 0.3, FLU: 0.2, NAT: 0.2, GRA: 0.15, VOC: 0.15 },
  /** Nghe hiểu */
  listening: { HIEU: 0.4, TRALOI: 0.2, PRON: 0.2, FLU: 0.2 },
  /** Đọc nhại */
  shadow: { PRON: 0.5, FLU: 0.25, ACC: 0.25 },
};

/** Mốc qua câu (VERDICT pass) theo chế độ: điểm dùng để so và ngưỡng. */
export const PASS_RULE = {
  guided: { key: "NATIVE", min: 55 },
  listening: { key: "HIEU", min: 60 },
  shadow: { key: "NATIVE", min: 70 },
} as const;

const CJK = /[぀-ヿ㐀-鿿]/g;

/** Số từ ước lượng; tiếng Nhật/Trung không có dấu cách nên tính 2 chữ ≈ 1 từ. */
export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const cjk = t.match(CJK)?.length ?? 0;
  const rest = t.replace(CJK, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return rest + Math.round(cjk / 2);
}

export function formulaFor(keys: string[]): keyof typeof FORMULAS | null {
  const has = (k: string) => keys.includes(k);
  if (has("HIEU")) return "listening";
  if (has("ACC")) return "shadow";
  if (["PRON", "FLU", "NAT", "GRA", "VOC"].every(has)) return "speak";
  return null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface Normalized { items: ScoreItem[]; raw?: string }

/**
 * Tính lại NATIVE và áp giới hạn:
 *  - PRON dưới 50 thì NATIVE tối đa 60 (trừ nghe hiểu);
 *  - câu trả lời dưới 10 từ thì NATIVE tối đa 55 (hỏi đáp, hội thoại).
 * Trả `raw` = NATIVE model in ra khi lệch quá 1 điểm (để giao diện ghi chú).
 */
export function normalizeScore(items: ScoreItem[], transcript?: string): Normalized {
  const vals = new Map(items.map((i) => [i.key, parseFloat(i.value)]));
  const kind = formulaFor([...vals.keys()]);
  const fixed = items.map((i) => ({ key: i.key, value: String(clamp(parseFloat(i.value))) }));
  if (!kind) return { items: fixed };
  const f = FORMULAS[kind];
  if (Object.keys(f).some((k) => !Number.isFinite(vals.get(k)))) return { items: fixed };
  let native = Object.entries(f).reduce((sum, [k, w]) => sum + w * clamp(vals.get(k)!), 0);
  if (kind !== "listening" && clamp(vals.get("PRON")!) < 50) native = Math.min(native, 60);
  if (kind === "speak" && transcript !== undefined && wordCount(transcript) < 10) native = Math.min(native, 55);
  const formula = clamp(native);
  const given = vals.get("NATIVE");
  const hasGiven = given !== undefined && Number.isFinite(given);
  // Chỉ kéo XUỐNG khi giám khảo cho cao hơn công thức. Giám khảo cho thấp hơn thì giữ số của họ:
  // họ có thể đã áp giới hạn phần mềm không tự biết (câu quá ngắn, ngừng quá lâu, lạc đề...), tính lại sẽ thổi phồng điểm.
  const n = hasGiven ? Math.min(formula, clamp(given)) : formula;
  const out = [{ key: "NATIVE", value: String(n) }, ...fixed.filter((i) => i.key !== "NATIVE")];
  return { items: out, raw: hasGiven && given - n > 1 ? String(Math.round(given)) : undefined };
}

export const scoreOf = (items: ScoreItem[] | undefined, key: string): number | undefined => {
  const v = items?.find((i) => i.key === key)?.value;
  return v === undefined ? undefined : parseFloat(v);
};

/** Verdict client suy ra từ điểm (chỉ có nghĩa với chế độ có retry). */
export function expectedVerdict(mode: string, items: ScoreItem[] | undefined): "pass" | "retry" | undefined {
  const rule = PASS_RULE[mode as keyof typeof PASS_RULE];
  const v = rule && scoreOf(items, rule.key);
  if (v === undefined) return undefined;
  // Đọc nhại: còn cần khớp câu gốc từ 80 (như prompt).
  if (mode === "shadow") { const acc = scoreOf(items, "ACC"); if (acc !== undefined && acc < 80) return "retry"; }
  if (v < rule.min) return "retry";
  // Hỏi đáp: pass còn cần "trả lời đủ ý" (và từ 5 từ trở lên), phần mềm không tự xét được nên không khẳng định pass.
  if (mode === "guided") return undefined;
  return "pass";
}

/** Ngưỡng của chế độ "Luyện tới khi đúng" (khớp phần prompt tương ứng). */
export const STRICT_RULE = { shadowAcc: 95, listeningHieu: 90, listeningTraloi: 80 } as const;

/**
 * "Luyện tới khi đúng": các chỗ còn sai mà phần mềm tự thấy được, độc lập với verdict của giám khảo.
 * Hỏi đáp: câu nói còn khác bản sửa. Đọc nhại: còn khác câu gốc hoặc ACC dưới 95. Nghe hiểu: HIEU/TRALOI dưới ngưỡng.
 * Trả về danh sách lý do; rỗng nghĩa là không thấy lỗi (không khẳng định đã đúng hết).
 */
export function strictIssues(mode: string, t: Pick<ModelTurn, "transcript" | "fixed" | "score">): string[] {
  if (!t.transcript || !t.score) return [];
  const out: string[] = [];
  if ((mode === "guided" || mode === "shadow") && t.fixed) {
    // Một chỗ sửa thường là cặp xoá + thêm liền nhau: đếm theo cụm, không theo từng thao tác.
    const ops = diffWords(t.transcript, t.fixed);
    const n = ops.filter((o, i) => o.op !== "same" && (i === 0 || ops[i - 1].op === "same")).length;
    if (n) out.push(mode === "shadow" ? `${n} chỗ khác câu gốc` : `${n} chỗ còn khác bản sửa`);
  }
  if (mode === "shadow") {
    const acc = scoreOf(t.score, "ACC");
    if (acc !== undefined && acc < STRICT_RULE.shadowAcc) out.push(`khớp câu gốc ${acc} (cần ${STRICT_RULE.shadowAcc})`);
  }
  if (mode === "listening") {
    const h = scoreOf(t.score, "HIEU"), r = scoreOf(t.score, "TRALOI");
    if (h !== undefined && h < STRICT_RULE.listeningHieu) out.push(`mức hiểu ${h} (cần ${STRICT_RULE.listeningHieu})`);
    if (r !== undefined && r < STRICT_RULE.listeningTraloi) out.push(`câu trả lời ${r} (cần ${STRICT_RULE.listeningTraloi})`);
  }
  return out;
}
