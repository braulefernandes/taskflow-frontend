import { httpClient } from "@/lib/http-client";
import type { Member, MemberCreateRequest, MemberFilters, MemberList, MemberRole } from "@/types/members";

export const membersQueryKey = ["members"] as const;
export function listMembers(filters: MemberFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active));
  params.set("page", String(filters.page ?? 1));
  params.set("page_size", String(filters.page_size ?? 20));
  return httpClient<MemberList>(`/members?${params.toString()}`, { auth: true, signal });
}
export function createMember(payload: MemberCreateRequest) { return httpClient<Member, MemberCreateRequest>("/members", { method: "POST", auth: true, body: payload }); }
export function updateMemberRole(id: string, role: MemberRole) { return httpClient<Member, { role: MemberRole }>(`/members/${id}`, { method: "PATCH", auth: true, body: { role } }); }
export function updateMemberStatus(id: string, is_active: boolean) { return httpClient<Member, { is_active: boolean }>(`/members/${id}/status`, { method: "PATCH", auth: true, body: { is_active } }); }
