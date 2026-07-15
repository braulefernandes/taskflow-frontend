import { ticketPriorities, ticketStatuses, type TicketListParams, type TicketListUrlFilters, type TicketPriority, type TicketStatus } from "@/types/tickets";

export type RawSearchParams = Record<string, string | string[] | undefined>;
export const defaultTicketFilters: TicketListUrlFilters = { page: 1, sort_by: "created_at", sort_order: "desc" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function oneOf<T extends string>(value: string | undefined, values: readonly T[]) { return value && values.includes(value as T) ? value as T : undefined; }
function validDate(value: string | undefined) { if (!value || !datePattern.test(value)) return undefined; const date = new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value; }

export function parseTicketFilters(raw: RawSearchParams): TicketListUrlFilters {
  const parsedPage = Number(first(raw.page));
  const search = first(raw.search)?.trim().slice(0, 255) || undefined;
  const status = oneOf<TicketStatus>(first(raw.status), ticketStatuses);
  const priority = oneOf<TicketPriority>(first(raw.priority), ticketPriorities);
  const category = first(raw.category);
  const assignee = first(raw.assignee);
  let createdFrom = validDate(first(raw.createdFrom));
  let createdTo = validDate(first(raw.createdTo));
  if (createdFrom && createdTo && createdFrom > createdTo) [createdFrom, createdTo] = [createdTo, createdFrom];
  const sortBy = oneOf(first(raw.sortBy), ["created_at", "due_date"] as const) ?? defaultTicketFilters.sort_by;
  const sortOrder = oneOf(first(raw.sortOrder), ["asc", "desc"] as const) ?? defaultTicketFilters.sort_order;
  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category && uuidPattern.test(category) ? { category_id: category } : {}),
    ...(assignee && uuidPattern.test(assignee) ? { assignee_id: assignee } : {}),
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdTo ? { createdTo } : {}),
    ...(first(raw.overdue) === "true" ? { overdue: true } : {}),
  };
}

export function ticketFiltersToApi(filters: TicketListUrlFilters): TicketListParams {
  return {
    page: filters.page,
    page_size: 20,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.assignee_id ? { assignee_id: filters.assignee_id } : {}),
    ...(filters.createdFrom ? { created_from: `${filters.createdFrom}T00:00:00.000Z` } : {}),
    ...(filters.createdTo ? { created_to: `${filters.createdTo}T23:59:59.999Z` } : {}),
    ...(filters.overdue ? { overdue: true } : {}),
  };
}

export function serializeTicketFilters(filters: TicketListUrlFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category_id) params.set("category", filters.category_id);
  if (filters.assignee_id) params.set("assignee", filters.assignee_id);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.overdue) params.set("overdue", "true");
  if (filters.sort_by !== "created_at") params.set("sortBy", filters.sort_by);
  if (filters.sort_order !== "desc") params.set("sortOrder", filters.sort_order);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function activeTicketFilterCount(filters: TicketListUrlFilters) {
  return [filters.search, filters.status, filters.priority, filters.category_id, filters.assignee_id, filters.createdFrom, filters.createdTo, filters.overdue].filter(Boolean).length;
}
