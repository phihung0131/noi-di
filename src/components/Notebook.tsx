import { useStore } from "@tanstack/react-store";
import { Trash2 } from "lucide-react";
import { appStore, setDialog } from "@/lib/controller";
import { useNoteActions, useNotes } from "@/lib/notes";
import { SpeakBtn } from "./bits";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";

export function NotebookDialog() {
  const open = useStore(appStore, (s) => s.dialog === "notebook");
  const { data = [] } = useNotes();
  const { remove } = useNoteActions();
  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "notebook" : null)}>
      <DialogContent title="Sổ từ vựng" description={data.length ? `${data.length} mục đã lưu. Bấm loa để nghe lại.` : undefined} wide>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có gì. Bấm biểu tượng đánh dấu cạnh câu mẫu hoặc cách nói hay hơn để lưu vào đây.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base">{n.text}</p>
                  {n.tr && <p className="mt-0.5 text-sm text-muted-foreground">{n.tr}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{n.kind === "sample" ? "Câu mẫu" : "Cách nói hay hơn"} · {n.lang}</p>
                </div>
                <SpeakBtn id={`note:${n.id}`} text={n.text} compact label={n.text} />
                <Button variant="ghost" size="icon-sm" aria-label="Xoá khỏi sổ" onClick={() => remove.mutate(n.id)}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
