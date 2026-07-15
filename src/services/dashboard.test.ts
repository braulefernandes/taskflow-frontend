import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardOverdue, getDashboardPriorityDistribution, getDashboardRecent, getDashboardStatusDistribution, getDashboardSummary } from "@/services/dashboard";
describe("dashboard service", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("consulta somente o summary autenticado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const payload = { total: 0, pending: 0, in_progress: 0, waiting: 0, completed: 0, cancelled: 0, overdue: 0, average_resolution_hours: null };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock); const signal = new AbortController().signal;
    await expect(getDashboardSummary(signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/dashboard/summary", expect.objectContaining({ method: "GET", signal }));
  });

  it.each([
    [getDashboardStatusDistribution, "/dashboard/status-distribution"],
    [getDashboardPriorityDistribution, "/dashboard/priority-distribution"],
    [getDashboardRecent, "/dashboard/recent?limit=5"],
    [getDashboardOverdue, "/dashboard/overdue?limit=5"],
  ] as const)("consulta endpoint autenticado %s", async (request, path) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock); await request();
    expect(fetchMock).toHaveBeenCalledWith(`http://localhost:8000/api/v1${path}`, expect.objectContaining({ method: "GET" }));
  });
});
