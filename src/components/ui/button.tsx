import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-muted text-foreground hover:bg-muted/70 border border-border",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline: "border border-border bg-card hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        success: "bg-success text-white hover:bg-success/90",
      },
      size: { default: "h-9 px-4", sm: "h-8 px-3 text-[13px]", xs: "h-7 px-2.5 text-xs", icon: "h-9 w-9", "icon-sm": "h-8 w-8", lg: "h-11 px-6 text-[15px]" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const C = asChild ? Slot : "button";
  return <C ref={ref} className={cn(buttonVariants({ variant, size }), className)} type="button" {...p} />;
});
Button.displayName = "Button";
