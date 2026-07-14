import type { AuthMembership } from "@/types/auth";

export type MemberRole = AuthMembership["role"];
export type Member = { id: string; user_id: string; name: string; email: string; role: MemberRole; is_active: boolean; created_at: string; updated_at: string };
export type MemberList = { items: Member[]; total: number; page: number; page_size: number };
export type MemberFilters = { search?: string; role?: MemberRole; is_active?: boolean; page?: number; page_size?: number };
export type MemberCreateRequest = { name: string; email: string; role: MemberRole; temporary_password: string };
