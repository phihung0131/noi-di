export interface LangInfo {
  name: string;
  short: string;
  /** Hệ phiên âm đi kèm khi ngôn ngữ không dùng chữ Latin */
  roman: string | false;
  /** Trọng tâm phát âm và tự nhiên của riêng ngôn ngữ này, đưa vào prompt */
  focus: string;
}
export const LANGS: Record<string, LangInfo> = {
  "en-US": { name: "English (Mỹ)", short: "English", roman: false, focus: "trọng âm từ và câu, nối âm (linking), nuốt âm (reduction: gonna, wanna), âm /θ/ /ð/ /r/ /l/, âm cuối (-s, -ed, -t, -d), ngữ điệu lên xuống, flap /t/ kiểu Mỹ; thì động từ, mạo từ, số ít/nhiều; collocation và cụm từ người bản xứ hay dùng." },
  "en-GB": { name: "English (Anh)", short: "English", roman: false, focus: "trọng âm từ và câu, nối âm, âm /θ/ /ð/, âm cuối, ngữ điệu kiểu Anh (non-rhotic, /t/ rõ); thì động từ, mạo từ; collocation và cách nói tự nhiên kiểu Anh." },
  "ja-JP": { name: "日本語 (tiếng Nhật)", short: "tiếng Nhật", roman: "romaji", focus: "pitch accent (cao độ), âm dài/ngắn (長音), âm ngắt (促音 っ), âm mũi ん; trợ từ は/が/を/に/で, thể lịch sự (です・ます) so với thể thường, từ nối, aizuchi (ええ, そうですね) và cách nói tự nhiên thay vì dịch từng chữ." },
  "ko-KR": { name: "한국어 (tiếng Hàn)", short: "tiếng Hàn", roman: "romanization", focus: "phân biệt phụ âm đơn/căng/bật hơi (ㄱ ㄲ ㅋ), nguyên âm ㅓ/ㅗ, patchim và quy tắc biến âm, ngữ điệu; trợ từ 은/는 이/가 을/를, mức độ kính ngữ (해요체/합쇼체), đuôi câu tự nhiên." },
  "zh-CN": { name: "中文 (tiếng Trung phổ thông)", short: "tiếng Trung", roman: "pinyin có dấu thanh", focus: "4 thanh điệu và biến điệu (三声 liên tiếp, 不/一 đổi thanh), phụ âm uốn lưỡi zh/ch/sh/r, âm bật hơi, nhi hóa; lượng từ, trợ từ 了/过/着, trật tự câu, cách nói tự nhiên thay vì dịch từng chữ." },
  "de-DE": { name: "Deutsch (tiếng Đức)", short: "tiếng Đức", roman: false, focus: "âm ü/ö/ä, ch (ich/ach), r, âm cuối vô thanh hóa, trọng âm từ ghép; giống từ (der/die/das), cách (Nominativ/Akkusativ/Dativ), vị trí động từ, câu phụ; từ nối và cách nói tự nhiên." },
  "fr-FR": { name: "Français (tiếng Pháp)", short: "tiếng Pháp", roman: false, focus: "âm r uvular, nguyên âm mũi, u/ou, liaison và enchaînement, âm câm, nhịp điệu theo cụm; giống từ, mạo từ, chia động từ, passé composé/imparfait, đại từ; cách nói đời thường tự nhiên." },
  "es-ES": { name: "Español (tiếng Tây Ban Nha)", short: "tiếng Tây Ban Nha", roman: false, focus: "r đơn/r rung, j/g, ll/y, b/v, nguyên âm thuần, trọng âm; giống từ, ser/estar, subjuntivo, pretérito/imperfecto, đại từ; cách nói tự nhiên đời thường." },
  "pt-BR": { name: "Português (Brasil)", short: "tiếng Bồ Đào Nha", roman: false, focus: "nguyên âm mũi, âm r đầu/cuối từ, t/d trước i, lh/nh; chia động từ, giống từ, cách dùng ter/haver, đại từ; cách nói tự nhiên đời thường kiểu Brazil." },
};

export const LEVELS = [
  { id: "A2", label: "A2 · Sơ cấp" },
  { id: "B1", label: "B1 · Trung cấp" },
  { id: "B2", label: "B2 · Khá" },
  { id: "C1", label: "C1 · Cao cấp" },
];
export const MODES = [
  { id: "guided", label: "Hỏi đáp có chấm", hint: "Giám khảo hỏi, bạn nói, chấm điểm từng lượt",
    detail: "Giám khảo đưa từng câu hỏi, bạn trả lời bằng giọng nói 20–60 giây. Mỗi lượt nhận điểm trên 100, bản sửa đầy đủ, cách người bản xứ sẽ nói và bài tập sửa lỗi. Chưa đạt thì nói lại cùng câu." },
  { id: "chat", label: "Hội thoại", hint: "Nói chuyện tự nhiên, nghe và trả lời",
    detail: "Trò chuyện tự nhiên với một người bạn bản xứ: họ phản hồi ngắn rồi hỏi tiếp để bạn nói tiếp. Mỗi lượt chỉ sửa nhanh tối đa 2 lỗi để không cắt mạch, chấm điểm đầy đủ mỗi 3 lượt." },
  { id: "listening", label: "Nghe hiểu", hint: "Nghe đoạn ngắn rồi trả lời bằng lời",
    detail: "Bạn nghe một đoạn 2–4 câu (không thấy chữ), rồi trả lời câu hỏi kiểm tra hiểu bằng giọng nói. Chữ chỉ hiện sau khi bạn trả lời. Được chấm theo mức hiểu ý chính, không chấm phát âm." },
] as const;
export const DEFAULT_CONFIG = { lang: "en-US", mode: "guided", level: "B1", output: "vi", topic: "" } as const;

/** Nhãn ngắn ở header, có vùng miền khi cùng ngôn ngữ có nhiều biến thể. */
export function langChip(lang: string): string {
  const l = LANGS[lang];
  if (!l) return lang;
  const region = l.name.match(/\(([^)]+)\)/)?.[1];
  return lang.startsWith("en") || lang === "pt-BR" ? `${l.short} (${lang === "pt-BR" ? "Brazil" : region})` : l.short;
}

/** Phần chỉ để đọc thành tiếng: bỏ phiên âm/IPA/chú thích trong ngoặc, với CJK chỉ giữ cụm chữ gốc. */
export function speakable(s: string): string {
  let t = s.replace(/[\[(（【].*?[\])）】]/g, " ").replace(/\/[^/\s]+\//g, " ");
  const cjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  if (cjk.test(t)) {
    const m = t.match(/^[\s\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af、。，！？ー～]+/);
    if (m) t = m[0];
  }
  return t.replace(/\s+/g, " ").trim();
}

/** Tách "cụm — nghĩa" (hoặc "cụm: nghĩa") thành [cụm, phần giải thích]. Model đôi khi dùng dấu hai chấm. */
export function splitPhrase(v: string): [string, string] {
  const [phrase, ...rest] = v.split(/\s[—–-]\s|:\s+(?=\S)/);
  return [phrase.trim(), rest.join(" · ").trim()];
}
