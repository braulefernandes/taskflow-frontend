import type { TicketPriority, TicketStatus } from "@/types/tickets";

const statusLabels: Record<TicketStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando retorno",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const priorityLabels: Record<TicketPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function translateTicketStatus(status: TicketStatus) {
  return statusLabels[status];
}

export function translateTicketPriority(priority: TicketPriority) {
  return priorityLabels[priority];
}

type DateInput = string | Date;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function asDate(value: DateInput) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: DateInput) {
  const date = asDate(value);
  return date ? dateFormatter.format(date) : "Data inválida";
}

export function formatDateTime(value: DateInput) {
  const date = asDate(value);
  return date ? dateTimeFormatter.format(date) : "Data inválida";
}

export function formatDueDate(value?: DateInput | null, now = new Date()) {
  if (!value) return "Sem prazo";
  const date = asDate(value);
  if (!date) return "Prazo inválido";
  const prefix = date.getTime() < now.getTime() ? "Venceu em" : "Prazo";
  return `${prefix}: ${formatDateTime(date)}`;
}

export function formatOverdue(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (days) return `${days}d ${hours}h em atraso`;
  if (hours) return `${hours}h ${minutes}min em atraso`;
  return `${minutes}min em atraso`;
}

export function getDisplayTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
