import { describe, it, expect } from "vitest";
import { cardFront, dueNotes, grade, MAX_BOX } from "@/lib/srs";
import type { NoteItem } from "@/lib/types";

const DAY = 86400000;
const note = (o: Partial<NoteItem> = {}): NoteItem => ({ id: "1", text: "I went", tr: "Bạn nói: I go · quá khứ", lang: "en-US", kind: "error", at: 1000, ...o });

describe("srs", () => {
  it("mục mới đến hạn ngay, lâu nhất trước, lọc theo ngôn ngữ", () => {
    const items = [note({ id: "a", at: 5000 }), note({ id: "b", at: 2000 }), note({ id: "c", due: 10 * DAY }), note({ id: "d", lang: "ja-JP" })];
    expect(dueNotes(items, DAY).map((n) => n.id)).toEqual(["d", "b", "a"]);
    expect(dueNotes(items, DAY, "en-US").map((n) => n.id)).toEqual(["b", "a"]);
  });
  it("nhớ thì lên hộp và giãn lịch 1, 3, 7… ngày; chưa nhớ thì về hộp 0, ôn lại sau 10 phút", () => {
    let n = grade(note(), true, 0);
    expect([n.box, n.due]).toEqual([1, DAY]);
    n = grade(n, true, 0);
    expect([n.box, n.due]).toEqual([2, 3 * DAY]);
    n = grade(n, false, 0);
    expect([n.box, n.due, n.reviews]).toEqual([0, 10 * 60 * 1000, 3]);
    for (let i = 0; i < 10; i++) n = grade(n, true, 0);
    expect(n.box).toBe(MAX_BOX);
  });
  it("mặt trước thẻ là câu đã nói sai hoặc nghĩa", () => {
    expect(cardFront(note())).toBe("Bạn nói: I go · quá khứ");
    expect(cardFront(note({ kind: "vocab", tr: "" }))).toBe("Nhớ lại cách nói");
  });
});
