import { useStore } from "@tanstack/react-store";
import { Loader2 } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Coffee } from "lucide-react";
import { appStore, dismissNudge, isLocked, openReport, retryReply, setDialog } from "@/lib/controller";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { ExaminerCard } from "./ExaminerCard";
import { UserCard } from "./UserCard";

export function Feed() {
  const turns = useStore(appStore, (s) => s.turns);
  const generating = useStore(appStore, (s) => s.generating);
  const hydrating = useStore(appStore, (s) => s.hydrating);
  const stalled = useStore(appStore, (s) => s.stalled);
  const nudge = useStore(appStore, (s) => s.nudge);
  const locked = useStore(appStore, (s) => isLocked(s));
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const onScroll = () => {
    const el = scroller.current!;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };
  // Giữ ở đáy khi đang stream; không cuộn mượt để tránh giật.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [turns, generating, stalled]);

  const lastModel = turns.map((t) => t.role).lastIndexOf("model");
  const visible = turns.filter((t, i) => !(t.role === "user" && (t.hidden || t.empty)) && !(t.role === "model" && t.empty && !(generating && i === turns.length - 1)));

  return (
    <div ref={scroller} onScroll={onScroll} className="absolute inset-0 overflow-y-auto px-4 pb-32 pt-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        {hydrating && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Đang nạp lịch sử cuộc trò chuyện…</p>}
        {!turns.length && locked && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Đang tải cuộc trò chuyện…</p>}
        {!turns.length && !locked && (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <div className="mx-auto mb-5 w-fit"><Logo size={64} /></div>
            <h2 className="text-2xl font-semibold">Luyện nói với giám khảo AI</h2>
            <p className="mt-2 text-muted-foreground">Chọn ngôn ngữ, chế độ và trình độ. Giám khảo hỏi, bạn nói, rồi nhận xét ngay từng câu.</p>
            <Button size="lg" className="mt-6" onClick={() => setDialog("new")}>Bắt đầu buổi mới</Button>
          </div>
        )}
        {visible.map((t) => {
          if (t.role === "user") return <UserCard key={t.key} turn={t} />;
          const idx = turns.indexOf(t);
          return <ExaminerCard key={t.key} turn={t} latest={idx === lastModel} streaming={generating && idx === turns.length - 1} answered={idx < turns.length - 1} />;
        })}
        {nudge && !stalled && (
          <aside className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm" aria-label="Lời nhắn từ tác giả">
            <p className="flex min-w-0 flex-1 basis-64 items-start gap-2.5 text-muted-foreground"><Coffee size={16} className="mt-0.5 shrink-0 text-primary" /><span>Bạn đã luyện được <b className="font-semibold text-foreground">{nudge} câu</b>, tuyệt lắm. Nếu Nói Đi đang giúp ích, mời tác giả một ly cà phê để mình làm tiếp nhé. Không bắt buộc, và mình sẽ không nhắc thường xuyên.</span></p>
            <span className="flex gap-2"><Button size="sm" onClick={() => void dismissNudge(true)}>Mời cà phê</Button><Button size="sm" variant="ghost" onClick={() => void dismissNudge(false)}>Để sau</Button></span>
          </aside>
        )}
        {stalled && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <span>Giám khảo chưa phản hồi hoặc phản hồi bị cắt ngang. Có thể câu trả lời quá dài hoặc AI Studio gặp lỗi tạm thời.</span>
            <span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void retryReply()}>Yêu cầu trả lời lại</Button><Button size="sm" variant="ghost" onClick={() => openReport({ category: "ai", note: "Giám khảo không phản hồi hoặc phản hồi bị cắt ngang." })}>Báo sự cố</Button></span>
          </div>
        )}
        {generating && turns[turns.length - 1]?.role === "user" && (
          <div className="flex items-center gap-1.5 py-2" aria-label="Giám khảo đang soạn câu trả lời">
            {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-dot rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
        )}
      </div>
    </div>
  );
}
