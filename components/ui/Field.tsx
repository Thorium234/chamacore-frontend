import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cx } from "@/components/ui/cx";

const fieldBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70";

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cx(fieldBase, error && "border-red-500 focus:border-red-500 focus:ring-red-500/20", className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cx(fieldBase, error && "border-red-500", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cx(fieldBase, "min-h-20", error && "border-red-500", className)}
        {...props}
      />
    </FieldShell>
  );
});