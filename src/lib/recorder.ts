/**
 * Cầu nối tới public/tap.js (chạy ở MAIN world). Extension KHÔNG tự mở micro:
 * tap.js dùng chính stream mà hộp thoại ghi âm của AI Studio xin, nên không bị tranh micro hay hỏi quyền hai lần.
 */
export interface RecResult { url: string | null; ms: number }

class MicRecorder {
  peaks: number[] = [];
  private level = 0;
  private lastPeak = 0;
  private started = false;
  private waiter: ((r: RecResult) => void) | null = null;

  constructor() {
    window.addEventListener("message", (e) => {
      const d = e.data;
      if (e.source !== window || !d || !d.__noidi) return;
      if (d.type === "level") this.level = this.level * 0.55 + (d.level as number) * 0.45;
      else if (d.type === "started") this.started = true;
      else if (d.type === "blob") { const w = this.waiter; this.waiter = null; w?.({ url: d.url ?? null, ms: d.ms ?? 0 }); }
    });
  }

  /** Gọi ngay trước khi bấm Start của hộp thoại gốc. */
  begin() { this.peaks = []; this.level = 0; this.lastPeak = 0; this.started = false; }
  /** tap.js đã nhận được stream chưa (nếu chưa, sóng sẽ phẳng và không có bản nghe lại). */
  get tapped() { return this.started; }

  /** Gọi mỗi frame khi đang ghi; trả mức âm 0..1 và lưu đỉnh ~ 18 lần/giây. */
  sample(): number {
    const now = performance.now();
    if (now - this.lastPeak > 55) { this.peaks.push(this.level); this.lastPeak = now; }
    return this.level;
  }

  stop(): Promise<RecResult | null> {
    return new Promise((res) => {
      const timer = window.setTimeout(() => { this.waiter = null; res(null); }, 4000);
      this.waiter = (r) => { window.clearTimeout(timer); res(r); };
      window.postMessage({ __noidiCmd: "stop" }, "*");
    });
  }
  abort() { this.waiter = null; window.postMessage({ __noidiCmd: "abort" }, "*"); }
}
export const mic = new MicRecorder();
