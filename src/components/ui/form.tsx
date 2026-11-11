import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const control =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
  required,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800",
      )}
    >
      {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{state.ok ? state.message : state.error}</span>
    </div>
  );
}
