export const ticketStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type TicketPriority = (typeof ticketPriorities)[number];

export type TicketAssignee = {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
};

export type TicketCardData = {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  requester: string;
  assignee?: TicketAssignee | null;
  due_date?: string | null;
  is_overdue?: boolean;
};
