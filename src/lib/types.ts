export type Mode = "guided" | "chat" | "listening";
export type OutLang = "vi" | "en";

export interface SessionConfig {
  lang: string;
  mode: Mode;
  level: string;
  output: OutLang;
  topic: string;
}

export interface Prefs {
  rate: number;
  voiceName: string;
  autoPlay: boolean;
  showTrans: boolean;
  listenOnly: boolean;
  theme: "auto" | "light" | "dark";
}

export interface ScoreItem { key: string; value: string }

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
  score?: ScoreItem[];
  feedback?: string;
  vocab?: string[];
  pron?: string[];
  verdict?: "pass" | "retry";
  prep?: number;
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
  kind: "sample" | "vocab" | "question";
  at: number;
}

export type RecState = "idle" | "starting" | "recording" | "stopping" | "recorded" | "sending";
