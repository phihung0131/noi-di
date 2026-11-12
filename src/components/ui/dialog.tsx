import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal";

export const Dialog = D.Root;

export function DialogContent({ title, description, children, className, wide }: { title: string; description?: string; children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <D.Portal container={usePortal()}>
      <D.Overlay className="fixed inset-0 z-40 bg-foreground/40 animate-fade" />
      <D.Content
        aria-describedby={description ? undefined : undefined}
        className={cn("fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(94vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl animate-fade focus:outline-none", wide && "w-[min(94vw,620px)]", className)}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-lg font-semibold">{title}</D.Title>
            {description && <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>}
          </div>
          <D.Close aria-label="Đóng" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} /></D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
