import type { SelectHTMLAttributes } from "react";

export type SelectOption = { label: string; value: string; disabled?: boolean };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { options: readonly SelectOption[]; placeholder?: string };

export function Select({ className, options, placeholder, ...props }: SelectProps) {
  return <select className={["min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100", className].filter(Boolean).join(" ")} {...props}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}</select>;
}
