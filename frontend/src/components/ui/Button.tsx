import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-agent-sensing text-bg-base hover:bg-[#7DD3FC] active:bg-[#38BDF8] border border-agent-sensing",
  secondary:
    "bg-bg-overlay text-ink-primary border border-line-default hover:bg-bg-raised hover:border-line-strong",
  ghost:
    "bg-transparent text-ink-secondary border border-transparent hover:bg-bg-overlay hover:text-ink-primary",
  danger:
    "bg-sev-critical text-white border border-sev-critical hover:bg-[#F0686D] active:bg-[#D43D43]",
  success:
    "bg-sev-low text-bg-base border border-sev-low hover:bg-[#5BE3CB] active:bg-[#22D3B8]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  iconLeft,
  iconRight,
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-agent-sensing",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}