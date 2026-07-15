"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { TicketAssignee } from "@/components/tickets/ticket-assignee";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/tickets/ticket-badges";
import { TicketCard } from "@/components/tickets/ticket-card";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { TicketCardSkeleton } from "@/components/ui/skeleton";
import { activeTicketFilterCount, defaultTicketFilters, serializeTicketFilters, ticketFiltersToApi } from "@/lib/ticket-list-filters";
import { formatDateTime, formatDueDate, formatOverdue } from "@/lib/ticket-formatters";
import { useSession } from "@/providers/session-provider";
import { listTickets, ticketsQueryKey } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketListUrlFilters, TicketSummary } from "@/types/tickets";

const pageCopy: Record<AuthMembership["role"], { title: string; description: string }> = {
  ADMIN: { title: "Todas as solicitações", description: "Acompanhe as solicitações da organização." },
  MANAGER: { title: "Todas as solicitações", description: "Acompanhe as solicitações da organização." },
  AGENT: { title: "Solicitações atribuídas", description: "Veja solicitações atribuídas a você ou abertas por você." },
  REQUESTER: { title: "Minhas solicitações", description: "Acompanhe as solicitações abertas por você." },
};

function Overdue({ ticket }: { ticket: TicketSummary }) {
  const overdue = ticket.is_overdue && ticket.status !== "COMPLETED" && ticket.status !== "CANCELLED";
  if (!overdue) return <span className="text-slate-500">Em dia</span>;
  return <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800"><span aria-hidden="true">!</span>Atrasada{ticket.overdue_seconds > 0 ? ` · ${formatOverdue(ticket.overdue_seconds)}` : ""}</span>;
}

function ticketCardData(ticket: TicketSummary) {
  return { id: ticket.id, title: ticket.title, description: ticket.description, status: ticket.status, priority: ticket.priority, category: ticket.category.name, requester: ticket.requester.name, assignee: ticket.assignee, due_date: ticket.due_date, is_overdue: ticket.is_overdue, overdue_seconds: ticket.overdue_seconds, created_at: ticket.created_at };
}

export function TicketsPage({ initialPage = 1, initialFilters }: { initialPage?: number; initialFilters?: TicketListUrlFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const role = session?.membership.role ?? "REQUESTER";
  const copy = pageCopy[role];
  const filters = useMemo(() => initialFilters ?? { ...defaultTicketFilters, page: initialPage }, [initialFilters, initialPage]);
  const apiFilters = ticketFiltersToApi(filters);
  const query = useQuery({ queryKey: [...ticketsQueryKey, apiFilters], queryFn: ({ signal }) => listTickets(apiFilters, signal), placeholderData: keepPreviousData });

  const columns = useMemo<DataTableColumn<TicketSummary>[]>(() => {
    const values: DataTableColumn<TicketSummary>[] = [
      { key: "title", header: "Título", cell: (ticket) => <Link className="font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600" href={`/solicitacoes/${ticket.id}`}>{ticket.title}</Link> },
      { key: "category", header: "Categoria", cell: (ticket) => ticket.category.name },
      { key: "priority", header: "Prioridade", cell: (ticket) => <TicketPriorityBadge priority={ticket.priority} /> },
      { key: "status", header: "Status", cell: (ticket) => <TicketStatusBadge status={ticket.status} /> },
      { key: "assignee", header: "Responsável", cell: (ticket) => <TicketAssignee assignee={ticket.assignee} compact /> },
    ];
    if (role !== "REQUESTER") values.push({ key: "requester", header: "Solicitante", cell: (ticket) => ticket.requester.name });
    values.push({ key: "due", header: "Prazo", cell: (ticket) => formatDueDate(ticket.due_date) }, { key: "overdue", header: "Atraso", cell: (ticket) => <Overdue ticket={ticket} /> }, { key: "created", header: "Criação", cell: (ticket) => formatDateTime(ticket.created_at) });
    return values;
  }, [role]);

  const urlFor = useCallback((next: TicketListUrlFilters) => { const queryString = serializeTicketFilters(next); return queryString ? `${pathname}?${queryString}` : pathname; }, [pathname]);
  const changeFilters = useCallback((patch: Partial<TicketListUrlFilters>) => router.push(urlFor({ ...filters, ...patch, page: 1 }), { scroll: false }), [filters, router, urlFor]);
  const changeSearch = useCallback((search: string) => router.replace(urlFor({ ...filters, search: search || undefined, page: 1 }), { scroll: false }), [filters, router, urlFor]);
  const changePage = (page: number) => router.push(urlFor({ ...filters, page }));
  const activeFilters = activeTicketFilterCount(filters);

  return <section aria-labelledby="tickets-title" className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-950" id="tickets-title">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{copy.description}</p></div><Button asChild><Link href="/solicitacoes/nova">Nova solicitação</Link></Button></header>
    <TicketFilters filters={filters} key={serializeTicketFilters(filters)} onChange={changeFilters} onClear={() => router.push(pathname)} onSearch={changeSearch} role={role} />
    {query.isPending ? <TicketCardSkeleton /> : null}
    {query.isError ? <ErrorState action={<Button onClick={() => query.refetch()} type="button">Tentar novamente</Button>} message="Verifique sua conexão e tente novamente." title="Não foi possível carregar as solicitações" /> : null}
    {query.data?.items.length === 0 ? <EmptyState action={activeFilters ? <Button onClick={() => router.push(pathname)} type="button" variant="secondary">Limpar filtros</Button> : <Button asChild><Link href="/solicitacoes/nova">Criar solicitação</Link></Button>} description={activeFilters ? "Tente remover ou ajustar os filtros aplicados." : "Quando houver solicitações no seu escopo, elas aparecerão aqui."} title={activeFilters ? "Nenhum resultado para os filtros" : "Nenhuma solicitação encontrada"} /> : null}
    {query.data?.items.length ? <div aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60" : undefined}><div className="hidden md:block"><DataTable caption="Lista de solicitações" columns={columns} getRowKey={(ticket) => ticket.id} minimumWidth="1100px" rows={query.data.items} /></div><div className="grid gap-4 md:hidden">{query.data.items.map((ticket) => <TicketCard action={<Link className="inline-flex min-h-10 items-center font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600" href={`/solicitacoes/${ticket.id}`}>Ver detalhes</Link>} key={ticket.id} showRequester={role !== "REQUESTER"} ticket={ticketCardData(ticket)} />)}</div><Pagination onPageChange={changePage} page={query.data.page} pageSize={query.data.page_size} total={query.data.total} /></div> : null}
  </section>;
}
