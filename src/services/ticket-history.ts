import { httpClient } from "@/lib/http-client";
import type { TicketHistoryEvent } from "@/types/ticket-history";

export const ticketHistoryQueryKey = (ticketId: string) => ["tickets", "detail", ticketId, "history"] as const;

export function listTicketHistory(ticketId: string, signal?: AbortSignal) {
  return httpClient<TicketHistoryEvent[]>(`/tickets/${ticketId}/history`, { auth: true, signal });
}
