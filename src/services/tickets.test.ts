import { afterEach, describe, expect, it, vi } from "vitest";
import { listTickets } from "@/services/tickets";

describe("tickets service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consulta o contrato paginado autenticado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3100/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ page: 2, page_size: 20, total: 0, items: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await listTickets({ page: 2, page_size: 20 }, signal);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tickets?page=2&page_size=20"), expect.objectContaining({ method: "GET", signal }));
  });
});
