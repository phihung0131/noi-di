import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string }) {
  return (
    <S.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={label}
      className={cn("relative h-6 w-10 shrink-0 rounded-full border border-border bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary")}>
      <S.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-muted-foreground transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground" />
    </S.Root>
  );
}
