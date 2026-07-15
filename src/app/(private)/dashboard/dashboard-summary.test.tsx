import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(private)/dashboard/page";
import { formatAverageResolution } from "@/app/(private)/dashboard/dashboard-summary";
import { useSession } from "@/providers/session-provider";
import { getDashboardSummary } from "@/services/dashboard";
import type { AuthMembership } from "@/types/auth";
import type { DashboardSummary } from "@/types/dashboard";
import { createTestQueryClient } from "@/test/query-client";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/dashboard", () => ({ dashboardSummaryQueryKey: ["dashboard", "summary"], dashboardStatusQueryKey: ["dashboard", "status"], dashboardPriorityQueryKey: ["dashboard", "priority"], dashboardRecentQueryKey: ["dashboard", "recent"], dashboardOverdueQueryKey: ["dashboard", "overdue"], getDashboardSummary: vi.fn(), getDashboardStatusDistribution: vi.fn().mockResolvedValue([]), getDashboardPriorityDistribution: vi.fn().mockResolvedValue([]), getDashboardRecent: vi.fn().mockResolvedValue([]), getDashboardOverdue: vi.fn().mockResolvedValue([]) }));

const data: DashboardSummary = { total: 12, pending: 3, in_progress: 2, waiting: 1, completed: 4, cancelled: 2, overdue: 2, average_resolution_hours: 6.25 };
function session(role: AuthMembership["role"]) { return { status: "authenticated", session: { user: { id: "u", name: "Ana", email: "a@example.com", avatar_url: null, is_active: true }, organization: { id: "o", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } } } as ReturnType<typeof useSession>; }
function setup() { const client = createTestQueryClient(); return render(<QueryClientProvider client={client}><DashboardPage /></QueryClientProvider>); }
describe("dashboard summary", () => {
  beforeEach(() => { replace.mockReset(); vi.mocked(useSession).mockReturnValue(session("ADMIN")); vi.mocked(getDashboardSummary).mockReset(); vi.mocked(getDashboardSummary).mockResolvedValue(data); });
  afterEach(cleanup);

  it("permite acesso de administrador", async () => { setup(); expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeDefined(); expect(getDashboardSummary).toHaveBeenCalledWith(expect.any(AbortSignal)); });
  it("permite acesso de gestor", async () => { vi.mocked(useSession).mockReturnValue(session("MANAGER")); setup(); expect(await screen.findByRole("article", { name: "Total de solicitações" })).toBeDefined(); expect(replace).not.toHaveBeenCalled(); });
  it.each(["AGENT", "REQUESTER"] as const)("bloqueia e redireciona %s sem consultar summary", async (role) => { vi.mocked(useSession).mockReturnValue(session(role)); setup(); expect(screen.getByRole("status", { name: "Redirecionando para solicitações" })).toBeDefined(); await waitFor(() => expect(replace).toHaveBeenCalledWith("/solicitacoes")); expect(getDashboardSummary).not.toHaveBeenCalled(); });
  it("exibe skeletons no loading", () => { vi.mocked(getDashboardSummary).mockReturnValue(new Promise(() => undefined)); setup(); expect(screen.getAllByRole("status", { name: "Carregando indicador" })).toHaveLength(6); });
  it("exibe erro e permite tentar novamente", async () => { vi.mocked(getDashboardSummary).mockRejectedValue(new Error("falha")); setup(); expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o resumo"); fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" })); await waitFor(() => expect(getDashboardSummary).toHaveBeenCalledTimes(2)); });
  it("exibe vazio com orientação", async () => { vi.mocked(getDashboardSummary).mockResolvedValue({ ...data, total: 0, pending: 0, in_progress: 0, waiting: 0, completed: 0, cancelled: 0, overdue: 0, average_resolution_hours: null }); setup(); expect(await screen.findByRole("heading", { name: "Ainda não há solicitações para resumir" })).toBeDefined(); expect(screen.getByText(/Crie solicitações/)).toBeDefined(); });
  it("exibe total", async () => { setup(); expect((await screen.findByRole("article", { name: "Total de solicitações" })).textContent).toContain("12"); });
  it("exibe pendentes", async () => { setup(); expect((await screen.findByRole("article", { name: "Pendentes" })).textContent).toContain("3"); });
  it("exibe em andamento", async () => { setup(); expect((await screen.findByRole("article", { name: "Em andamento" })).textContent).toContain("2"); });
  it("exibe concluídas", async () => { setup(); expect((await screen.findByRole("article", { name: "Concluídas" })).textContent).toContain("4"); });
  it("exibe atrasadas sem depender apenas da cor", async () => { setup(); expect((await screen.findByRole("article", { name: "Atrasadas" })).textContent).toContain("2"); expect(screen.getByText(/Não concluídas nem canceladas/)).toBeDefined(); });
  it("exibe média na unidade recebida e status secundários", async () => { setup(); expect((await screen.findByRole("article", { name: "Tempo médio de resolução" })).textContent).toContain("6,25 h"); const secondary = screen.getByRole("heading", { name: "Outros status" }).closest("section")!; expect(within(secondary).getByText("Aguardando retorno").nextElementSibling?.textContent).toBe("1"); expect(within(secondary).getByText("Canceladas").nextElementSibling?.textContent).toBe("2"); });
  it("trata média nula e zero", () => { expect(formatAverageResolution(null)).toBe("Sem dados"); expect(formatAverageResolution(0)).toBe("0 h"); });
  it("usa grid responsivo", async () => { const { container } = setup(); await screen.findByRole("article", { name: "Total de solicitações" }); expect(container.querySelector(".sm\\:grid-cols-2")).toBeDefined(); expect(container.querySelector(".xl\\:grid-cols-3")).toBeDefined(); });
  it("possui estrutura acessível de região e cards nomeados", async () => { setup(); const region = await screen.findByLabelText("Indicadores do dashboard"); expect(within(region).getAllByRole("article")).toHaveLength(6); expect(screen.getByRole("heading", { name: "Dashboard" }).getAttribute("id")).toBe("dashboard-title"); });
});
