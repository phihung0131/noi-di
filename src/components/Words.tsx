import { useStore } from "@tanstack/react-store";
import { memo, useMemo } from "react";
import { sayWord } from "@/lib/controller";
import { speechStore } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** Hiển thị văn bản từng từ; tô sáng từ đang được đọc, bấm vào từ để nghe riêng từ đó. */
export const Words = memo(function Words({ text, id, className, fade }: { text: string; id: string; className?: string; fade?: boolean }) {
  const tokens = useMemo(() => Array.from(text.matchAll(/\S+/g), (m) => ({ w: m[0], at: m.index ?? 0 })), [text]);
  const cur = useStore(speechStore, (s) => {
    if (!s.key || s.key.split("~")[0] !== id || s.pos < 0) return -1;
    let c = -1;
    for (let i = 0; i < tokens.length; i++) if (tokens[i].at <= s.pos) c = i;
    return c;
  });
  return (
    <span className={className}>
      {tokens.map((t, i) => (
        <span key={i} className={fade ? "animate-fade" : undefined}>
          <span
            onClick={() => sayWord(t.w)}
            className={cn("cursor-pointer rounded-sm px-[1px] transition-colors hover:bg-muted", i === cur && "bg-accent/40 text-foreground", cur > i && "text-muted-foreground")}
          >{t.w}</span>{" "}
        </span>
      ))}
    </span>
  );
});
