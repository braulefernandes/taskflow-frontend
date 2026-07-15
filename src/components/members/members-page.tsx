"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { useSession } from "@/providers/session-provider";
import { memberSchema, type MemberFormValues } from "@/schemas/member";
import { createMember, listMembers, membersQueryKey, updateMemberRole, updateMemberStatus } from "@/services/members";
import type { Member, MemberFilters, MemberList, MemberRole } from "@/types/members";

const roles: MemberRole[] = ["ADMIN", "MANAGER", "AGENT", "REQUESTER"];
const labels: Record<MemberRole, string> = { ADMIN: "Administrador", MANAGER: "Gerente", AGENT: "Agente", REQUESTER: "Solicitante" };
const defaults: MemberFormValues = { name: "", email: "", role: "AGENT", temporary_password: "" };

function errorMessage(error: unknown) {
  if (isApiError(error) && error.code === "last_active_admin") return "A organizacao deve manter ao menos um administrador ativo.";
  if (isApiError(error) && error.code === "membership_already_exists") return "Este e-mail ja pertence a organizacao.";
  if (error instanceof TypeError) return "Nao foi possivel conectar ao servidor.";
  return "Nao foi possivel concluir a operacao. Tente novamente.";
}

export function MembersPage() {
  const { session } = useSession();
  if (session?.membership.role !== "ADMIN") return <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" role="alert"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-sm">Apenas administradores podem gerenciar membros.</p></section>;
  return <MembersManagement />;
}

