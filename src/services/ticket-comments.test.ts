import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicketComment, listTicketComments } from "@/services/ticket-comments";

describe("ticket comments service", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("lista comentários autenticados do ticket", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await listTicketComments("ticket-1", signal);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets/ticket-1/comments", expect.objectContaining({ method: "GET", signal }));
  });

  it("cria comentário enviando somente conteúdo", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "comment-1" }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await createTicketComment("ticket-1", { content: "Comentário" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/tickets/ticket-1/comments", expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "Comentário" }) }));
  });
});
