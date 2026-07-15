"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { useSession } from "@/providers/session-provider";
import { categorySchema, type CategoryFormValues } from "@/schemas/category";
import { categoriesQueryKey, createCategory, listCategories, updateCategory, updateCategoryStatus } from "@/services/categories";
import type { Category } from "@/types/categories";

type StatusFilter = "all" | "active" | "inactive";

function apiError(error: unknown) {
  if (isApiError(error) && error.code === "category_already_exists") return "Ja existe uma categoria com este nome.";
  if (error instanceof TypeError) return "Nao foi possivel conectar ao servidor.";
  return "Nao foi possivel concluir a operacao. Tente novamente.";
}

export function CategoriesPage() {
  const { session } = useSession();
  if (session?.membership.role !== "ADMIN") return <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" role="alert"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-sm">Apenas administradores podem gerenciar categorias.</p></section>;
  return <CategoriesManagement />;
}

function CategoriesManagement() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [feedback, setFeedback] = useState<string>();
  const query = useQuery({ queryKey: categoriesQueryKey, queryFn: ({ signal }) => listCategories(signal) });
  const visible = useMemo(() => (query.data ?? []).filter((category) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !term || category.name.toLocaleLowerCase("pt-BR").includes(term) || category.description?.toLocaleLowerCase("pt-BR").includes(term);
    const matchesStatus = status === "all" || (status === "active" ? category.is_active : !category.is_active);
    return matchesSearch && matchesStatus;
  }), [query.data, search, status]);

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateCategoryStatus(id, active),
    onMutate: async ({ id, active }) => {
      await client.cancelQueries({ queryKey: categoriesQueryKey });
      const previous = client.getQueryData<Category[]>(categoriesQueryKey);
      client.setQueryData<Category[]>(categoriesQueryKey, (old) => old?.map((item) => item.id === id ? { ...item, is_active: active } : item));
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(categoriesQueryKey, context?.previous),
    onSuccess: (updated) => {
      client.setQueryData<Category[]>(categoriesQueryKey, (old) => old?.map((item) => item.id === updated.id ? updated : item));
      setFeedback(`Categoria ${updated.name} ${updated.is_active ? "ativada" : "desativada"}.`);
    },
    onSettled: () => client.invalidateQueries({ queryKey: categoriesQueryKey, refetchType: "none" }),
  });

  return <section aria-labelledby="categories-title" className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold" id="categories-title">Categorias</h1><p className="mt-1 text-sm text-slate-600">Organize os tipos de solicitacao da sua organizacao.</p></div><Button onClick={() => setEditing(null)} type="button">Nova categoria</Button></header>
    {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{feedback}</div> : null}
    <ErrorMessage message={statusMutation.error ? apiError(statusMutation.error) : undefined} />
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Buscar<Input aria-label="Buscar categorias" className="mt-1" onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou descricao" value={search} /></label><label className="text-sm font-medium">Status<select aria-label="Filtrar por status" className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}><option value="all">Todos</option><option value="active">Ativas</option><option value="inactive">Inativas</option></select></label></div>
    {query.isPending ? <div className="rounded-xl border bg-white p-10"><Loading label="Carregando categorias" /></div> : null}
    {query.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert"><p>Nao foi possivel carregar as categorias.</p><Button className="mt-3" onClick={() => query.refetch()} type="button">Tentar novamente</Button></div> : null}
    {query.data && visible.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-10 text-center"><p className="font-medium">Nenhuma categoria encontrada</p><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou crie uma nova categoria.</p></div> : null}
    {visible.length > 0 ? <CategoriesTable categories={visible} busyId={statusMutation.variables?.id} edit={setEditing} toggle={(category) => { setFeedback(undefined); const action = category.is_active ? "desativar" : "ativar"; if (window.confirm(`Deseja ${action} a categoria ${category.name}?`)) statusMutation.mutate({ id: category.id, active: !category.is_active }); }} /> : null}
    {editing !== undefined ? <CategoryModal category={editing} close={() => setEditing(undefined)} success={(message) => { setFeedback(message); setEditing(undefined); }} /> : null}
  </section>;
}

function CategoriesTable({ categories, busyId, edit, toggle }: { categories: Category[]; busyId?: string; edit: (category: Category) => void; toggle: (category: Category) => void }) {
  return <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Nome", "Descricao", "Status", "Criada em", "Acoes"].map((title) => <th className="px-4 py-3" key={title}>{title}</th>)}</tr></thead><tbody className="divide-y">{categories.map((category) => <tr key={category.id}><td className="px-4 py-3 font-medium">{category.name}</td><td className="max-w-sm px-4 py-3 text-slate-600">{category.description || "Sem descricao"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{category.is_active ? "Ativa" : "Inativa"}</span></td><td className="px-4 py-3 text-slate-600">{new Intl.DateTimeFormat("pt-BR").format(new Date(category.created_at))}</td><td className="px-4 py-3"><div className="flex gap-1"><button className="min-h-9 rounded-md px-3 font-medium text-indigo-700 hover:bg-indigo-50" disabled={busyId === category.id} onClick={() => edit(category)} type="button">Editar</button><button className={`min-h-9 rounded-md px-3 font-medium ${category.is_active ? "text-red-700 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`} disabled={busyId === category.id} onClick={() => toggle(category)} type="button">{category.is_active ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table></div></div>;
}

function CategoryModal({ category, close, success }: { category: Category | null; close: () => void; success: (message: string) => void }) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, formState: { errors } } = useAppForm(categorySchema, { defaultValues: { name: category?.name ?? "", description: category?.description ?? "" } });
  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = { name: values.name, description: values.description || null };
      return category ? updateCategory(category.id, payload) : createCategory(payload);
    },
    onSuccess: (saved) => {
      client.setQueryData<Category[]>(categoriesQueryKey, (old = []) => [...old.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      client.invalidateQueries({ queryKey: categoriesQueryKey, refetchType: "none" });
      success(category ? `Categoria ${saved.name} atualizada.` : `Categoria ${saved.name} criada.`);
    },
    onError: (error) => { if (isApiError(error) && error.code === "category_already_exists") setError("name", { type: "server", message: "Ja existe uma categoria com este nome." }); },
  });
  return <Modal onClose={mutation.isPending ? () => undefined : close} title={category ? "Editar categoria" : "Nova categoria"}><form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}><ErrorMessage message={mutation.error ? apiError(mutation.error) : undefined} /><FormField id="category-name" label="Nome" error={errors.name?.message}><Input autoFocus disabled={mutation.isPending} id="category-name" {...register("name")} /></FormField><FormField id="category-description" label="Descricao" hint="Opcional, ate 2000 caracteres." error={errors.description?.message}><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200" disabled={mutation.isPending} id="category-description" {...register("description")} /></FormField><div className="flex justify-end gap-3 pt-2"><Button disabled={mutation.isPending} onClick={close} type="button">Cancelar</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Salvando..." : "Salvar categoria"}</Button></div></form></Modal>;
}
