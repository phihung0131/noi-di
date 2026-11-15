export type Mode = "guided" | "chat" | "listening" | "shadow" | "exam";
export type OutLang = "vi" | "en";

export interface SessionConfig {
  lang: string;
  mode: Mode;
  level: string;
  output: OutLang;
  topic: string;
  /** Luyện tới khi đúng: chỉ qua câu mới khi nói đúng hết, không chỉ đủ điểm (không áp dụng cho Hội thoại). */
  strict?: boolean;
  /** Chế độ luyện thi: kỳ thi (src/lib/exams.ts), mặc định kỳ thi đầu tiên của ngôn ngữ */
  exam?: string;
}

export interface Prefs {
  rate: number;
  voiceName: string;
  autoPlay: boolean;
  showTrans: boolean;
  listenOnly: boolean;
  theme: "auto" | "light" | "dark";
  /** Tự dừng ghi âm khi im lặng khoảng 2,5 giây sau khi đã nói */
  autoStop: boolean;
  /** Đối chiếu bằng nhận dạng giọng nói của Chrome (gửi giọng nói tới dịch vụ nhận dạng của Google) */
  asrCheck: boolean;
}

export interface ScoreItem { key: string; value: string }

/** Một dòng trong bảng lỗi "Loại | Bạn nói | Sửa thành | Vì sao". */
export interface ErrorRow { type: string; said: string; fix: string; why: string }

/** Mục phát âm: cụm cần đọc, phần giải thích, độ chắc chắn của giám khảo. */
export interface PronItem { phrase: string; gloss: string; conf: "high" | "medium" }

export interface ModelTurn {
  role: "model";
  key: string;
  part?: string;
  q?: { n: string; text: string };
  say?: string;
  tr?: string;
  roman?: string;
  hint?: string;
  sample?: { text: string; tr: string; roman: string };
  transcript?: string;
  /** Bản sửa đầy đủ câu trả lời của học viên */
  fixed?: string;
  /** Cách người bản xứ sẽ nói */
  better?: string;
  drill?: string;
  score?: ScoreItem[];
  /** NATIVE do model in ra, khi khác với điểm tính lại theo công thức */
  scoreRaw?: string;
  feedback?: string;
  /** Bảng lỗi đã tách thành dữ liệu */
  errors?: ErrorRow[];
  vocab?: string[];
  pron?: string[];
  verdict?: "pass" | "retry";
  prep?: number;
  /** Luyện thi: số giây nói tối đa cho lượt này */
  limit?: number;
  /** Tên mục (marker) đang được model viết dở; undefined khi đã xong */
  open?: string;
  /** Lỗi AI Studio in trong lượt này (vd. rate limit) */
  error?: string;
  /** true khi chưa có nội dung nào (turn lazy chưa render hoặc đang chờ model) */
  empty: boolean;
}

export interface UserTurn {
  role: "user";
  key: string;
  idx: number;
  text: string;
  audio: boolean;
  hidden: boolean;
  /** turn lazy chưa render nội dung */
  empty: boolean;
}

export type Turn = ModelTurn | UserTurn;

export interface NoteItem {
  id: string;
  text: string;
  tr?: string;
  lang: string;
  kind: "sample" | "vocab" | "question" | "error";
  at: number;
  /** Ôn theo lịch (src/lib/srs.ts): hộp Leitner, thời điểm đến hạn, số lần đã ôn */
  box?: number;
  due?: number;
  reviews?: number;
}

export type RecState = "idle" | "starting" | "recording" | "stopping" | "recorded" | "sending";

/** Một lượt đã chấm, lưu lại để theo dõi tiến bộ giữa các buổi. */
export interface HistoryItem {
  /** chatId:turnKey, chống ghi trùng */
  id: string;
  at: number;
  lang: string;
  mode: Mode;
  level: string;
  native: number;
  sub: Record<string, number>;
}
