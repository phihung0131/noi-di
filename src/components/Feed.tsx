import { useStore } from "@tanstack/react-store";
import { Loader2 } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { appStore, isLocked, setDialog } from "@/lib/controller";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { ExaminerCard } from "./ExaminerCard";
import { UserCard } from "./UserCard";

export function Feed() {
  const turns = useStore(appStore, (s) => s.turns);
  const generating = useStore(appStore, (s) => s.generating);
  const hydrating = useStore(appStore, (s) => s.hydrating);
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
  }, [turns, generating]);

  const lastModel = turns.map((t) => t.role).lastIndexOf("model");
  const visible = turns.filter((t) => !(t.role === "user" && t.hidden));

  return (
    <div ref={scroller} onScroll={onScroll} className="absolute inset-0 overflow-y-auto px-4 pb-32 pt-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        {hydrating && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Đang nạp lịch sử cuộc trò chuyện…</p>}
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
        {generating && turns[turns.length - 1]?.role === "user" && (
          <div className="flex items-center gap-1.5 py-2" aria-label="Giám khảo đang soạn câu trả lời">
            {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-dot rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
        )}
      </div>
    </div>
  );
}
