import { describe, it, expect } from "vitest";
import { buildReport, gmailUrl, mailtoUrl, SUPPORT } from "@/lib/support";

describe("buildReport", () => {
  it("soạn sẵn tiêu đề, mô tả và thông tin kỹ thuật", () => {
    const { subject, body } = buildReport({ category: "record", note: "Bấm dừng không được\nChi tiết thêm", diag: { "Phiên bản": "2.0.0", Model: "gemini-3.5-flash-lite", "Quyền micro": "denied", "Trống": undefined } });
    expect(subject).toBe("[Nói Đi] Báo sự cố: Ghi âm / micro — Bấm dừng không được");
    expect(body).toContain("Loại sự cố: Ghi âm / micro");
    expect(body).toContain("Chi tiết thêm");
    expect(body).toContain("- Phiên bản: 2.0.0");
    expect(body).toContain("- Quyền micro: denied");
    expect(body).not.toContain("Trống");
    expect(body).toContain("Ctrl+V");
  });
  it("không mô tả vẫn có khung để người dùng điền", () => {
    expect(buildReport({ category: "ui", note: "" }).body).toContain("mình sẽ bổ sung");
  });
  it("không kèm thông tin kỹ thuật khi người dùng tắt", () => {
    expect(buildReport({ category: "ui", note: "x" }).body).not.toContain("Thông tin kỹ thuật");
  });
});

describe("liên kết thư", () => {
  it("Gmail và mailto trỏ tới địa chỉ tác giả, mã hoá tiếng Việt", () => {
    const g = gmailUrl("Lỗi & vấn đề", "dòng 1\ndòng 2");
    expect(g).toContain("mail.google.com/mail/?view=cm");
    expect(g).toContain(`to=${encodeURIComponent(SUPPORT.email)}`);
    expect(g).toContain(encodeURIComponent("Lỗi & vấn đề"));
    expect(mailtoUrl("a", "b").startsWith(`mailto:${SUPPORT.email}?`)).toBe(true);
  });
});
