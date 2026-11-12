export interface LangInfo { name: string; short: string; roman: string | false }
export const LANGS: Record<string, LangInfo> = {
  "en-US": { name: "English (Mỹ)", short: "English", roman: false },
  "en-GB": { name: "English (Anh)", short: "English", roman: false },
  "ja-JP": { name: "日本語 (tiếng Nhật)", short: "tiếng Nhật", roman: "romaji" },
  "ko-KR": { name: "한국어 (tiếng Hàn)", short: "tiếng Hàn", roman: "romanization" },
  "zh-CN": { name: "中文 (tiếng Trung)", short: "tiếng Trung", roman: "pinyin có dấu thanh" },
  "de-DE": { name: "Deutsch (tiếng Đức)", short: "tiếng Đức", roman: false },
};
export const LEVELS = [
  { id: "A2", label: "A2 · Sơ cấp (Band ~4.0)" },
  { id: "B1", label: "B1 · Trung cấp (Band ~5.0)" },
  { id: "B2", label: "B2 · Khá (Band ~6.0–6.5)" },
  { id: "C1", label: "C1 · Cao (Band ~7.0+)" },
];
export const MODES = [
  { id: "ielts", label: "IELTS Speaking", hint: "Part 1 → 2 → 3, chấm band" },
  { id: "chat", label: "Hội thoại", hint: "Nói chuyện tự nhiên, nghe & trả lời" },
  { id: "listening", label: "Nghe hiểu", hint: "Nghe đoạn ngắn rồi trả lời bằng lời" },
] as const;
export const DEFAULT_CONFIG = { lang: "en-US", mode: "ielts", level: "B1", output: "vi", topic: "" } as const;
export const isEnglish = (lang: string) => lang.startsWith("en");
