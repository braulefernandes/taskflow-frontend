import { afterEach, describe, expect, it, vi } from "vitest";
import { updateTicket } from "@/services/tickets";

describe("ticket update service", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("envia PATCH parcial autenticado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ticket-1" }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await updateTicket("ticket-1", { title: "Novo título" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets/ticket-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ title: "Novo título" }) }));
  });
});
