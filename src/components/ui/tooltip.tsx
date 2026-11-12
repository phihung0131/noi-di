import * as T from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { usePortal } from "./portal";

export const TooltipProvider = ({ children }: { children: ReactNode }) => <T.Provider delayDuration={250}>{children}</T.Provider>;

export function Tip({ label, children, side = "bottom" }: { label: string; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal container={usePortal()}>
        <T.Content side={side} sideOffset={6} className="z-[70] max-w-[260px] rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md animate-fade-in">{label}</T.Content>
      </T.Portal>
    </T.Root>
  );
}
