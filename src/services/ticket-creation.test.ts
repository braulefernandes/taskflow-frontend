import { afterEach, describe, expect, it, vi } from "vitest";
import { listActiveCategories } from "@/services/categories";
import { createTicket } from "@/services/tickets";

describe("ticket creation services", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("consulta categorias ativas sem include_inactive", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await listActiveCategories();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/v1/categories");
  });

  it("faz POST usando somente o payload recebido", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ticket-1" }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const payload = { title: "Título", description: "Descrição", category_id: "cat-1", priority: "MEDIUM" as const, due_date: null };
    await createTicket(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets", expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }));
  });
});