function MembersManagement() {
  const client = useQueryClient();
  const [filters, setFilters] = useState<MemberFilters>({ page: 1, page_size: 20 });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const query = useQuery({ queryKey: [...membersQueryKey, filters], queryFn: ({ signal }) => listMembers(filters, signal) });

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, search: search.trim() || undefined, page: 1 })), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const patchMember = (member: Member) => client.setQueriesData<MemberList>({ queryKey: membersQueryKey }, (old) => old ? { ...old, items: old.items.map((item) => item.id === member.id ? member : item) } : old);
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: MemberRole }) => updateMemberRole(id, role),
    onSuccess: (member) => { patchMember(member); setFeedback(`Papel de ${member.name} atualizado.`); },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateMemberStatus(id, active),
    onMutate: async ({ id, active }) => {
      await client.cancelQueries({ queryKey: membersQueryKey });
      const snapshots = client.getQueriesData<MemberList>({ queryKey: membersQueryKey });
      client.setQueriesData<MemberList>({ queryKey: membersQueryKey }, (old) => old ? { ...old, items: old.items.map((item) => item.id === id ? { ...item, is_active: active } : item) } : old);
      return { snapshots };
    },
    onError: (_error, _variables, context) => context?.snapshots.forEach(([key, data]) => client.setQueryData(key, data)),
    onSuccess: (member) => { patchMember(member); setFeedback(`Membro ${member.name} ${member.is_active ? "ativado" : "desativado"}.`); },
    onSettled: () => client.invalidateQueries({ queryKey: membersQueryKey }),
  });
  const actionError = roleMutation.error ?? statusMutation.error;

  return <section aria-labelledby="members-title" className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold" id="members-title">Membros</h1><p className="mt-1 text-sm text-slate-600">Gerencie o acesso da sua organizacao.</p></div><Button onClick={() => setFormOpen(!formOpen)} type="button">{formOpen ? "Fechar formulario" : "Novo membro"}</Button></header>
    {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{feedback}</div> : null}
    <ErrorMessage message={actionError ? errorMessage(actionError) : undefined} />
    {formOpen ? <NewMemberForm close={() => setFormOpen(false)} feedback={setFeedback} /> : null}
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Buscar<Input aria-label="Buscar membros" className="mt-1" onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou e-mail" value={search} /></label>
      <Filter label="Papel" ariaLabel="Filtrar por papel" onChange={(value) => setFilters((current) => ({ ...current, role: (value || undefined) as MemberRole | undefined, page: 1 }))} options={roles.map((role) => [role, labels[role]])} />
      <Filter label="Status" ariaLabel="Filtrar por status" onChange={(value) => setFilters((current) => ({ ...current, is_active: value === "" ? undefined : value === "true", page: 1 }))} options={[["true", "Ativos"], ["false", "Inativos"]]} />
    </div>
    {query.isPending ? <div className="rounded-xl border bg-white p-10"><Loading label="Carregando membros" /></div> : null}
    {query.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert"><p>Nao foi possivel carregar os membros.</p><Button className="mt-3" onClick={() => query.refetch()} type="button">Tentar novamente</Button></div> : null}
    {query.data?.items.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-10 text-center"><p className="font-medium">Nenhum membro encontrado</p><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou adicione um novo membro.</p></div> : null}
    {query.data?.items.length ? <MembersTable data={query.data} busyId={(roleMutation.variables ?? statusMutation.variables)?.id} page={(page) => setFilters((current) => ({ ...current, page }))} role={(member, role) => { setFeedback(undefined); if (window.confirm(`Alterar o papel de ${member.name} para ${labels[role]}?`)) roleMutation.mutate({ id: member.id, role }); }} status={(member) => { setFeedback(undefined); const action = member.is_active ? "desativar" : "ativar"; if (window.confirm(`Deseja ${action} ${member.name}?`)) statusMutation.mutate({ id: member.id, active: !member.is_active }); }} /> : null}
  </section>;
}

function Filter({ label, ariaLabel, options, onChange }: { label: string; ariaLabel: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium">{label}<select aria-label={ariaLabel} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3" onChange={(event) => onChange(event.target.value)}><option value="">Todos</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}

function NewMemberForm({ close, feedback }: { close: () => void; feedback: (value: string) => void }) {
  const client = useQueryClient();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useAppForm(memberSchema, { defaultValues: defaults });
  const mutation = useMutation({
    mutationFn: createMember,
    onSuccess: async (member) => { await client.invalidateQueries({ queryKey: membersQueryKey }); reset(); feedback(`${member.name} foi adicionado.`); close(); },
    onError: (error) => { if (isApiError(error) && error.code === "membership_already_exists") setError("email", { type: "server", message: "Este e-mail ja pertence a organizacao." }); },
  });
  return <form className="rounded-xl border bg-white p-4 sm:p-6" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}><h2 className="text-lg font-bold">Adicionar membro</h2><ErrorMessage message={mutation.error ? errorMessage(mutation.error) : undefined} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField id="member-name" label="Nome" error={errors.name?.message}><Input id="member-name" disabled={mutation.isPending} {...register("name")} /></FormField><FormField id="member-email" label="E-mail" error={errors.email?.message}><Input id="member-email" type="email" disabled={mutation.isPending} {...register("email")} /></FormField><FormField id="member-role" label="Papel" error={errors.role?.message}><select id="member-role" className="min-h-11 w-full rounded-lg border px-3" disabled={mutation.isPending} {...register("role")}>{roles.map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select></FormField><FormField id="member-password" label="Senha temporaria" hint="8 a 128 caracteres, com letras e numeros." error={errors.temporary_password?.message}><Input id="member-password" type="password" disabled={mutation.isPending} {...register("temporary_password")} /></FormField></div><div className="mt-5 flex justify-end gap-3"><Button disabled={mutation.isPending} onClick={close} type="button">Cancelar</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Adicionando..." : "Adicionar membro"}</Button></div></form>;
}

function MembersTable({ data, busyId, role, status, page }: { data: MemberList; busyId?: string; role: (member: Member, role: MemberRole) => void; status: (member: Member) => void; page: (page: number) => void }) {
  const pages = Math.ceil(data.total / data.page_size);
  return <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Nome", "E-mail", "Papel", "Status", "Entrada", "Acoes"].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y">{data.items.map((member) => <tr key={member.id}><td className="px-4 py-3 font-medium">{member.name}</td><td className="px-4 py-3">{member.email}</td><td className="px-4 py-3"><select aria-label={`Papel de ${member.name}`} className="min-h-9 rounded-md border px-2" disabled={busyId === member.id} onChange={(event) => role(member, event.target.value as MemberRole)} value={member.role}>{roles.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"}`}>{member.is_active ? "Ativo" : "Inativo"}</span></td><td className="px-4 py-3">{new Intl.DateTimeFormat("pt-BR").format(new Date(member.created_at))}</td><td className="px-4 py-3"><button className={member.is_active ? "min-h-9 px-3 text-red-700" : "min-h-9 px-3 text-emerald-700"} disabled={busyId === member.id} onClick={() => status(member)} type="button">{member.is_active ? "Desativar" : "Ativar"}</button></td></tr>)}</tbody></table></div>{pages > 1 ? <div className="flex items-center justify-between border-t px-4 py-3"><span>Pagina {data.page} de {pages}</span><div className="flex gap-2"><Button disabled={data.page <= 1} onClick={() => page(data.page - 1)} type="button">Anterior</Button><Button disabled={data.page >= pages} onClick={() => page(data.page + 1)} type="button">Proxima</Button></div></div> : null}</div>;
}
