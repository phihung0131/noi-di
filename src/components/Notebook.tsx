import { useStore } from "@tanstack/react-store";
import { Download, Trash2 } from "lucide-react";
import { appStore, setDialog } from "@/lib/controller";
import { notesCsv, useNoteActions, useNotes } from "@/lib/notes";
import { SpeakBtn } from "./bits";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";

const KIND: Record<string, string> = { sample: "Câu mẫu", vocab: "Cách nói hay hơn", question: "Câu hỏi", error: "Lỗi cần sửa" };

function exportCsv(data: Parameters<typeof notesCsv>[0]) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + notesCsv(data)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `noi-di-so-tu-vung-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

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
          <>
          <div className="mb-2 flex justify-end"><Button variant="outline" size="sm" onClick={() => exportCsv(data)}><Download size={15} />Xuất CSV (Anki, Excel)</Button></div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base">{n.text}</p>
                  {n.tr && <p className="mt-0.5 text-sm text-muted-foreground">{n.tr}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{KIND[n.kind] ?? "Cách nói hay hơn"} · {n.lang}</p>
                </div>
                <SpeakBtn id={`note:${n.id}`} text={n.text} compact label={n.text} />
                <Button variant="ghost" size="icon-sm" aria-label="Xoá khỏi sổ" onClick={() => remove.mutate(n.id)}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
