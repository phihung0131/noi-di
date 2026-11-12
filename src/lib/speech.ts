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
/** Ước lượng tốc độ đọc (ký tự/giây ở rate 1) theo ngôn ngữ, tự hiệu chỉnh sau mỗi câu. */
const cps: Record<string, number> = {};
const defaultCps = (lang: string) => (/^(ja|zh|ko)/.test(lang) ? 6 : 14);

export function stopSpeaking() {
  token++;
  speechSynthesis.cancel();
  speechStore.setState(() => ({ key: null, pos: -1 }));
}

export interface SpeakOpts { key: string; text: string; lang: string; rate: number; voiceName: string; slow?: boolean; onEnd?: () => void }

/**
 * Đọc đúng MỘT ngôn ngữ (lang). Bản dịch tiếng Việt không bao giờ đưa vào đây.
 * Giọng "Google" của Chrome không phát sự kiện boundary, nên tô sáng từng từ dùng
 * boundary khi có, nếu không thì nội suy theo thời gian của từng câu.
 */
export function speak(o: SpeakOpts) {
  const same = speechStore.state.key === o.key;
  stopSpeaking();
  if (same || !o.text.trim()) return;
  const my = ++token;
  speechStore.setState(() => ({ key: o.key, pos: -1 }));
  const voice = pick(o.lang, o.voiceName);
  const rate = o.slow ? Math.max(0.5, o.rate * 0.65) : o.rate;
  const parts = o.text.match(/[^.!?。！？\n]+[.!?。！？]*/g) ?? [o.text];
  const lk = o.lang.split("-")[0];
  let cursor = 0, timer = 0;
  const clear = () => window.clearInterval(timer);

  parts.forEach((part, i) => {
    const at = o.text.indexOf(part, cursor);
    cursor = at + part.length;
    const lead = part.length - part.trimStart().length;
    const body = part.trim();
    const u = new SpeechSynthesisUtterance(body);
    u.lang = o.lang; u.rate = rate; if (voice) u.voice = voice;
    let gotBoundary = false, t0 = 0;
    u.onboundary = (e) => {
      gotBoundary = true; clear();
      if (my === token) speechStore.setState((s) => ({ ...s, pos: at + lead + e.charIndex }));
    };
    u.onstart = () => {
      if (my !== token) return;
      t0 = performance.now();
      const per = (cps[lk] ?? defaultCps(o.lang)) * rate;
      const dur = Math.max(300, (body.length / per) * 1000);
      clear();
      timer = window.setInterval(() => {
        if (my !== token || gotBoundary) return clear();
        const frac = Math.min(0.98, (performance.now() - t0) / dur);
        speechStore.setState((s) => ({ ...s, pos: at + lead + Math.floor(frac * body.length) }));
      }, 70);
    };
    const finish = () => {
      clear();
      if (t0 && !gotBoundary && body.length > 3) {
        const real = body.length / ((performance.now() - t0) / 1000) / rate;
        if (isFinite(real) && real > 1) cps[lk] = (cps[lk] ?? real) * 0.5 + real * 0.5;
      }
    };
    if (i === parts.length - 1) {
      const done = () => { finish(); if (my === token) { speechStore.setState(() => ({ key: null, pos: -1 })); o.onEnd?.(); } };
      u.onend = done; u.onerror = done;
    } else { u.onend = finish; u.onerror = finish; }
    speechSynthesis.speak(u);
  });
}
