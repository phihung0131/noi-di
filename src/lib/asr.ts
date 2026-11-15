/**
 * Đối chiếu bằng nhận dạng giọng nói của Chrome (Web Speech API), chỉ chạy khi người dùng bật trong Cài đặt.
 * Chrome gửi giọng nói tới dịch vụ nhận dạng của Google (không phải AI Studio) và trả về một bản chép lời độc lập.
 * Bản này giúp phát hiện khi giám khảo chép sai hoặc "sửa giùm" lời học viên. Nó không phải chuẩn tuyệt đối:
 * ASR cũng có thể nghe nhầm, nhất là giọng chưa chuẩn.
 */
interface SRResult { isFinal: boolean; 0: { transcript: string } }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SR {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SRCtor = new () => SR;

const ctor = (): SRCtor | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const asrSupported = () => !!ctor();

let current: SR | null = null;
let finals: string[] = [];
let running = false;

/** Bắt đầu nhận dạng song song với bản ghi. Chrome tự dừng sau một quãng im lặng nên tự khởi động lại khi còn ghi. */
export function asrStart(lang: string) {
  asrAbort();
  const C = ctor();
  if (!C) return;
  finals = [];
  running = true;
  const make = (): SR => {
    const r = new C();
    r.lang = lang; r.continuous = true; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) finals.push(e.results[i][0].transcript.trim());
    };
    r.onerror = (e) => { if (/not-allowed|service-not-allowed|network|language-not-supported/.test(e.error)) running = false; };
    r.onend = () => {
      if (!running) return;
      try { current = make(); current.start(); } catch { running = false; }
    };
    return r;
  };
  try { current = make(); current.start(); } catch { running = false; current = null; }
}

const joined = () => finals.join(" ").replace(/\s+/g, " ").trim();

/** Dừng và lấy bản chép lời. Chờ tối đa `waitMs` cho kết quả cuối cùng. */
export function asrStop(waitMs = 1500): Promise<string> {
  return new Promise((resolve) => {
    const r = current;
    running = false; current = null;
    if (!r) { resolve(joined()); return; }
    let settled = false;
    const done = () => { if (settled) return; settled = true; resolve(joined()); };
    const timer = window.setTimeout(done, waitMs);
    r.onend = () => { window.clearTimeout(timer); done(); };
    try { r.stop(); } catch { window.clearTimeout(timer); done(); }
  });
}

export function asrAbort() {
  running = false;
  const r = current; current = null;
  if (r) { r.onend = null; try { r.abort(); } catch { /* */ } }
  finals = [];
}
