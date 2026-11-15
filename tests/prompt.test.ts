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

describe("1.1.1: nâng cấp prompt", () => {
  it("mọi chế độ: có số đo [NOIDI-META], @@NOTES ẩn, độ chắc chắn PRON và một ví dụ hoàn chỉnh", () => {
    for (const m of ["guided", "chat", "listening", "shadow"] as const) {
      const p = buildPrompt(cfg(m));
      for (const s of ["[NOIDI-META]", "@@NOTES", " — cao", "<<VÍ DỤ BẮT ĐẦU>>", "<<VÍ DỤ KẾT THÚC>>", "KHÔNG phải khoảng điểm bắt buộc"]) expect(p).toContain(s);
      expect(p).not.toMatch(/\$\{|undefined/);
    }
  });
  it("giữ nguyên mọi quy tắc cũ (chỉ thêm, không bớt)", () => {
    const p = buildPrompt(cfg("guided"));
    for (const s of [
      "Học viên ${c.level} điển hình".replace("${c.level}", "B1"), "Không thổi phồng điểm", "PRON dưới 50 thì NATIVE tối đa 60",
      "phân tích trong đầu (KHÔNG in ra)", "BẢN SỬA ĐẦY ĐỦ", "BẢN NGƯỜI BẢN XỨ", "Câu khác", "Tổng kết buổi", "@@SAMPLE, @@SAMPLETR",
    ]) expect(p).toContain(s);
  });
  it("đọc nhại: chấm ACC, FIXED là câu gốc, không có câu mẫu", () => {
    const p = buildPrompt(cfg("shadow"));
    expect(p).toContain("NATIVE = làm tròn(0,5 × PRON + 0,25 × FLU + 0,25 × ACC)");
    expect(p).toContain("@@FIXED: in lại NGUYÊN VĂN câu gốc");
    expect(p).toContain("@@SCORE NATIVE 74 | PRON 68 | FLU 74 | ACC 84");
    expect(p).toContain("KHÔNG in @@SAMPLE, @@SAMPLETR, @@SAY");
  });
  it("ví dụ đúng theo chế độ", () => {
    expect(buildPrompt(cfg("chat"))).toContain("@@SAY\n\nThree years, nice!");
    expect(buildPrompt(cfg("listening"))).toContain("@@SCORE NATIVE 67 | HIEU 70");
  });
});
