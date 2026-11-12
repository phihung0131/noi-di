import { Store } from "@tanstack/store";

/** Trạng thái đọc: key đang đọc + vị trí ký tự để tô sáng từng từ. */
export const speechStore = new Store<{ key: string | null; pos: number }>({ key: null, pos: -1 });

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
  speechStore.setState(() => ({ key: null, pos: -1 }));
}

export interface SpeakOpts { key: string; text: string; lang: string; rate: number; voiceName: string; slow?: boolean; onEnd?: () => void }

/** Đọc đúng MỘT ngôn ngữ (lang). Bản dịch tiếng Việt không bao giờ đưa vào đây. */
export function speak(o: SpeakOpts) {
  const same = speechStore.state.key === o.key;
  stopSpeaking();
  if (same || !o.text.trim()) return;
  const my = ++token;
  speechStore.setState(() => ({ key: o.key, pos: -1 }));
  const voice = pick(o.lang, o.voiceName);
  const rate = o.slow ? Math.max(0.5, o.rate * 0.65) : o.rate;
  const parts = o.text.match(/[^.!?。！？\n]+[.!?。！？]*/g) ?? [o.text];
  let cursor = 0;
  parts.forEach((part, i) => {
    const at = o.text.indexOf(part, cursor);
    cursor = at + part.length;
    const lead = part.length - part.trimStart().length;
    const u = new SpeechSynthesisUtterance(part.trim());
    u.lang = o.lang; u.rate = rate; if (voice) u.voice = voice;
    u.onboundary = (e) => { if (my === token) speechStore.setState((s) => ({ ...s, pos: at + lead + e.charIndex })); };
    if (i === parts.length - 1) {
      const done = () => { if (my === token) { speechStore.setState(() => ({ key: null, pos: -1 })); o.onEnd?.(); } };
      u.onend = done; u.onerror = done;
    }
    speechSynthesis.speak(u);
  });
}
