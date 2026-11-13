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

import { splitPhrase } from "@/lib/langs";
describe("splitPhrase", () => {
  it("tách theo gạch dài hoặc dấu hai chấm, chỉ đọc phần ngôn ngữ luyện nói", () => {
    expect(splitPhrase("work for — làm cho")).toEqual(["work for", "làm cho"]);
    expect(splitPhrase("zwei /tsvai/: Chú ý âm đầu /ts/ và nguyên âm đôi")).toEqual(["zwei /tsvai/", "Chú ý âm đầu /ts/ và nguyên âm đôi"]);
    expect(splitPhrase("der Wochenmarkt: chợ phiên hàng tuần")).toEqual(["der Wochenmarkt", "chợ phiên hàng tuần"]);
    expect(splitPhrase("pop — /pɑːp/ — mím môi")).toEqual(["pop", "/pɑːp/ · mím môi"]);
  });
});
