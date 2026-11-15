import { useStore } from "@tanstack/react-store";
import { Check, Download, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { appStore, setDialog } from "@/lib/controller";
import { notesCsv, useNoteActions, useNotes } from "@/lib/notes";
import { boxOf, cardFront, dueAt, dueNotes, MAX_BOX } from "@/lib/srs";
import type { NoteItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SpeakBtn } from "./bits";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";

const KIND: Record<string, string> = { sample: "Câu mẫu", vocab: "Cách nói hay hơn", question: "Câu hỏi", error: "Lỗi cần sửa" };

function exportCsv(data: Parameters<typeof notesCsv>[0]) {
  const url = URL.createObjectURL(new Blob(["﻿" + notesCsv(data)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `noi-di-so-tu-vung-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** "sau 3 ngày", "sau 10 phút", "đến hạn". */
function whenText(t: number, now = Date.now()): string {
  const d = t - now;
  if (d <= 0) return "đến hạn";
  const min = Math.round(d / 60000);
  if (min < 60) return `sau ${min} phút`;
  const h = Math.round(min / 60);
  if (h < 24) return `sau ${h} giờ`;
  return `sau ${Math.round(h / 24)} ngày`;
}

/** Ôn từng thẻ: nhìn mặt trước, tự nói to, rồi mới hiện đáp án và tự chấm. */
function Review({ items }: { items: NoteItem[] }) {
  const { review } = useNoteActions();
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const card = items[0];
  useEffect(() => setShown(false), [card?.id]);
  if (!card) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium">{done ? `Xong ${done} thẻ. Không còn mục nào đến hạn.` : "Không có mục nào đến hạn ôn."}</p>
        <p className="mt-1 text-xs text-muted-foreground">Mục mới lưu vào sổ sẽ đến hạn ngay. Nhớ được thì lần ôn sau cách xa dần: 1, 3, 7, 16, 35 ngày.</p>
      </div>
    );
  }
  const answer = (remembered: boolean) => { review.mutate({ id: card.id, remembered }); setDone((n) => n + 1); };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Còn {items.length} thẻ · {KIND[card.kind] ?? "Cách nói hay hơn"} · hộp {boxOf(card)}/{MAX_BOX}</p>
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">{card.kind === "error" ? "Nói lại cho đúng:" : "Nói bằng ngôn ngữ đang luyện:"}</p>
        <p className="mt-1 text-base">{cardFront(card)}</p>
        {shown ? (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <p className="flex-1 font-serif text-lg">{card.text}</p>
            <SpeakBtn id={`review:${card.id}`} text={card.text} compact label={card.text} />
            <SpeakBtn id={`review:${card.id}`} text={card.text} slow compact label={card.text} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Tự nói to câu đúng trước, rồi mới xem đáp án.</p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        {shown ? (
          <>
            <Button variant="outline" onClick={() => answer(false)}><RotateCcw size={15} />Chưa nhớ</Button>
            <Button onClick={() => answer(true)}><Check size={15} />Nhớ rồi</Button>
          </>
        ) : (
          <Button onClick={() => setShown(true)}><Eye size={15} />Hiện đáp án</Button>
        )}
      </div>
    </div>
  );
}

export function NotebookDialog() {
  const open = useStore(appStore, (s) => s.dialog === "notebook");
  const { data = [] } = useNotes();
  const { remove } = useNoteActions();
  const due = dueNotes(data);
  const [tab, setTab] = useState<"review" | "all">("all");
  // Mở sổ khi có mục đến hạn thì vào thẳng phần ôn tập.
  useEffect(() => { if (open) setTab(dueNotes(data).length ? "review" : "all"); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabBtn = (id: "review" | "all", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={cn("rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === id ? "bg-primary/15 font-medium" : "text-muted-foreground hover:bg-muted")}>{label}</button>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "notebook" : null)}>
      <DialogContent title="Sổ từ vựng" description={data.length ? `${data.length} mục đã lưu · ${due.length} mục đến hạn ôn.` : undefined} wide>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có gì. Bấm biểu tượng đánh dấu cạnh câu mẫu hoặc cách nói hay hơn để lưu vào đây.</p>
        ) : (
          <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" role="tablist">{tabBtn("review", `Ôn tập (${due.length})`)}{tabBtn("all", "Tất cả")}</div>
            {tab === "all" && <Button variant="outline" size="sm" onClick={() => exportCsv(data)}><Download size={15} />Xuất CSV (Anki, Excel)</Button>}
          </div>
          {tab === "review" ? <Review items={due} /> : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base">{n.text}</p>
                  {n.tr && <p className="mt-0.5 text-sm text-muted-foreground">{n.tr}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{KIND[n.kind] ?? "Cách nói hay hơn"} · {n.lang} · hộp {boxOf(n)}/{MAX_BOX}, ôn {whenText(dueAt(n))}</p>
                </div>
                <SpeakBtn id={`note:${n.id}`} text={n.text} compact label={n.text} />
                <Button variant="ghost" size="icon-sm" aria-label="Xoá khỏi sổ" onClick={() => remove.mutate(n.id)}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
          )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
