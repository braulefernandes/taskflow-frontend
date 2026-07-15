import { httpClient } from "@/lib/http-client";
import type { TicketListParams, TicketListResponse } from "@/types/tickets";

export const ticketsQueryKey = ["tickets"] as const;

export function listTickets(params: TicketListParams, signal?: AbortSignal) {
  const search = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  return httpClient<TicketListResponse>(`/tickets?${search.toString()}`, {
    auth: true,
    signal,
  });
}
