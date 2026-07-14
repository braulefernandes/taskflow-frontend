"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/hooks/use-app-form";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/password-reset";
import { requestPasswordReset } from "@/services/password-reset";

const genericMessage = "Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha.";

export function ForgotPasswordForm() {
  const { register, handleSubmit, formState: { errors } } = useAppForm(forgotPasswordSchema, { defaultValues: { email: "" } });
  const mutation = useMutation({ mutationFn: (values: ForgotPasswordValues) => requestPasswordReset(values.email) });

  return <div className="mt-8">{mutation.isSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{genericMessage}</div> : <form className="space-y-5" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}><ErrorMessage message={mutation.error ? "Nao foi possivel enviar as instrucoes agora. Tente novamente." : undefined} /><FormField id="recovery-email" label="E-mail" error={errors.email?.message}><Input autoComplete="email" disabled={mutation.isPending} id="recovery-email" inputMode="email" type="email" {...register("email")} /></FormField><Button className="w-full" disabled={mutation.isPending} type="submit">{mutation.isPending ? "Enviando..." : "Enviar instrucoes"}</Button></form>}<p className="mt-6 text-center text-sm"><Link className="font-medium text-slate-950 underline" href="/login">Voltar ao login</Link></p></div>;
}
