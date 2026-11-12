/** Micro riêng của extension: vẽ sóng âm + giữ file để nghe lại. Bản gửi AI vẫn do hộp thoại gốc ghi. */
export class MicRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mr: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private level = 0;
  private lastPeak = 0;
  peaks: number[] = [];
  available = false;

  async start() {
    this.peaks = []; this.chunks = []; this.level = 0; this.lastPeak = 0;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser);
      this.mr = new MediaRecorder(this.stream);
      this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.mr.start();
      this.available = true;
    } catch { this.cleanup(); this.available = false; }
  }

  /** Gọi mỗi frame khi đang ghi; trả mức âm 0..1 và lưu đỉnh ~ 18 lần/giây. */
  sample(): number {
    if (this.analyser) {
      const buf = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(buf);
      let m = 0;
      for (const v of buf) m = Math.max(m, Math.abs(v - 128) / 128);
      this.level = this.level * 0.55 + m * 0.45;
    } else this.level = 0.12 + Math.abs(Math.sin(performance.now() / 200)) * 0.2;
    const now = performance.now();
    if (now - this.lastPeak > 55) { this.peaks.push(this.level); this.lastPeak = now; }
    return this.level;
  }

  stop(): Promise<Blob | null> {
    return new Promise((res) => {
      const mr = this.mr; this.mr = null;
      if (!mr || mr.state === "inactive") { this.cleanup(); return res(null); }
      mr.onstop = () => { const b = this.chunks.length ? new Blob(this.chunks, { type: mr.mimeType }) : null; this.cleanup(); res(b); };
      mr.stop();
    });
  }
  abort() { try { if (this.mr && this.mr.state !== "inactive") { this.mr.onstop = null; this.mr.stop(); } } catch { /* */ } this.mr = null; this.cleanup(); }
  private cleanup() {
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* */ }
    try { void this.ctx?.close(); } catch { /* */ }
    this.stream = this.ctx = this.analyser = null;
  }
}
export const mic = new MicRecorder();
