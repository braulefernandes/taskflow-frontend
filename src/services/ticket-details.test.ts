import { afterEach, describe, expect, it, vi } from "vitest";
import { getTicket } from "@/services/tickets";

describe("ticket detail service", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("consulta o detalhe autenticado pelo ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ticket-1" }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await getTicket("ticket-1", signal);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets/ticket-1", expect.objectContaining({ method: "GET", signal }));
  });
});
