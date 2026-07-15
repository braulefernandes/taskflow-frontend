import { translateTicketPriority, translateTicketStatus } from "@/lib/ticket-formatters";
import type { TicketPriority, TicketStatus } from "@/types/tickets";

const statusClasses: Record<TicketStatus, string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-800",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-800",
  WAITING: "border-amber-200 bg-amber-50 text-amber-900",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-red-200 bg-red-50 text-red-800",
};

const priorityClasses: Record<TicketPriority, string> = {
  LOW: "border-slate-300 bg-white text-slate-700",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-900",
  URGENT: "border-red-300 bg-red-50 text-red-900",
};

const badgeBase = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`${badgeBase} ${statusClasses[status]}`}><span aria-hidden="true">●</span>{translateTicketStatus(status)}</span>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`${badgeBase} ${priorityClasses[priority]}`}><span aria-hidden="true">◆</span>{translateTicketPriority(priority)}</span>;
}
