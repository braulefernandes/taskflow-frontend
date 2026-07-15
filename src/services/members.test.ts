import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { createMember, listMembers, updateMemberRole, updateMemberStatus } from "@/services/members";

vi.mock("@/lib/http-client", () => ({ httpClient: vi.fn() }));

describe("members service", () => {
  beforeEach(() => vi.mocked(httpClient).mockReset());
  it("serializes every backend-supported listing filter", async () => { vi.mocked(httpClient).mockResolvedValueOnce({}); const signal = new AbortController().signal; await listMembers({ search: "ana", role: "AGENT", is_active: false, page: 2, page_size: 50 }, signal); expect(httpClient).toHaveBeenCalledWith("/members?search=ana&role=AGENT&is_active=false&page=2&page_size=50", { auth: true, signal }); });
  it("uses listing defaults without optional filters", async () => { vi.mocked(httpClient).mockResolvedValueOnce({}); await listMembers({}); expect(httpClient).toHaveBeenCalledWith("/members?page=1&page_size=20", { auth: true, signal: undefined }); });
  it("uses create, role and status contracts", async () => { vi.mocked(httpClient).mockResolvedValue({}); const payload = { name: "Ana", email: "ana@example.com", role: "AGENT" as const, temporary_password: "Senha123" }; await createMember(payload); await updateMemberRole("m1", "MANAGER"); await updateMemberStatus("m1", false); expect(httpClient).toHaveBeenNthCalledWith(1, "/members", { method: "POST", auth: true, body: payload }); expect(httpClient).toHaveBeenNthCalledWith(2, "/members/m1", { method: "PATCH", auth: true, body: { role: "MANAGER" } }); expect(httpClient).toHaveBeenNthCalledWith(3, "/members/m1/status", { method: "PATCH", auth: true, body: { is_active: false } }); });
});
