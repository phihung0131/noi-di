import { describe, it, expect } from "vitest";
import { isStalledState } from "@/lib/controller";
import type { ModelTurn, UserTurn } from "@/lib/types";

const m = (p: Partial<ModelTurn>): ModelTurn => ({ role: "model", key: "m", empty: false, ...p });
const u = (text: string): UserTurn => ({ role: "user", key: "u", idx: 1, text, audio: false, hidden: false, empty: false });

describe("isStalledState", () => {
  it("không báo khi đang sinh", () => expect(isStalledState([u("hi")], true)).toBe(false));
  it("báo khi lượt cuối là user", () => expect(isStalledState([u("hi")], false)).toBe(true));
  it("báo khi model rỗng", () => expect(isStalledState([u("hi"), m({ empty: true })], false)).toBe(true));
  it("báo khi chấm xong nhưng thiếu verdict và câu hỏi", () =>
    expect(isStalledState([u("hi"), m({ transcript: "hi", score: [{ key: "NATIVE", value: "50" }], feedback: "<p>x</p>" })], false)).toBe(true));
  it("không báo khi đầy đủ", () =>
    expect(isStalledState([u("hi"), m({ transcript: "hi", score: [{ key: "NATIVE", value: "50" }], verdict: "pass", q: { n: "2", text: "q" } })], false)).toBe(false));
  it("không báo khi chỉ có nhận xét ngắn (retry ngầm, câu hỏi cũ vẫn ở trên)", () =>
    expect(isStalledState([u("asdf"), m({ feedback: "<p>không nhận ra</p>" })], false)).toBe(false));
  it("không báo với bản tổng kết", () =>
    expect(isStalledState([u("Tổng kết buổi"), m({ score: [{ key: "NATIVE", value: "60" }], feedback: "<p>x</p>" })], false)).toBe(false));
});
