import { useStore } from "@tanstack/react-store";
import { Bookmark, Check, Turtle, Volume2, VolumeX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { appStore, say, toast } from "@/lib/controller";
import { useNoteActions } from "@/lib/notes";
import { speechStore } from "@/lib/speech";
import type { NoteItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tip } from "./ui/tooltip";

export function Fold({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} aria-hidden={!open}>
      <div className="overflow-hidden"><div className={cn("pt-3 transition-opacity", open ? "opacity-100" : "opacity-0")}>{children}</div></div>
    </div>
  );
}

/** Nút nghe (thường hoặc chậm). Đang đọc thì bấm lần nữa để dừng. */
export function SpeakBtn({ id, text, slow, label, compact }: { id: string; text: string; slow?: boolean; label?: string; compact?: boolean }) {
  const key = slow ? `${id}~slow` : id;
  const active = useStore(speechStore, (s) => s.key === key);
  const Icon = active ? VolumeX : slow ? Turtle : Volume2;
  const tip = active ? "Dừng" : slow ? "Nghe chậm" : "Nghe";
  return (
    <Tip label={tip}>
      <Button variant={active ? "default" : "secondary"} size={compact ? "icon-sm" : "sm"} aria-label={`${tip}${label ? ": " + label : ""}`} onClick={() => say(key, text, !!slow)}>
        <Icon size={16} />{!compact && <span>{slow ? "Chậm" : "Nghe"}</span>}
      </Button>
    </Tip>
  );
}

export function SaveBtn({ note }: { note: Omit<NoteItem, "id" | "at"> }) {
  const { add } = useNoteActions();
  const [done, setDone] = useState(false);
  return (
    <Tip label={done ? "Đã lưu vào sổ từ vựng" : "Lưu vào sổ từ vựng"}>
      <Button variant="ghost" size="icon-sm" aria-label="Lưu vào sổ từ vựng" onClick={() => { add.mutate(note); setDone(true); toast("Đã lưu vào sổ từ vựng."); }}>
        {done ? <Check size={16} className="text-success" /> : <Bookmark size={16} />}
      </Button>
    </Tip>
  );
}

export const useLang = () => useStore(appStore, (s) => s.session.lang);
