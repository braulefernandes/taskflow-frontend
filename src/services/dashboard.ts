import { httpClient } from "@/lib/http-client";
import type { DashboardOverdueTicket, DashboardSummary, DashboardTicket, PriorityDistributionItem, StatusDistributionItem } from "@/types/dashboard";
export const dashboardSummaryQueryKey = ["dashboard", "summary"] as const;
export function getDashboardSummary(signal?: AbortSignal) { return httpClient<DashboardSummary>("/dashboard/summary", { auth: true, signal }); }
export const dashboardStatusQueryKey = ["dashboard", "status-distribution"] as const;
export const dashboardPriorityQueryKey = ["dashboard", "priority-distribution"] as const;
export const dashboardRecentQueryKey = ["dashboard", "recent"] as const;
export const dashboardOverdueQueryKey = ["dashboard", "overdue"] as const;
export function getDashboardStatusDistribution(signal?: AbortSignal) { return httpClient<StatusDistributionItem[]>("/dashboard/status-distribution", { auth: true, signal }); }
export function getDashboardPriorityDistribution(signal?: AbortSignal) { return httpClient<PriorityDistributionItem[]>("/dashboard/priority-distribution", { auth: true, signal }); }
export function getDashboardRecent(signal?: AbortSignal) { return httpClient<DashboardTicket[]>("/dashboard/recent?limit=5", { auth: true, signal }); }
export function getDashboardOverdue(signal?: AbortSignal) { return httpClient<DashboardOverdueTicket[]>("/dashboard/overdue?limit=5", { auth: true, signal }); }
