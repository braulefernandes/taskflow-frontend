import { httpClient } from "@/lib/http-client";
import type { TicketCreateRequest, TicketListParams, TicketListResponse, TicketSummary, TicketUpdateRequest } from "@/types/tickets";

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

export function createTicket(payload: TicketCreateRequest) {
  return httpClient<TicketSummary, TicketCreateRequest>("/tickets", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

export function getTicket(id: string, signal?: AbortSignal) {
  return httpClient<TicketSummary>(`/tickets/${id}`, { auth: true, signal });
}

export function updateTicket(id: string, payload: TicketUpdateRequest) {
  return httpClient<TicketSummary, TicketUpdateRequest>(`/tickets/${id}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}
