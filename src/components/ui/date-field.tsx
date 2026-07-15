import type { InputHTMLAttributes } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; label: string; error?: string; hint?: string };

export function DateField({ id, label, error, hint = "A data será exibida no seu fuso horário local.", ...props }: DateFieldProps) {
  return <FormField error={error} hint={hint} id={id} label={label}><Input id={id} type="datetime-local" {...props} /></FormField>;
}
