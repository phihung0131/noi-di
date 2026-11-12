import { describe, it, expect } from "vitest";
import { langChip, speakable } from "@/lib/langs";

describe("speakable", () => {
  it("bỏ IPA và ngoặc", () => {
    expect(speakable("spazieren/ʃpaˈtsiːʁən/")).toBe("spazieren");
    expect(speakable("커피[kʰʌ.pʰi / keo-phi]")).toBe("커피");
    expect(speakable("休日出勤（きゅうじつしゅっきん）")).toBe("休日出勤");
  });
  it("CJK chỉ giữ chữ gốc, bỏ pinyin dính liền", () => {
    expect(speakable("散步sànbù")).toBe("散步");
  });
  it("giữ nguyên cụm thường", () => {
    expect(speakable("curl up with a book")).toBe("curl up with a book");
  });
});
describe("langChip", () => {
  it("phân biệt biến thể", () => {
    expect(langChip("en-GB")).toBe("English (Anh)");
    expect(langChip("pt-BR")).toBe("tiếng Bồ Đào Nha (Brazil)");
    expect(langChip("ja-JP")).toBe("tiếng Nhật");
  });
});
