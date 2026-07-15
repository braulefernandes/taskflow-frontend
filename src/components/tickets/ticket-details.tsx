"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { TicketAssignee } from "@/components/tickets/ticket-assignee";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/tickets/ticket-badges";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatDueDate, formatOverdue } from "@/lib/ticket-formatters";
import { useSession } from "@/providers/session-provider";
import { getTicket, ticketsQueryKey } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketSummary } from "@/types/tickets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section className={["rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6", className].filter(Boolean).join(" ")}><h2 className="text-lg font-bold text-slate-950">{title}</h2><div className="mt-4">{children}</div></section>;
}

function DateItem({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value ? formatDateTime(value) : "Não registrada"}</dd></div>;
}

type Action = "edit" | "assign" | "status" | "cancel";
const actionLabels: Record<Action, string> = { edit: "Editar", assign: "Atribuir responsável", status: "Alterar status", cancel: "Cancelar solicitação" };

export function availableTicketActions(ticket: TicketSummary, role: AuthMembership["role"], userId: string) {
  const terminal = ticket.status === "COMPLETED" || ticket.status === "CANCELLED";
  const actions: Action[] = [];
  if (role === "ADMIN" || role === "MANAGER") {
    if (ticket.status !== "CANCELLED") actions.push("edit");
    if (!terminal) actions.push("assign");
    if (ticket.status !== "CANCELLED") actions.push("status");
    if (!terminal) actions.push("cancel");
  } else if (role === "AGENT" && ticket.assignee?.id === userId && ticket.status !== "CANCELLED") {
    actions.push("status");
  } else if (role === "REQUESTER" && ticket.requester.id === userId && ticket.status === "PENDING" && !ticket.assignee) {
    actions.push("edit", "cancel");
  }
  return actions;
}

function errorContent(error: unknown) {
  if (isApiError(error) && error.status === 404) return { title: "Solicitação não encontrada", message: "Ela não existe ou não está disponível no seu escopo." };
  if (isApiError(error) && error.status === 403) return { title: "Acesso negado", message: "Você não possui permissão para visualizar esta solicitação." };
  if (error instanceof TypeError) return { title: "Sem conexão com o servidor", message: "Verifique sua conexão e tente novamente." };
  return { title: "Não foi possível carregar a solicitação", message: "Tente novamente em instantes." };
}

export function TicketDetails({ id }: { id: string }) {
  const validId = uuidPattern.test(id);
  const { session } = useSession();
  const query = useQuery({ queryKey: [...ticketsQueryKey, "detail", id], queryFn: ({ signal }) => getTicket(id, signal), enabled: validId });

  if (!validId) return <ErrorState action={<Button asChild variant="secondary"><Link href="/solicitacoes">Voltar para solicitações</Link></Button>} message="Confira o endereço informado." title="Identificador de solicitação inválido" />;
  if (query.isPending) return <div className="space-y-4"><Skeleton label="Carregando detalhes da solicitação" lines={4} /><Skeleton label="Carregando dados relacionados" lines={5} /></div>;
  if (query.isError) { const content = errorContent(query.error); return <ErrorState action={<div className="flex flex-wrap gap-3"><Button onClick={() => query.refetch()} type="button">Tentar novamente</Button><Button asChild variant="secondary"><Link href="/solicitacoes">Voltar</Link></Button></div>} message={content.message} title={content.title} />; }
  const ticket = query.data;
  const role = session?.membership.role ?? "REQUESTER";
  const userId = session?.user.id ?? "";
  const actions = availableTicketActions(ticket, role, userId);
  const overdue = ticket.is_overdue && ticket.status !== "COMPLETED" && ticket.status !== "CANCELLED";

  return <article className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><Link className="text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600" href="/solicitacoes">← Voltar para solicitações</Link><h1 className="mt-3 break-words text-2xl font-bold text-slate-950">{ticket.title}</h1><p className="mt-1 text-sm text-slate-500">Solicitação #{ticket.id}</p></div><div className="flex flex-wrap gap-2"><TicketStatusBadge status={ticket.status} /><TicketPriorityBadge priority={ticket.priority} /></div></header><div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]"><div className="space-y-6"><DetailSection title="Resumo"><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</dt><dd className="mt-1 font-medium text-slate-900">{ticket.category.name}</dd>{ticket.category.description ? <dd className="mt-1 text-sm text-slate-600">{ticket.category.description}</dd> : null}</div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organização</dt><dd className="mt-1 font-medium text-slate-900">{ticket.organization.name}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prazo</dt><dd className="mt-1 text-sm text-slate-900">{formatDueDate(ticket.due_date)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situação do prazo</dt><dd className="mt-1">{overdue ? <span aria-live="polite" className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-sm font-bold text-red-800" role="status"><span aria-hidden="true">!</span>Atrasada · {formatOverdue(ticket.overdue_seconds)}</span> : <span className="text-sm font-medium text-emerald-700">Em dia</span>}</dd></div></dl></DetailSection><DetailSection title="Descrição"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{ticket.description}</p></DetailSection><DetailSection title="Datas"><dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><DateItem label="Criada em" value={ticket.created_at} /><DateItem label="Atualizada em" value={ticket.updated_at} /><DateItem label="Iniciada em" value={ticket.started_at} /><DateItem label="Concluída em" value={ticket.completed_at} /><DateItem label="Cancelada em" value={ticket.cancelled_at} /><DateItem label="Prazo" value={ticket.due_date} /></dl></DetailSection></div><aside className="space-y-6"><DetailSection title="Responsáveis"><div className="space-y-5"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Solicitante</p><TicketAssignee assignee={ticket.requester} /></div><div className="border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Responsável</p><TicketAssignee assignee={ticket.assignee} /></div></div></DetailSection><DetailSection title="Ações"><div className="grid gap-2">{actions.length ? actions.map((action) => <Button asChild key={action} variant={action === "cancel" ? "secondary" : "primary"}><Link href={`/solicitacoes/${ticket.id}/${action}`}>{actionLabels[action]}</Link></Button>) : <p className="text-sm text-slate-600">Nenhuma ação disponível para seu papel e o estado atual.</p>}</div></DetailSection></aside></div></article>;
}
