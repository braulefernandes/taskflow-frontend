import { TicketAssignee } from "@/components/tickets/ticket-assignee";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/tickets/ticket-badges";
import { formatDueDate } from "@/lib/ticket-formatters";
import type { TicketCardData } from "@/types/tickets";

export function TicketCard({ ticket, action }: { ticket: TicketCardData; action?: ReactNode }) {
  return <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-testid="ticket-card"><div className="flex flex-wrap items-center gap-2"><TicketStatusBadge status={ticket.status} /><TicketPriorityBadge priority={ticket.priority} /></div><h2 className="mt-4 line-clamp-2 text-base font-bold text-slate-950">{ticket.title}</h2>{ticket.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{ticket.description}</p> : null}<dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Categoria</dt><dd className="mt-0.5 text-slate-800">{ticket.category}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Solicitante</dt><dd className="mt-0.5 text-slate-800">{ticket.requester}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Prazo</dt><dd className={`mt-0.5 font-medium ${ticket.is_overdue ? "text-red-700" : "text-slate-800"}`}>{ticket.is_overdue ? <span className="sr-only">Atrasada. </span> : null}{formatDueDate(ticket.due_date)}</dd></div></dl><div className="mt-5 border-t border-slate-100 pt-4"><TicketAssignee assignee={ticket.assignee} /></div>{action ? <div className="mt-4">{action}</div> : null}</article>;
}
import type { ReactNode } from "react";
