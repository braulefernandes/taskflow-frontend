"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { resetPasswordSchema, type ResetPasswordValues } from "@/schemas/password-reset";
import { resetPassword } from "@/services/password-reset";

const redirectDelay = 900;
function resetError(error: unknown) {
  if (isApiError(error) && error.code === "invalid_reset_token") return "Este link e invalido, expirou ou ja foi utilizado. Solicite uma nova redefinicao.";
  return "Nao foi possivel redefinir a senha. Tente novamente.";
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { register, handleSubmit, reset, formState: { errors } } = useAppForm(resetPasswordSchema, { defaultValues: { newPassword: "", passwordConfirmation: "" } });
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) => resetPassword(token, values.newPassword),
    onSuccess: () => {
      reset();
      window.history.replaceState(null, "", "/redefinir-senha");
      window.setTimeout(() => router.replace("/login?senha_redefinida=true"), redirectDelay);
    },
  });

  if (!token) return <div className="mt-8"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">Token de redefinicao ausente. Solicite um novo link.</div><p className="mt-6 text-center text-sm"><Link className="font-medium underline" href="/recuperar-senha">Solicitar novo link</Link></p></div>;

  return <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>{mutation.isSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">Senha redefinida com sucesso. Redirecionando para o login.</div> : null}<ErrorMessage message={mutation.error ? resetError(mutation.error) : undefined} /><FormField id="new-password" label="Nova senha" hint="Use de 8 a 128 caracteres, com letras e numeros." error={errors.newPassword?.message}><Input autoComplete="new-password" disabled={mutation.isPending || mutation.isSuccess} id="new-password" type="password" {...register("newPassword")} /></FormField><FormField id="password-confirmation" label="Confirmacao da senha" error={errors.passwordConfirmation?.message}><Input autoComplete="new-password" disabled={mutation.isPending || mutation.isSuccess} id="password-confirmation" type="password" {...register("passwordConfirmation")} /></FormField><Button className="w-full" disabled={mutation.isPending || mutation.isSuccess} type="submit">{mutation.isPending ? "Redefinindo..." : "Redefinir senha"}</Button><p className="text-center text-sm"><Link className="font-medium underline" href="/login">Voltar ao login</Link></p></form>;
}
