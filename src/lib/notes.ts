import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storage } from "./storage";
import type { NoteItem } from "./types";

const KEY = ["notes"];
export const useNotes = () => useQuery({ queryKey: KEY, queryFn: storage.notes, staleTime: Infinity });

export function useNoteActions() {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: async (n: Omit<NoteItem, "id" | "at">) => {
      const all = await storage.notes();
      if (all.some((x) => x.text === n.text)) return all;
      const next = [{ ...n, id: crypto.randomUUID(), at: Date.now() }, ...all];
      await storage.setNotes(next);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(KEY, next),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const next = (await storage.notes()).filter((x) => x.id !== id);
      await storage.setNotes(next);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(KEY, next),
  });
  return { add, remove };
}

const csvCell = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
/** CSV cho Anki / Excel: mặt trước là câu ngôn ngữ luyện nói, mặt sau là nghĩa/giải thích. */
export function notesCsv(items: NoteItem[]): string {
  const rows = [["front", "back", "kind", "lang", "date"], ...items.map((n) => [n.text, n.tr ?? "", n.kind, n.lang, new Date(n.at).toISOString().slice(0, 10)])];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
