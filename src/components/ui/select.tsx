import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal";

export interface Option { value: string; label: string; hint?: string; disabled?: boolean }

export function Select({ value, onChange, options, disabled, ariaLabel, className }: {
  value: string; onChange: (v: string) => void; options: Option[]; disabled?: boolean; ariaLabel?: string; className?: string;
}) {
  const portal = usePortal();
  return (
    <S.Root value={value} onValueChange={onChange} disabled={disabled}>
      <S.Trigger aria-label={ariaLabel} className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", className)}>
        <span className="truncate"><S.Value /></span>
        <S.Icon><ChevronDown size={16} className="text-muted-foreground" /></S.Icon>
      </S.Trigger>
      <S.Portal container={portal}>
        <S.Content position="popper" sideOffset={4} className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-fade-in">
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} disabled={o.disabled} className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted">
                <S.ItemIndicator className="absolute left-2"><Check size={14} /></S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
