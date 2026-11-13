import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import type { SessionConfig } from "@/lib/types";

const cfg = (mode: SessionConfig["mode"], lang = "en-US"): SessionConfig => ({ lang, mode, level: "B1", output: "vi", topic: "" });

describe("prompt theo chế độ", () => {
  it("hỏi đáp: có bản sửa đầy đủ, bản người bản xứ, bài tập, bảng 4 cột và công thức NATIVE", () => {
    const p = buildPrompt(cfg("guided"));
    for (const m of ["@@FIXED", "@@BETTER", "@@DRILL", "Loại | Bạn nói | Sửa thành | Vì sao", "0,30 × PRON"]) expect(p).toContain(m);
    expect(p).toContain("retry → yêu cầu nói lại");
  });
  it("hội thoại: không bao giờ retry, câu hỏi luôn mới, SAY không chứa câu hỏi", () => {
    const p = buildPrompt(cfg("chat"));
    expect(p).toContain("KHÔNG BAO GIỜ retry");
    expect(p).toContain("KHÔNG lặp lại, KHÔNG diễn đạt lại câu hỏi đã hỏi");
    expect(p).toContain("KHÔNG chứa câu hỏi nào");
    expect(p).not.toContain("yêu cầu nói lại cùng câu");
  });
  it("nghe hiểu: chấm HIEU, retry đọc lại cùng đoạn, không có câu mẫu", () => {
    const p = buildPrompt(cfg("listening"));
    expect(p).toContain("HIEU = hiểu ý chính");
    expect(p).toContain("BẮT BUỘC in lại @@SAY cũ NGUYÊN VĂN");
    expect(p).toContain("ĐỐI CHIẾU từng chi tiết");
    expect(p).toContain("KHÔNG dùng @@SAMPLE");
    expect(p).toContain("@@SCORE NATIVE 62 | HIEU 80");
  });
  it("mọi chế độ: không còn chỗ trống chưa thay thế và có phiên âm cho tiếng Nhật", () => {
    for (const m of ["guided", "chat", "listening"] as const) expect(buildPrompt(cfg(m))).not.toMatch(/\$\{|undefined/);
    expect(buildPrompt(cfg("guided", "ja-JP"))).toContain("@@ROMAN");
  });
});
