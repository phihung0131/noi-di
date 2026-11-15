import { describe, it, expect } from "vitest";
import { errorMemory, summaryMeta, turnMeta, isMeta } from "@/lib/meta";
import { computeProgress } from "@/lib/progress";
import { notesCsv } from "@/lib/notes";
import type { ModelTurn, Turn } from "@/lib/types";

const m = (p: Partial<ModelTurn>): ModelTurn => ({ role: "model", key: "m" + Math.random(), empty: false, ...p });
const sc = (n: number, pron: number) => [{ key: "NATIVE", value: String(n) }, { key: "PRON", value: String(pron) }];
const turns: Turn[] = [
  m({ transcript: "a", score: sc(50, 40), errors: [{ type: "Ngữ pháp", said: "I go", fix: "I went", why: "quá khứ" }] }),
  m({ transcript: "b", score: sc(60, 50), errors: [{ type: "Ngữ pháp", said: "we eat", fix: "we ate", why: "LỖI LẶP LẠI" }, { type: "Phát âm", said: "wit", fix: "with", why: "/ð/" }] }),
];

describe("meta gửi kèm audio", () => {
  it("có số đo, điểm lượt trước và lỗi lặp lại", () => {
    const peaks = [...Array(30).fill(0.005), ...Array(100).fill(0.3), ...Array(10).fill(0.005)];
    const t = turnMeta(turns, peaks, 7700);
    expect(isMeta(t)).toBe(true);
    expect(t).toContain("pauses_over_2s=0");
    expect(t).toContain("prev_score: NATIVE=60 PRON=50");
    expect(errorMemory(turns)).toContain("Ngữ pháp 2");
    expect(errorMemory(turns)).toContain('"we eat"->"we ate"');
  });
  it("không có gì để gửi thì rỗng", () => expect(turnMeta([], [], 0)).toBe(""));
  it("tổng kết: trung bình và xu hướng", () => {
    const s = summaryMeta(turns);
    expect(s).toContain("scored_turns=2");
    expect(s).toContain("NATIVE=55");
    expect(s).toContain("first=50 last=60");
  });
});

describe("tiến bộ", () => {
  it("chuỗi ngày, trung bình 7 ngày, tiêu chí yếu nhất", () => {
    const now = new Date(2026, 10, 15, 12).getTime(), D = 86400000;
    const h = (daysAgo: number, native: number) => ({ id: String(Math.random()), at: now - daysAgo * D, lang: "en-US", mode: "guided" as const, level: "B1", native, sub: { PRON: native - 10, GRA: native + 5 } });
    const p = computeProgress([h(0, 60), h(1, 58), h(2, 56), h(9, 40)], now);
    expect(p.streak).toBe(3);
    expect(p.last7).toBe(58);
    expect(p.prev7).toBe(40);
    expect(p.criteria[0].key).toBe("PRON");
  });
});

describe("xuất CSV", () => {
  it("bọc ô có dấu phẩy và ngoặc kép", () => {
    const csv = notesCsv([{ id: "1", text: 'say "hi", ok', tr: "chào", lang: "en-US", kind: "vocab", at: 0 }]);
    expect(csv.split("\n")[1]).toBe('"say ""hi"", ok",chào,vocab,en-US,1970-01-01');
  });
});

describe("sổ từ vựng", () => {
  it("lưu nhiều mục cùng lúc không đè mất nhau", async () => {
    const { addNote } = await import("@/lib/notes");
    const { storage } = await import("@/lib/storage");
    await storage.setNotes([]);
    await Promise.all([
      addNote({ text: "entire weekend", tr: "a", lang: "en-US", kind: "error" }),
      addNote({ text: "spent", tr: "b", lang: "en-US", kind: "error" }),
      addNote({ text: "laundry", tr: "c", lang: "en-US", kind: "error" }),
    ]);
    expect((await storage.notes()).map((n) => n.text).sort()).toEqual(["entire weekend", "laundry", "spent"]);
  });
});

describe("asrMeta", () => {
  it("gói bản chép lời của Chrome trong ngoặc kép, bỏ ký tự phá định dạng, giới hạn độ dài", async () => {
    const { asrMeta, turnMeta } = await import("@/lib/meta");
    expect(asrMeta('I visit my "grandma"\nyesterday')).toBe('asr_check: "I visit my grandma yesterday"');
    expect(asrMeta("")).toBe("");
    expect(asrMeta("a ".repeat(400)).length).toBeLessThan(520);
    expect(turnMeta([], [], 0, "I go home")).toBe('[NOIDI-META] asr_check: "I go home"');
  });
});
