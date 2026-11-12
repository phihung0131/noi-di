import { memo, useMemo } from "react";
import { sayWord } from "@/lib/controller";

/** Hiển thị văn bản; bấm vào một từ để nghe riêng từ đó. */
export const Words = memo(function Words({ text, className }: { text: string; id?: string; className?: string }) {
  const tokens = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  return (
    <span className={className}>
      {tokens.map((w, i) => (
        <span key={i}>
          <span onClick={() => sayWord(w)} className="cursor-pointer rounded-sm px-[1px] transition-colors hover:bg-muted">{w}</span>{" "}
        </span>
      ))}
    </span>
  );
});
