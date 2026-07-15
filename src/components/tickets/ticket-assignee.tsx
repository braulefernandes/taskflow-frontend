import type { TicketAssignee as TicketAssigneeType } from "@/types/tickets";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");
}

export function TicketAssignee({ assignee, compact = false }: { assignee?: TicketAssigneeType | null; compact?: boolean }) {
  if (!assignee) return <span className="inline-flex items-center gap-2 text-sm text-slate-500"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full border border-dashed border-slate-300">?</span>Sem responsável</span>;
  return <span className="inline-flex min-w-0 items-center gap-2"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">{initials(assignee.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{assignee.name}</span>{!compact && assignee.email ? <span className="block truncate text-xs text-slate-500">{assignee.email}</span> : null}</span></span>;
}
