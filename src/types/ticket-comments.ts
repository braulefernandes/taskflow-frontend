export type TicketCommentAuthor = { id: string; name: string; avatar_url: string | null };
export type TicketComment = { id: string; ticket_id: string; content: string; author: TicketCommentAuthor; created_at: string; updated_at: string };
export type TicketCommentCreateRequest = { content: string };
