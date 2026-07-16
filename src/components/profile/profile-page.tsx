"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { useSession } from "@/providers/session-provider";
import { profileSchema, type ProfileFormValues } from "@/schemas/profile";
import { authMeQueryKey, updateOwnProfile } from "@/services/auth";
import type { MeResponse } from "@/types/auth";

const roleLabels: Record<MeResponse["membership"]["role"], string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  AGENT: "Agente",
  REQUESTER: "Solicitante",
};

function profileError(error: unknown) {
  if (isApiError(error) && (error.status === 422 || error.code === "validation_error")) return "Confira os dados informados e tente novamente.";
  if (error instanceof TypeError) return "Não foi possível conectar ao servidor.";
  return "Não foi possível atualizar o perfil. Tente novamente.";
}

export function ProfilePage() {
  const { session, updateSessionUser } = useSession();
  const client = useQueryClient();
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useAppForm(profileSchema, {
    defaultValues: { name: session?.user.name ?? "", avatar_url: session?.user.avatar_url ?? "" },
  });

  useEffect(() => {
    if (session) reset({ name: session.user.name, avatar_url: session.user.avatar_url ?? "" });
  }, [reset, session]);

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateOwnProfile({ name: values.name, avatar_url: values.avatar_url || null }),
    onSuccess: async (user) => {
      client.setQueryData(authMeQueryKey, { ...session, user });
      updateSessionUser(user);
      await client.invalidateQueries({ queryKey: authMeQueryKey, refetchType: "none" });
      reset({ name: user.name, avatar_url: user.avatar_url ?? "" });
      setSuccess(true);
    },
    onMutate: () => setSuccess(false),
  });

  if (!session) return <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" role="alert"><h1 className="text-xl font-bold">Sessão indisponivel</h1><p className="mt-2 text-sm">Entre novamente para visualizar seu perfil.</p></section>;

  return <section aria-labelledby="profile-title" className="mx-auto max-w-3xl space-y-6">
    <header><h1 className="text-2xl font-bold text-slate-950" id="profile-title">Meu perfil</h1><p className="mt-1 text-sm text-slate-600">Atualize seus dados pessoais. Dados administrativos são somente leitura.</p></header>
    {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Perfil atualizado com sucesso.</div> : null}
    <ErrorMessage message={mutation.error ? profileError(mutation.error) : undefined} />
    <form className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="profile-name" label="Nome" error={errors.name?.message}><Input autoComplete="name" disabled={mutation.isPending} id="profile-name" {...register("name")} /></FormField>
        <FormField id="profile-avatar" label="URL do avatar" hint="Use uma URL HTTP ou HTTPS. Deixe vazio para remover." error={errors.avatar_url?.message}><Input disabled={mutation.isPending} id="profile-avatar" inputMode="url" placeholder="https://exemplo.com/avatar.png" type="url" {...register("avatar_url")} /></FormField>
        <ReadOnly id="profile-email" label="E-mail" value={session.user.email} />
        <ReadOnly id="profile-organization" label="Organização" value={session.organization.name} />
        <ReadOnly id="profile-role" label="Papel" value={roleLabels[session.membership.role]} />
      </div>
      <div className="mt-6 flex justify-end"><Button disabled={mutation.isPending || !isDirty} type="submit">{mutation.isPending ? "Salvando..." : "Salvar alterações"}</Button></div>
    </form>
  </section>;
}

function ReadOnly({ id, label, value }: { id: string; label: string; value: string }) {
  return <FormField id={id} label={label}><Input aria-readonly="true" id={id} readOnly value={value} /></FormField>;
}
