import { describe, it, expect } from "vitest";
import { buildReport, reportFormUrl, REPORT_FORM } from "@/lib/support";

describe("buildReport", () => {
  it("điền sẵn loại, mô tả và thông tin kỹ thuật", () => {
    const r = buildReport({ category: "record", note: "  Bấm dừng không được  ", diag: { "Phiên bản": "1.0.0", Model: "gemini-3.5-flash-lite", "Quyền micro": "denied", Trống: undefined } });
    expect(r.category).toBe("Ghi âm / micro");
    expect(r.note).toBe("Bấm dừng không được");
    expect(r.diag).toContain("- Phiên bản: 1.0.0");
    expect(r.diag).toContain("- Quyền micro: denied");
    expect(r.diag).not.toContain("Trống");
  });
  it("không mô tả vẫn có khung để người dùng điền", () => {
    expect(buildReport({ category: "ui", note: "" }).note).toContain("mình sẽ bổ sung");
  });
  it("không kèm thông tin kỹ thuật khi người dùng tắt", () => {
    expect(buildReport({ category: "ui", note: "x" }).diag).toBe("");
  });
});

describe("reportFormUrl", () => {
  it("trỏ tới form Google, mã hoá tiếng Việt và xuống dòng", () => {
    const u = new URL(reportFormUrl({ category: "Giao diện bị lỗi", note: "Lỗi & vấn đề\ndòng 2", diag: "- Model: x" }));
    expect(u.origin + u.pathname).toBe(REPORT_FORM.url);
    expect(u.searchParams.get("usp")).toBe("pp_url");
    expect(u.searchParams.get(REPORT_FORM.entry.category)).toBe("Giao diện bị lỗi");
    expect(u.searchParams.get(REPORT_FORM.entry.note)).toBe("Lỗi & vấn đề\ndòng 2");
    expect(u.searchParams.get(REPORT_FORM.entry.diag)).toBe("- Model: x");
  });
  it("bỏ ô kỹ thuật khi trống, không có đường mail nào", () => {
    const u = reportFormUrl({ category: "Khác", note: "n", diag: "" });
    expect(u).not.toContain(REPORT_FORM.entry.diag);
    expect(u).not.toMatch(/mailto|mail\.google/);
  });
});
