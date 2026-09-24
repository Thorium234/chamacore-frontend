import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cx } from "@/components/ui/cx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600 disabled:hover:bg-indigo-600",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-zinc-400 disabled:hover:bg-white",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:hover:bg-red-600",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-400 disabled:hover:bg-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          role="status"
          aria-label="Loading"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});