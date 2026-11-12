import { useStore } from "@tanstack/react-store";
import { Mic, Pause, Play } from "lucide-react";
import { memo } from "react";
import { appStore, playRec } from "@/lib/controller";
import type { UserTurn } from "@/lib/types";
import { fmtTime } from "@/lib/utils";
import { Button } from "./ui/button";

function MiniWave({ peaks }: { peaks: number[] }) {
  const n = 28, per = Math.max(1, peaks.length / n);
  const bars = Array.from({ length: n }, (_, i) => {
    let m = 0;
    for (let j = Math.floor(i * per); j < Math.min(peaks.length, Math.ceil((i + 1) * per)); j++) m = Math.max(m, peaks[j]);
    return Math.max(0.12, Math.min(1, m * 2.4));
  });
  return (
    <svg width={n * 4} height={22} aria-hidden="true" className="text-primary">
      {bars.map((b, i) => <rect key={i} x={i * 4} y={11 - (b * 20) / 2} width={2.5} height={b * 20} rx={1.2} fill="currentColor" />)}
    </svg>
  );
}

export const UserCard = memo(function UserCard({ turn }: { turn: UserTurn }) {
  const rec = useStore(appStore, (s) => s.sent[turn.idx]);
  const playing = useStore(appStore, (s) => s.playingRec === `sent:${turn.idx}`);
  return (
    <article className="flex animate-fade-in justify-end" aria-label="Bạn">
      <div className="flex max-w-[85%] items-center gap-3 rounded-lg border border-border bg-muted/60 py-2 pl-2 pr-4">
        {rec ? (
          <>
            <Button size="icon-sm" variant="default" aria-label={playing ? "Dừng nghe lại" : "Nghe lại bản ghi"} onClick={() => playRec(`sent:${turn.idx}`, rec.url)}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </Button>
            <MiniWave peaks={rec.peaks} />
            <span className="text-xs tabular-nums text-muted-foreground">{fmtTime(rec.ms)}</span>
          </>
        ) : turn.audio ? (
          <span className="flex items-center gap-2 px-2 text-sm text-muted-foreground"><Mic size={15} />Câu trả lời bằng giọng nói</span>
        ) : (
          <span className="px-2 text-sm">{turn.text}</span>
        )}
      </div>
    </article>
  );
});
