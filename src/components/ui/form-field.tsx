import { ErrorMessage } from "@/components/ui/error-message";
import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
};

export function FormField({
  id,
  label,
  children,
  error,
  hint,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      <ErrorMessage message={error} />
    </div>
  );
}
