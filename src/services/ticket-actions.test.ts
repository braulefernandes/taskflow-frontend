import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelTicket, updateTicketAssignee, updateTicketStatus } from "@/services/tickets";

describe("contratos das ações de tickets", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("usa endpoints e payloads formais", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1");
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ id: "t1" }), { status: 200, headers: { "content-type": "application/json" } }))); vi.stubGlobal("fetch", fetchMock);
    await updateTicketAssignee("t1", null); await updateTicketStatus("t1", "WAITING"); await cancelTicket("t1");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/api/v1/tickets/t1/assignee", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ assignee_id: null }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/api/v1/tickets/t1/status", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "WAITING" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://api.test/api/v1/tickets/t1/cancel", expect.objectContaining({ method: "POST" }));
  });
});
