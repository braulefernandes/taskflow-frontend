import { httpClient } from "@/lib/http-client";
import type { TicketComment, TicketCommentCreateRequest } from "@/types/ticket-comments";
export const ticketCommentsQueryKey = (ticketId: string) => ["tickets", "detail", ticketId, "comments"] as const;
export function listTicketComments(ticketId: string, signal?: AbortSignal) { return httpClient<TicketComment[]>(`/tickets/${ticketId}/comments`, { auth: true, signal }); }
export function createTicketComment(ticketId: string, payload: TicketCommentCreateRequest) { return httpClient<TicketComment, TicketCommentCreateRequest>(`/tickets/${ticketId}/comments`, { method: "POST", auth: true, body: payload }); }
