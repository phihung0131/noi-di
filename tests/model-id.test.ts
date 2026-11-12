import { describe, it, expect } from "vitest";
import { MODEL_ID } from "@/lib/bridge";

const id = (t: string) => t.match(MODEL_ID)?.[1];
describe("MODEL_ID", () => {
  it("nhận mã model dù dính chữ liền hai phía", () => {
    expect(id("Gemini 3.5 Flash Litegemini-3.5-flash-liteOur fastest, most")).toBe("gemini-3.5-flash-lite");
    expect(id("spark Gemini 4 Carbon NewPaidgemini-4-carbon info Our most")).toBe("gemini-4-carbon");
    expect(id("spark Gemini 3.8 Flash gemini-3.8-flash info Our most")).toBe("gemini-3.8-flash");
  });
  it("không nhầm tên hiển thị", () => expect(id("Gemini 3.5 Flash Lite")).toBeUndefined());
});
