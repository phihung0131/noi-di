import { useStore } from "@tanstack/react-store";
import { BookMarked, ChevronDown, ClipboardList, Coffee, Cpu, Lock, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { appStore, isLocked, resync, setDialog, setOn, summarize } from "@/lib/controller";
import { langChip, MODES } from "@/lib/langs";
import type { ModelTurn } from "@/lib/types";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Tip } from "./ui/tooltip";

function Trend({ turns }: { turns: unknown[] }) {
  const bands = (turns as ModelTurn[]).filter((t) => t.role === "model").map((t) => t.score?.find((s) => s.key === "NATIVE")?.value).filter(Boolean).map(Number);
  if (!bands.length) return null;
  const last = bands[bands.length - 1], diff = bands.length > 1 ? last - bands[bands.length - 2] : 0;
  const w = 56, h = 20, max = 100;
  const pts = bands.slice(-8).map((b, i, a) => `${a.length === 1 ? w / 2 : (i / (a.length - 1)) * w},${h - (b / max) * h}`).join(" ");
  return (
    <Tip label="Mức giống người bản xứ qua các lượt">
      <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
        {bands.length > 1 && <svg width={w} height={h} aria-hidden="true" className="text-primary"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>}
        <span className="text-sm font-semibold tabular-nums">{Math.round(last)}%</span>
        {diff !== 0 && <span className={`text-xs tabular-nums ${diff > 0 ? "text-success" : "text-destructive"}`}>{diff > 0 ? "+" : ""}{Math.round(diff)}</span>}
      </div>
    </Tip>
  );
}

export function Header() {
  const session = useStore(appStore, (s) => s.session);
  const turns = useStore(appStore, (s) => s.turns);
  const generating = useStore(appStore, (s) => s.generating);
  const model = useStore(appStore, (s) => s.model);
  const syncing = useStore(appStore, (s) => s.syncing);
  const locked = useStore(appStore, (s) => isLocked(s));
  const chips = [langChip(session.lang), MODES.find((m) => m.id === session.mode)?.label, session.level, session.output === "vi" ? "Giải thích tiếng Việt" : "Explain in English"];
  const canSummarize = turns.filter((t) => t.role === "user" && !t.hidden).length >= 1 && !generating;

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2.5"><Logo size={28} /><span className="text-[15px] font-semibold">Nói Đi</span></div>
      {locked && (
        <Tip label="Thiết lập này cố định trong cuộc trò chuyện. Muốn đổi, hãy tạo buổi mới.">
          <div className="ml-2 hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground md:flex" tabIndex={0}>
            <Lock size={13} aria-label="Đã khoá" />
            <span className="truncate">{chips.filter(Boolean).join(" · ")}</span>
          </div>
        </Tip>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <Tip label="Đổi model AI Studio đang dùng">
          <Button variant="outline" size="sm" className="max-w-[210px] font-normal" onClick={() => setDialog("model")} aria-label={`Model: ${model || "chưa rõ"}. Bấm để đổi`}>
            <Cpu size={14} /><span className="truncate font-mono text-xs">{model || "model"}</span><ChevronDown size={14} />
          </Button>
        </Tip>
        <Trend turns={turns} />
        <Tip label="Đồng bộ lại: nạp lại toàn bộ cuộc trò chuyện từ AI Studio, không cần tải lại trang"><Button variant="outline" size="sm" aria-label="Đồng bộ lại với AI Studio" disabled={syncing} onClick={() => void resync()}><RefreshCw size={15} className={syncing ? "animate-spin" : ""} /><span className="hidden md:inline">{syncing ? "Đang đồng bộ" : "Đồng bộ"}</span></Button></Tip>
        {canSummarize && <Tip label="Tổng kết buổi: điểm mạnh, lỗi lặp lại, việc cần luyện"><Button variant="ghost" size="icon" aria-label="Tổng kết buổi" onClick={() => void summarize()}><ClipboardList size={18} /></Button></Tip>}
        <Tip label="Nói Đi miễn phí. Mời tác giả ly cà phê để mình làm tiếp"><Button variant="outline" size="sm" className="border-accent/50 bg-accent/10 hover:bg-accent/20" onClick={() => setDialog("donate")} aria-label="Mời tác giả ly cà phê"><Coffee size={15} className="text-accent" /><span className="hidden lg:inline">Ủng hộ</span></Button></Tip>
        <Tip label="Sổ từ vựng"><Button variant="ghost" size="icon" aria-label="Sổ từ vựng" onClick={() => setDialog("notebook")}><BookMarked size={18} /></Button></Tip>
        <Tip label="Cài đặt"><Button variant="ghost" size="icon" aria-label="Cài đặt" onClick={() => setDialog("settings")}><SlidersHorizontal size={18} /></Button></Tip>
        <Button size="sm" className="ml-1" onClick={() => setDialog("new")}><Plus size={16} />Buổi mới</Button>
        <Tip label="Thoát về AI Studio"><Button variant="ghost" size="icon" aria-label="Thoát" onClick={() => void setOn(false)}><X size={18} /></Button></Tip>
      </div>
    </header>
  );
}
