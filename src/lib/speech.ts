import { Store } from "@tanstack/store";

/** Trạng thái đọc: key đang đọc (để nút nghe đổi biểu tượng). */
export const speechStore = new Store<{ key: string | null }>({ key: null });

let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();
const loadVoices = () => { voices = speechSynthesis.getVoices(); listeners.forEach((l) => l()); };
if (typeof speechSynthesis !== "undefined") {
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
}
export const onVoices = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

const norm = (l: string) => l.replace("_", "-").toLowerCase();
export function voicesFor(lang: string) {
  const want = norm(lang), prefix = want.split("-")[0];
  const exact = voices.filter((v) => norm(v.lang) === want);
  return exact.length ? exact : voices.filter((v) => norm(v.lang).split("-")[0] === prefix);
}
function pick(lang: string, name: string) {
  const pool = voicesFor(lang);
  return pool.find((v) => v.name === name) ?? pool.find((v) => /google|natural|neural/i.test(v.name)) ?? pool[0] ?? null;
}

let token = 0;

export function stopSpeaking() {
  token++;
  speechSynthesis.cancel();
  speechStore.setState(() => ({ key: null }));
}

export interface SpeakOpts { key: string; text: string; lang: string; rate: number; voiceName: string; slow?: boolean; onEnd?: () => void }

/** Đọc đúng MỘT ngôn ngữ (lang). Bản dịch tiếng Việt không bao giờ đưa vào đây. */
export function speak(o: SpeakOpts) {
  const same = speechStore.state.key === o.key;
  stopSpeaking();
  if (same || !o.text.trim()) return;
  const my = ++token;
  speechStore.setState(() => ({ key: o.key }));
  const voice = pick(o.lang, o.voiceName);
  const rate = o.slow ? Math.max(0.5, o.rate * 0.65) : o.rate;
  const parts = (o.text.match(/[^.!?。！？\n]+[.!?。！？]*/g) ?? [o.text]).map((p) => p.trim()).filter(Boolean);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = o.lang; u.rate = rate; if (voice) u.voice = voice;
    if (i === parts.length - 1) {
      const done = () => { if (my === token) { speechStore.setState(() => ({ key: null })); o.onEnd?.(); } };
      u.onend = done; u.onerror = done;
    }
    speechSynthesis.speak(u);
  });
}
