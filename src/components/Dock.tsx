import { useStore } from "@tanstack/react-store";
import { Loader2, Mic, Pause, Play, RotateCcw, Send, Square, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { appStore, cancelRecording, playRec, playerEl, redoRecording, sendRecording, startRecording, stopRecording } from "@/lib/controller";
import { mic } from "@/lib/recorder";
import { cn, fmtTime } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tip } from "./ui/tooltip";

function Wave() {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useStore(appStore, (s) => s.rec.state);
  const peaksRef = useRef<number[]>([]);
  peaksRef.current = useStore(appStore, (s) => s.rec.peaks);

  useEffect(() => {
    const c = ref.current!;
    let raf = 0;
    const css = getComputedStyle(c.closest(".noidi")!);
    const col = (n: string, a = 1) => `hsl(${css.getPropertyValue(n).trim()} / ${a})`;
    const draw = () => {
      const d = window.devicePixelRatio || 1, r = c.getBoundingClientRect();
      if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
      const g = c.getContext("2d")!, W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      const bw = 2.5 * d, step = 4.5 * d, n = Math.floor(W / step);
      let data: number[] = [];
      if (state === "recording") { mic.sample(); data = mic.peaks.slice(-n); }
      else if (state === "recorded" && peaksRef.current.length) {
        const per = peaksRef.current.length / n;
        for (let i = 0; i < n; i++) { let m = 0; for (let j = Math.floor(i * per); j < Math.max(Math.floor(i * per) + 1, Math.floor((i + 1) * per)); j++) m = Math.max(m, peaksRef.current[j] ?? 0); data.push(m); }
      }
      const ph = state === "recorded" && playerEl.duration ? Math.floor((playerEl.currentTime / playerEl.duration) * n) : -1;
      const off = state === "recording" ? n - data.length : 0;
      for (let i = 0; i < n; i++) {
        const v = data[i - off], has = i >= off && v !== undefined;
        const h = has ? Math.max(3 * d, Math.min(1, v * 2.4) * (H - 4 * d)) : 3 * d;
        g.fillStyle = !has ? col("--border") : state === "recording" ? col("--destructive") : ph >= 0 && i > ph ? col("--muted-foreground", 0.5) : col("--primary");
        g.beginPath(); g.roundRect(i * step, (H - h) / 2, bw, h, bw / 2); g.fill();
      }
      if (state === "recording" || (state === "recorded" && !playerEl.paused)) raf = requestAnimationFrame(draw);
    };
    draw();
    const onPlay = () => { cancelAnimationFrame(raf); draw(); };
    playerEl.addEventListener("play", onPlay);
    return () => { cancelAnimationFrame(raf); playerEl.removeEventListener("play", onPlay); };
  }, [state]);
  return <canvas ref={ref} className="h-9 w-full min-w-0 flex-1" aria-hidden="true" />;
}

function Timer() {
  const { state, startedAt, ms } = useStore(appStore, (s) => s.rec);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (state !== "recording") return;
    const id = window.setInterval(() => { if (ref.current) ref.current.textContent = fmtTime(Date.now() - startedAt); }, 250);
    return () => window.clearInterval(id);
  }, [state, startedAt]);
  const shown = state === "recorded" || state === "sending" ? ms : 0;
  return <span ref={ref} className={cn("w-11 text-sm tabular-nums", state === "recording" ? "text-foreground" : "text-muted-foreground", shown >= 15000 && "text-success")}>{fmtTime(shown)}</span>;
}

export function Dock() {
  const state = useStore(appStore, (s) => s.rec.state);
  const url = useStore(appStore, (s) => s.rec.url);
  const playing = useStore(appStore, (s) => s.playingRec === "draft");
  const generating = useStore(appStore, (s) => s.generating);
  const busy = state === "starting" || state === "stopping" || state === "sending";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className={cn("pointer-events-auto flex h-14 w-[min(520px,100%)] items-center gap-2.5 rounded-xl border bg-card px-2 shadow-lg transition-colors", state === "recording" ? "border-destructive/60" : "border-border")} role="group" aria-label="Ghi âm">
        {state === "idle" && (
          <Tip label="Bắt đầu nói (Alt+R)" side="top"><Button size="icon" className="h-10 w-10 rounded-lg" onClick={() => void startRecording()} aria-label="Bắt đầu ghi âm"><Mic size={20} /></Button></Tip>
        )}
        {busy && <Button size="icon" className="h-10 w-10 rounded-lg" disabled aria-label="Đang xử lý"><Loader2 size={20} className="animate-spin" /></Button>}
        {state === "recording" && (
          <Tip label="Dừng (Alt+R)" side="top"><Button variant="destructive" size="icon" className="h-10 w-10 animate-ring rounded-lg shadow-[0_0_0_0_hsl(var(--destructive)/.5)]" onClick={() => void stopRecording()} aria-label="Dừng ghi âm"><Square size={16} fill="currentColor" /></Button></Tip>
        )}
        {state === "recorded" && (
          <>
            <Tip label="Huỷ bản ghi" side="top"><Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => void cancelRecording()} aria-label="Huỷ bản ghi"><Trash2 size={18} /></Button></Tip>
            <Tip label="Nghe lại (Alt+P)" side="top"><Button variant="secondary" size="icon" className="h-10 w-10" disabled={!url} onClick={() => playRec("draft", url)} aria-label={playing ? "Dừng nghe lại" : "Nghe lại"}>{playing ? <Pause size={18} /> : <Play size={18} />}</Button></Tip>
          </>
        )}

        {state === "idle" ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Wave />
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">{generating ? "Giám khảo đang trả lời…" : "Bấm để nói · Alt+R"}</span>
          </div>
        ) : <Wave />}

        <Timer />

        {state === "recorded" && (
          <>
            <Tip label="Ghi lại" side="top"><Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => void redoRecording()} aria-label="Ghi lại"><RotateCcw size={18} /></Button></Tip>
            <Tip label="Gửi cho giám khảo (Alt+Enter)" side="top"><Button variant="success" className="h-10 rounded-lg px-4" onClick={() => void sendRecording()}><Send size={16} />Gửi</Button></Tip>
          </>
        )}
        {state === "recording" && <span className="pr-2 text-xs text-muted-foreground">Mục tiêu 20–30s</span>}
      </div>
    </div>
  );
}
