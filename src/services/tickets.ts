import { httpClient } from "@/lib/http-client";
import type { TicketAssigneeUpdateRequest, TicketCreateRequest, TicketListParams, TicketListResponse, TicketStatusUpdateRequest, TicketSummary, TicketUpdateRequest } from "@/types/tickets";

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

export function updateTicketAssignee(id: string, assigneeId: string | null) {
  const body: TicketAssigneeUpdateRequest = { assignee_id: assigneeId };
  return httpClient<TicketSummary, TicketAssigneeUpdateRequest>(`/tickets/${id}/assignee`, { method: "PATCH", auth: true, body });
}

export function updateTicketStatus(id: string, status: TicketStatusUpdateRequest["status"]) {
  const body: TicketStatusUpdateRequest = { status };
  return httpClient<TicketSummary, TicketStatusUpdateRequest>(`/tickets/${id}/status`, { method: "PATCH", auth: true, body });
}

export function cancelTicket(id: string) {
  return httpClient<TicketSummary>(`/tickets/${id}/cancel`, { method: "POST", auth: true });
}
