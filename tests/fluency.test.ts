import { describe, it, expect } from "vitest";
import { analyzePeaks, silentTail, speechRate } from "@/lib/fluency";
import { diffWords, coverage } from "@/lib/diff";

const seq = (...parts: [number, number][]) => parts.flatMap(([level, n]) => Array(n).fill(level));
// 55ms một mẫu: 40 mẫu ≈ 2,2s
describe("analyzePeaks", () => {
  it("đếm ngừng >2s giữa chừng, bỏ im lặng đầu/cuối", () => {
    const f = analyzePeaks(seq([0.005, 30], [0.3, 60], [0.005, 40], [0.3, 60], [0.005, 45], [0.3, 30], [0.005, 30]))!;
    expect(f.longPauses).toBe(2);
    expect(f.longestPauseMs).toBe(45 * 55);
    expect(f.speechMs).toBe(150 * 55);
  });
  it("không có dữ liệu thì null", () => expect(analyzePeaks([])).toBeNull());
  it("tốc độ nói theo thời gian có tiếng", () => {
    const f = analyzePeaks(seq([0.3, 546]))!; // ~30s
    expect(speechRate(Array(60).fill("word").join(" "), f)).toBe(120);
  });
});

describe("silentTail", () => {
  it("dừng khi đã nói rồi im lặng 2,5s", () => {
    expect(silentTail(seq([0.3, 60], [0.004, 50]))).toBe(true);
    expect(silentTail(seq([0.3, 60], [0.004, 20]))).toBe(false);
    expect(silentTail(seq([0.004, 100]))).toBe(false);
  });
});

describe("diffWords", () => {
  it("đánh dấu từ bị đổi, bỏ qua dấu câu và hoa thường", () => {
    const ops = diffWords("I go school yesterday", "I went to school yesterday.");
    expect(ops).toEqual([
      { op: "same", text: "I" }, { op: "del", text: "go" }, { op: "add", text: "went to" }, { op: "same", text: "school yesterday." },
    ]);
  });
  it("tiếng Trung so từng chữ", () => {
    expect(diffWords("我喜欢咖啡", "我很喜欢咖啡").filter((o) => o.op === "add")).toEqual([{ op: "add", text: "很" }]);
  });
  it("coverage cho đọc nhại", () => {
    expect(coverage("I love to but I got a ton", "I'd love to but I've got a ton")).toBeCloseTo(6 / 8);
  });
});
