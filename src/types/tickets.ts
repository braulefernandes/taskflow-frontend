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
  overdue_seconds?: number;
  created_at?: string;
};

export type TicketSummary = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  organization: { id: string; name: string; slug: string };
  category: { id: string; name: string; description: string | null };
  requester: TicketAssignee;
  assignee: TicketAssignee | null;
  is_overdue: boolean;
  overdue_seconds: number;
};

export type TicketListResponse = {
  page: number;
  page_size: number;
  total: number;
  total_pages?: number;
  items: TicketSummary[];
};

export type TicketSortBy = "created_at" | "due_date";
export type TicketSortOrder = "asc" | "desc";
export type TicketListParams = {
  page: number;
  page_size: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category_id?: string;
  assignee_id?: string;
  created_from?: string;
  created_to?: string;
  overdue?: boolean;
  sort_by?: TicketSortBy;
  sort_order?: TicketSortOrder;
};

export type TicketListUrlFilters = Omit<TicketListParams, "page_size" | "created_from" | "created_to" | "sort_by" | "sort_order"> & {
  createdFrom?: string;
  createdTo?: string;
  sort_by: TicketSortBy;
  sort_order: TicketSortOrder;
};

export type TicketCreateRequest = {
  title: string;
  description: string;
  category_id: string;
  priority: TicketPriority;
  due_date: string | null;
};

export type TicketUpdateRequest = Partial<{
  title: string;
  description: string;
  category_id: string;
  priority: TicketPriority;
  due_date: string | null;
}>;

export type TicketAssigneeUpdateRequest = { assignee_id: string | null };
export type TicketStatusUpdateRequest = { status: TicketStatus };
