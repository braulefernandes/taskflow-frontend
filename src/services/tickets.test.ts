import { afterEach, describe, expect, it, vi } from "vitest";
import { listTickets } from "@/services/tickets";

describe("tickets service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consulta o contrato paginado autenticado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3100/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ page: 2, page_size: 20, total: 0, items: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await listTickets({ page: 2, page_size: 20, search: "financeiro", status: "WAITING", priority: "HIGH", category_id: "cat", assignee_id: "user", created_from: "2026-07-01T00:00:00Z", created_to: "2026-07-31T23:59:59Z", overdue: true, sort_by: "due_date", sort_order: "asc" }, signal);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/tickets?");
    for (const value of ["page=2", "page_size=20", "search=financeiro", "status=WAITING", "priority=HIGH", "category_id=cat", "assignee_id=user", "created_from=2026-07-01T00%3A00%3A00Z", "created_to=2026-07-31T23%3A59%3A59Z", "overdue=true", "sort_by=due_date", "sort_order=asc"]) expect(url).toContain(value);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "GET", signal }));
  });
});
