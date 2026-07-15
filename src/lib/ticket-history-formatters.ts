import { formatDateTime, translateTicketPriority, translateTicketStatus } from "@/lib/ticket-formatters";
import type { TicketHistoryAction, TicketHistoryEvent } from "@/types/ticket-history";
import type { TicketPriority, TicketStatus } from "@/types/tickets";

const actionLabels: Record<TicketHistoryAction, string> = {
  CREATED: "Solicitação criada",
  TITLE_CHANGED: "Título alterado",
  DESCRIPTION_CHANGED: "Descrição alterada",
  CATEGORY_CHANGED: "Categoria alterada",
  PRIORITY_CHANGED: "Prioridade alterada",
  DUE_DATE_CHANGED: "Prazo alterado",
  ASSIGNED: "Responsável atribuído",
  ASSIGNEE_CHANGED: "Responsável alterado",
  ASSIGNEE_REMOVED: "Responsável removido",
  STATUS_CHANGED: "Status alterado",
  COMPLETED: "Solicitação concluída",
  REOPENED: "Solicitação reaberta",
  CANCELLED: "Solicitação cancelada",
};

const statuses = new Set<TicketStatus>(["PENDING", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]);
const priorities = new Set<TicketPriority>(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export function translateHistoryAction(action: TicketHistoryAction) {
  return actionLabels[action];
}

function entityName(value: string) {
  const separator = value.indexOf(" | ");
  return separator >= 0 ? value.slice(separator + 3) : value;
}

export function formatHistoryValue(event: TicketHistoryEvent, value: string | null) {
  if (event.action === "DUE_DATE_CHANGED") return value ? formatDateTime(value) : "Sem prazo";
  if (["ASSIGNED", "ASSIGNEE_CHANGED", "ASSIGNEE_REMOVED"].includes(event.action)) return value ? entityName(value) : "Sem responsável";
  if (event.action === "CATEGORY_CHANGED") return value ? entityName(value) : "Sem categoria";
  if (event.action === "PRIORITY_CHANGED" && value && priorities.has(value as TicketPriority)) return translateTicketPriority(value as TicketPriority);
  if (["STATUS_CHANGED", "COMPLETED", "REOPENED", "CANCELLED"].includes(event.action) && value && statuses.has(value as TicketStatus)) return translateTicketStatus(value as TicketStatus);
  return value ?? "Não informado";
}

export function describeHistoryEvent(event: TicketHistoryEvent) {
  const label = translateHistoryAction(event.action);
  if (event.action === "CREATED") return label;
  return `${label} de ${formatHistoryValue(event, event.old_value)} para ${formatHistoryValue(event, event.new_value)}`;
}
