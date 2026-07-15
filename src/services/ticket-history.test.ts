import { afterEach, describe, expect, it, vi } from "vitest";
import { listTicketHistory } from "@/services/ticket-history";

describe("ticket history service", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("consulta o histórico autenticado preservando a resposta", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const payload = [{ id: "event-1", action: "CREATED" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await expect(listTicketHistory("ticket-1", signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets/ticket-1/history", expect.objectContaining({ method: "GET", signal }));
  });
});
