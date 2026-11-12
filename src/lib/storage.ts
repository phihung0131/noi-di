import type { NoteItem, Prefs, SessionConfig } from "./types";
import { DEFAULT_CONFIG } from "./langs";

const hasChrome = typeof chrome !== "undefined" && !!chrome.storage?.local;

async function read<T>(key: string, fallback: T): Promise<T> {
  if (hasChrome) return new Promise((res) => chrome.storage.local.get(key, (o) => res((o[key] as T) ?? fallback)));
  try { const v = localStorage.getItem("noidi:" + key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
async function write(key: string, value: unknown): Promise<void> {
  if (hasChrome) return new Promise((res) => chrome.storage.local.set({ [key]: value }, res));
  try { localStorage.setItem("noidi:" + key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const DEFAULT_PREFS: Prefs = { rate: 0.95, voiceName: "", autoPlay: true, showTrans: false, listenOnly: false, theme: "auto" };

export const storage = {
  on: () => read<boolean>("on", false),
  setOn: (v: boolean) => write("on", v),
  prefs: async () => ({ ...DEFAULT_PREFS, ...(await read<Partial<Prefs>>("prefs", {})) }),
  setPrefs: (p: Prefs) => write("prefs", p),
  lastConfig: async () => {
    const c = { ...DEFAULT_CONFIG, ...(await read<Partial<SessionConfig>>("lastConfig", {})) } as SessionConfig;
    if ((c.mode as string) === "ielts") c.mode = "guided";
    return c;
  },
  setLastConfig: (c: SessionConfig) => write("lastConfig", c),
  sessions: async () => {
    const all = await read<Record<string, SessionConfig>>("sessions", {});
    for (const k of Object.keys(all)) if ((all[k].mode as string) === "ielts") all[k] = { ...all[k], mode: "guided" };
    return all;
  },
  setSession: async (id: string, c: SessionConfig) => write("sessions", { ...(await read<Record<string, SessionConfig>>("sessions", {})), [id]: c }),
  pending: () => read<{ config: SessionConfig } | null>("pending", null),
  setPending: (v: { config: SessionConfig } | null) => write("pending", v),
  notes: () => read<NoteItem[]>("notes", []),
  setNotes: (n: NoteItem[]) => write("notes", n),
};
