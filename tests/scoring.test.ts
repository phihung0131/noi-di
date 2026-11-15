import { describe, it, expect } from "vitest";
import { expectedVerdict, normalizeScore, wordCount } from "@/lib/scoring";
import { EXAMPLES } from "@/lib/prompt-examples";

const S = (o: Record<string, number>) => Object.entries(o).map(([key, v]) => ({ key, value: String(v) }));
const LONG = "I went to the beach with my family last weekend and it was fun";

describe("normalizeScore", () => {
  it("tính lại NATIVE đúng công thức và ghi lại số model in sai", () => {
    const n = normalizeScore(S({ NATIVE: 75, PRON: 62, FLU: 70, NAT: 60, GRA: 72, VOC: 68 }), LONG);
    expect(n.items[0]).toEqual({ key: "NATIVE", value: "66" });
    expect(n.raw).toBe("75");
  });
  it("không ghi chú khi model tính đúng (lệch ≤1 do làm tròn)", () => {
    expect(normalizeScore(S({ NATIVE: 65, PRON: 62, FLU: 70, NAT: 60, GRA: 72, VOC: 68 }), LONG).raw).toBeUndefined();
  });
  it("PRON dưới 50 thì NATIVE tối đa 60", () => {
    const n = normalizeScore(S({ NATIVE: 70, PRON: 45, FLU: 95, NAT: 95, GRA: 95, VOC: 95 }), LONG);
    expect(n.items[0].value).toBe("60");
  });
  it("dưới 10 từ thì NATIVE tối đa 55", () => {
    expect(normalizeScore(S({ PRON: 80, FLU: 80, NAT: 80, GRA: 80, VOC: 80 }), "I like it").items[0].value).toBe("55");
  });
  it("nghe hiểu và đọc nhại dùng công thức riêng", () => {
    expect(normalizeScore(S({ NATIVE: 0, HIEU: 70, TRALOI: 70, PRON: 60, FLU: 65 }), "x").items[0].value).toBe("67");
    expect(normalizeScore(S({ NATIVE: 74, PRON: 68, FLU: 74, ACC: 84 }), "short").items[0].value).toBe("74");
  });
  it("kẹp điểm về 0–100, thiếu tiêu chí thì giữ nguyên", () => {
    const n = normalizeScore(S({ NATIVE: 130, PRON: 120 }), LONG);
    expect(n.items.map((i) => i.value)).toEqual(["100", "100"]);
  });
});

describe("wordCount và verdict", () => {
  it("đếm từ, tiếng Nhật/Trung 2 chữ ≈ 1 từ", () => {
    expect(wordCount("I like it, really!")).toBe(4);
    expect(wordCount("我喜欢喝咖啡")).toBe(3);
  });
  it("verdict suy từ điểm", () => {
    expect(expectedVerdict("guided", S({ NATIVE: 54 }))).toBe("retry");
    expect(expectedVerdict("guided", S({ NATIVE: 55 }))).toBe("pass");
    expect(expectedVerdict("chat", S({ NATIVE: 10 }))).toBeUndefined();
    expect(expectedVerdict("shadow", S({ NATIVE: 75, ACC: 78 }))).toBe("retry");
    expect(expectedVerdict("shadow", S({ NATIVE: 75, ACC: 84 }))).toBe("pass");
  });
});

describe("ví dụ trong prompt tự nhất quán", () => {
  for (const mode of ["guided", "listening", "shadow"] as const) {
    it(`${mode}: NATIVE trong ví dụ khớp công thức`, () => {
      const ex = EXAMPLES[mode]("English", "tiếng Việt");
      const line = ex.split("\n").find((l) => l.startsWith("@@SCORE"))!;
      const items = [...line.matchAll(/([A-Z]+)\s+(\d+)/g)].map((m) => ({ key: m[1], value: m[2] }));
      const transcript = ex.split("@@TRANSCRIPT")[1].split("@@")[0].trim();
      expect(normalizeScore(items, transcript).raw).toBeUndefined();
    });
  }
});
