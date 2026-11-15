import { describe, it, expect } from "vitest";
import { EXAMS, examOf, examsFor, ieltsOverall } from "@/lib/exams";
import { EXAM_EXAMPLES } from "@/lib/prompt-examples";
import { buildPrompt } from "@/lib/prompt";
import { normalizeScore } from "@/lib/scoring";
import { summaryMeta } from "@/lib/meta";
import type { ModelTurn, SessionConfig } from "@/lib/types";

const S = (o: Record<string, number>) => Object.entries(o).map(([key, v]) => ({ key, value: String(v) }));
const cfg = (lang: string, exam?: string): SessionConfig => ({ lang, mode: "exam", level: "B1", output: "vi", topic: "", exam });

describe("IELTS band", () => {
  it("làm tròn theo quy tắc IELTS: .25 → .5, .75 → lên band nguyên", () => {
    expect(ieltsOverall([6, 7, 6, 7])).toBe(6.5);
    expect(ieltsOverall([6, 6, 6, 7])).toBe(6.5);
    expect(ieltsOverall([7, 7, 7, 6])).toBe(7);
    expect(ieltsOverall([6, 6, 6, 6])).toBe(6);
    expect(ieltsOverall([5, 6, 6, 6])).toBe(6);
  });
  it("tính lại BAND, ép tiêu chí về band nguyên 0–9, chỉ kéo xuống", () => {
    const n = normalizeScore(S({ BAND: 7.5, FC: 6, LR: 7, GRA: 6, P: 7 }), "x");
    expect(n.items).toEqual(S({ BAND: 6.5, FC: 6, LR: 7, GRA: 6, P: 7 }));
    expect(n.raw).toBe("7.5");
    expect(normalizeScore(S({ BAND: 6, FC: 7, LR: 7, GRA: 7, P: 7 }), "x").items[0]).toEqual({ key: "BAND", value: "6" });
    expect(normalizeScore(S({ BAND: 9, FC: 12, LR: 6.4, GRA: 6, P: 6 }), "x").items.map((i) => i.value)).toEqual(["7", "9", "6", "6", "6"]); // (9+6+6+6)/4 = 6,75 → 7
  });
});

describe("TOPIK và HSKK", () => {
  it("TOPIK: TOTAL = trung bình 3 tiêu chí; HSKK theo trọng số", () => {
    expect(normalizeScore(S({ TOTAL: 90, TASK: 70, LANG: 60, DEL: 65 }), "x").items[0]).toEqual({ key: "TOTAL", value: "65" });
    expect(normalizeScore(S({ TOTAL: 99, TASK: 70, PRON: 66, FLU: 70, LANG: 75 }), "x").items[0]).toEqual({ key: "TOTAL", value: "70" });
  });
});

describe("chọn kỳ thi", () => {
  it("theo ngôn ngữ, mặc định kỳ thi đầu tiên, bỏ kỳ thi không hợp ngôn ngữ", () => {
    expect(examsFor("en-GB").map((e) => e.id)).toEqual(["ielts"]);
    expect(examsFor("zh-CN").map((e) => e.id)).toEqual(["hskk1", "hskk2", "hskk3"]);
    expect(examsFor("ja-JP")).toEqual([]);
    expect(examOf("hskk3", "zh-CN")?.id).toBe("hskk3");
    expect(examOf("ielts", "ko-KR")?.id).toBe("topik");
  });
  it("TOPIK có đủ 6 dạng câu với thời gian chuẩn bị/nói tăng dần", () => {
    const t = EXAMS.topik.tasks;
    expect(t).toHaveLength(6);
    expect(t.map((x) => [x.prep, x.limit])).toEqual([[20, 30], [30, 40], [40, 60], [40, 60], [70, 80], [70, 80]]);
  });
});

describe("ví dụ luyện thi tự nhất quán", () => {
  for (const [id, ex] of Object.entries(EXAM_EXAMPLES)) {
    it(`${id}: điểm tổng khớp công thức`, () => {
      const line = ex.split("\n").find((l) => l.startsWith("@@SCORE"))!;
      const items = [...line.matchAll(/([A-Z]+)\s+(\d+(?:\.\d)?)/g)].map((m) => ({ key: m[1], value: m[2] }));
      expect(normalizeScore(items, "x").raw).toBeUndefined();
      expect(normalizeScore(items, "x").items[0].value).toBe(items[0].value);
    });
  }
});

describe("prompt luyện thi", () => {
  it("có cấu trúc phần, thời gian, tiêu chí đúng kỳ thi; không có luật chấm thang 100 của hỏi đáp", () => {
    const p = buildPrompt(cfg("en-US"));
    expect(p).toContain("IELTS Speaking");
    expect(p).toContain("@@PREP 60");
    expect(p).toContain("@@LIMIT 120");
    expect(p).toContain("@@SCORE BAND 6.5 | FC 6 | LR 7 | GRA 6 | P 7");
    expect(p).not.toContain('"mức giống người bản xứ" (%)');
    const k = buildPrompt(cfg("ko-KR"));
    expect(k).toContain("의견 제시하기");
    expect(k).toContain("@@ROMAN");
    expect(buildPrompt(cfg("zh-CN", "hskk2"))).toContain("看图说话");
  });
  it("các chế độ cũ không bị ảnh hưởng", () => {
    const g = buildPrompt({ lang: "en-US", mode: "guided", level: "B1", output: "vi", topic: "" });
    expect(g).not.toContain("@@LIMIT");
    expect(g).toContain('"mức giống người bản xứ" (%) = làm tròn(0,30 × PRON');
  });
});

describe("tổng kết IELTS", () => {
  it("band_overall tính từ trung bình từng tiêu chí rồi làm tròn kiểu IELTS", () => {
    const t = (o: Record<string, number>, k: string): ModelTurn => ({ role: "model", key: k, transcript: "x", score: S(o), empty: false });
    const m = summaryMeta([t({ BAND: 6, FC: 6, LR: 6, GRA: 5, P: 6 }, "a"), t({ BAND: 6.5, FC: 7, LR: 6, GRA: 6, P: 7 }, "b")]);
    // FC 6.5→7(làm tròn), LR 6, GRA 5.5→6, P 6.5→7 → trung bình 6.5
    expect(m).toContain("band_overall=6.5");
    expect(m).toContain("BAND=6.3");
  });
});
