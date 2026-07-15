"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { activeTicketFilterCount } from "@/lib/ticket-list-filters";
import { translateTicketPriority, translateTicketStatus } from "@/lib/ticket-formatters";
import { categoriesQueryKey, listActiveCategories } from "@/services/categories";
import { listMembers, membersQueryKey } from "@/services/members";
import type { AuthMembership } from "@/types/auth";
import { ticketPriorities, ticketStatuses, type TicketListUrlFilters } from "@/types/tickets";

type Props = {
  filters: TicketListUrlFilters;
  role: AuthMembership["role"];
  onChange: (patch: Partial<TicketListUrlFilters>) => void;
  onSearch: (search: string) => void;
  onClear: () => void;
};

const sortOptions = [
  { label: "Mais recentes", value: "created_at:desc" },
  { label: "Mais antigas", value: "created_at:asc" },
  { label: "Prazo mais próximo", value: "due_date:asc" },
  { label: "Prazo mais distante", value: "due_date:desc" },
];

export function TicketFilters({ filters, role, onChange, onSearch, onClear }: Props) {
  const [search, setSearch] = useState(filters.search ?? "");
  const activeCount = activeTicketFilterCount(filters);
  const categories = useQuery({ queryKey: [...categoriesQueryKey, "active"], queryFn: ({ signal }) => listActiveCategories(signal) });
  const canLoadMembers = role === "ADMIN" || role === "MANAGER";
  const members = useQuery({ queryKey: [...membersQueryKey, "eligible-assignees", "filters"], queryFn: ({ signal }) => listMembers({ is_active: true, page: 1, page_size: 100 }, signal), enabled: canLoadMembers });
  const eligible = (members.data?.items ?? []).filter((member) => member.is_active && member.role !== "REQUESTER");

  useEffect(() => {
    if (search.trim() === (filters.search ?? "")) return;
    const timer = window.setTimeout(() => onSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [filters.search, onSearch, search]);

  const sortValue = `${filters.sort_by}:${filters.sort_order}`;
  return <section aria-labelledby="ticket-filters-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-950" id="ticket-filters-title">Filtros</h2><p aria-live="polite" className="text-sm text-slate-600">{activeCount ? `${activeCount} ${activeCount === 1 ? "filtro ativo" : "filtros ativos"}` : "Nenhum filtro ativo"}</p></div><Button disabled={!activeCount} onClick={onClear} type="button" variant="secondary">Limpar filtros</Button></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-medium text-slate-800 sm:col-span-2">Buscar por título<div className="mt-1 flex gap-2"><Input aria-label="Buscar por título" maxLength={255} onChange={(event) => setSearch(event.target.value)} placeholder="Digite parte do título" value={search} />{search ? <button aria-label="Limpar busca" className="min-h-10 shrink-0 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50" onClick={() => { setSearch(""); onSearch(""); }} type="button">Limpar</button> : null}</div></label>
      <label className="text-sm font-medium text-slate-800">Status<Select className="mt-1" onChange={(event) => onChange({ status: event.target.value as TicketListUrlFilters["status"] || undefined })} options={[{ label: "Todos", value: "" }, ...ticketStatuses.map((status) => ({ label: translateTicketStatus(status), value: status }))]} value={filters.status ?? ""} /></label>
      <label className="text-sm font-medium text-slate-800">Prioridade<Select className="mt-1" onChange={(event) => onChange({ priority: event.target.value as TicketListUrlFilters["priority"] || undefined })} options={[{ label: "Todas", value: "" }, ...ticketPriorities.map((priority) => ({ label: translateTicketPriority(priority), value: priority }))]} value={filters.priority ?? ""} /></label>
      <label className="text-sm font-medium text-slate-800">Categoria<Select className="mt-1" disabled={categories.isPending || categories.isError} onChange={(event) => onChange({ category_id: event.target.value || undefined })} options={[{ label: categories.isPending ? "Carregando..." : "Todas", value: "" }, ...(categories.data ?? []).map((category) => ({ label: category.name, value: category.id }))]} value={filters.category_id ?? ""} /></label>
      <label className="text-sm font-medium text-slate-800">Responsável<Select className="mt-1" disabled={!canLoadMembers || members.isPending || members.isError} onChange={(event) => onChange({ assignee_id: event.target.value || undefined })} options={[{ label: canLoadMembers ? (members.isPending ? "Carregando..." : "Todos") : "Indisponível para seu papel", value: "" }, ...eligible.map((member) => ({ label: member.name, value: member.user_id }))]} value={filters.assignee_id ?? ""} /></label>
      <label className="text-sm font-medium text-slate-800">Criadas a partir de<Input className="mt-1" max={filters.createdTo} onChange={(event) => onChange({ createdFrom: event.target.value || undefined })} type="date" value={filters.createdFrom ?? ""} /></label>
      <label className="text-sm font-medium text-slate-800">Criadas até<Input className="mt-1" min={filters.createdFrom} onChange={(event) => onChange({ createdTo: event.target.value || undefined })} type="date" value={filters.createdTo ?? ""} /></label>
      <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"><input checked={Boolean(filters.overdue)} className="h-4 w-4" onChange={(event) => onChange({ overdue: event.target.checked || undefined })} type="checkbox" />Somente atrasadas</label>
      <label className="text-sm font-medium text-slate-800 lg:col-span-2">Ordenação<Select className="mt-1" onChange={(event) => { const [sort_by, sort_order] = event.target.value.split(":") as [TicketListUrlFilters["sort_by"], TicketListUrlFilters["sort_order"]]; onChange({ sort_by, sort_order }); }} options={sortOptions} value={sortValue} /></label>
    </div>
  </section>;
}
