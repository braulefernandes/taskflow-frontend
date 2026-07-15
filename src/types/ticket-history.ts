export const ticketHistoryActions = [
  "CREATED",
  "TITLE_CHANGED",
  "DESCRIPTION_CHANGED",
  "CATEGORY_CHANGED",
  "PRIORITY_CHANGED",
  "DUE_DATE_CHANGED",
  "ASSIGNED",
  "ASSIGNEE_CHANGED",
  "ASSIGNEE_REMOVED",
  "STATUS_CHANGED",
  "COMPLETED",
  "REOPENED",
  "CANCELLED",
] as const;

export type TicketHistoryAction = (typeof ticketHistoryActions)[number];

export type TicketHistoryEvent = {
  id: string;
  action: TicketHistoryAction;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  author: { id: string; name: string; avatar_url: string | null };
  created_at: string;
};
