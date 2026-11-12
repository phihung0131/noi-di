import { describe, it, expect } from "vitest";
import { classifyError, pickLighter } from "@/lib/errors";

describe("classifyError", () => {
  it("nhận ra giới hạn", () => {
    expect(classifyError("You've reached your rate limit. Please try again later.")).toBe("limit");
    expect(classifyError("RESOURCE_EXHAUSTED: Quota exceeded for metric")).toBe("limit");
    expect(classifyError("429 Too Many Requests")).toBe("limit");
  });
  it("nhận ra nội dung bị chặn", () => expect(classifyError("Response blocked due to safety settings")).toBe("blocked"));
  it("lỗi khác", () => expect(classifyError("An internal error has occurred")).toBe("other"));
});

describe("pickLighter", () => {
  const m = (id: string, paid = false) => ({ id, paid });
  const list = [m("gemini-4-carbon", true), m("gemini-3.8-flash"), m("gemini-3.5-flash-lite"), m("gemini-3.1-flash-lite"), m("gemini-3.1-flash-image"), m("gemma-4-9b")];
  it("ưu tiên Lite, bỏ model đang dùng/ảnh/trả phí", () => {
    expect(pickLighter(list, "gemini-3.8-flash")?.id).toBe("gemini-3.5-flash-lite");
    expect(pickLighter(list, "gemini-3.5-flash-lite")?.id).toBe("gemini-3.1-flash-lite");
  });
  it("không có thì undefined", () => expect(pickLighter([m("gemini-4-carbon", true)], "x")).toBeUndefined());
});
