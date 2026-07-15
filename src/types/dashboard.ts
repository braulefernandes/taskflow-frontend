export type DashboardSummary = { total: number; pending: number; in_progress: number; waiting: number; completed: number; cancelled: number; overdue: number; average_resolution_hours: number | null };

import type { TicketPriority, TicketStatus } from "@/types/tickets";
export type StatusDistributionItem = { status: TicketStatus; count: number };
export type PriorityDistributionItem = { priority: TicketPriority; count: number };
export type DashboardTicket = { id: string; title: string; status: TicketStatus; priority: TicketPriority; due_date: string | null; created_at: string; category: { id: string; name: string }; assignee: { id: string; name: string } | null };
export type DashboardOverdueTicket = DashboardTicket & { overdue_seconds: number };
