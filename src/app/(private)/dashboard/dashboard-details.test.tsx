import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardDetails } from "@/app/(private)/dashboard/dashboard-details";
import { useSession } from "@/providers/session-provider";
import { getDashboardOverdue, getDashboardPriorityDistribution, getDashboardRecent, getDashboardStatusDistribution } from "@/services/dashboard";
import type { DashboardOverdueTicket, DashboardTicket, PriorityDistributionItem, StatusDistributionItem } from "@/types/dashboard";
import { createTestQueryClient } from "@/test/query-client";

vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-chart">{children}</div>, PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>, Pie: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>, Cell: () => null, Tooltip: () => <span data-testid="chart-tooltip" />, Legend: () => <span data-testid="chart-legend" /> }));
vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/dashboard", () => ({ dashboardStatusQueryKey: ["dashboard", "status"], dashboardPriorityQueryKey: ["dashboard", "priority"], dashboardRecentQueryKey: ["dashboard", "recent"], dashboardOverdueQueryKey: ["dashboard", "overdue"], getDashboardStatusDistribution: vi.fn(), getDashboardPriorityDistribution: vi.fn(), getDashboardRecent: vi.fn(), getDashboardOverdue: vi.fn() }));

const statuses: StatusDistributionItem[] = [{ status: "PENDING", count: 3 }, { status: "IN_PROGRESS", count: 2 }, { status: "WAITING", count: 0 }, { status: "COMPLETED", count: 4 }, { status: "CANCELLED", count: 1 }];
const priorities: PriorityDistributionItem[] = [{ priority: "LOW", count: 0 }, { priority: "MEDIUM", count: 5 }, { priority: "HIGH", count: 3 }, { priority: "URGENT", count: 2 }];
const recent: DashboardTicket[] = [
  { id: "recent-2", title: "Mais recente", status: "IN_PROGRESS", priority: "HIGH", due_date: null, created_at: "2026-07-15T15:00:00Z", category: { id: "c", name: "Acessos" }, assignee: { id: "u", name: "Ana Souza" } },
  { id: "recent-1", title: "Anterior", status: "PENDING", priority: "MEDIUM", due_date: null, created_at: "2026-07-14T15:00:00Z", category: { id: "c", name: "Acessos" }, assignee: null },
];
const overdue: DashboardOverdueTicket[] = [
  { ...recent[0], id: "late-5", title: "Cinco horas", due_date: "2026-07-15T10:00:00Z", overdue_seconds: 18000 },
  { ...recent[1], id: "late-2", title: "Duas horas", due_date: "2026-07-15T13:00:00Z", overdue_seconds: 7200 },
];
function setup() { const client = createTestQueryClient(); vi.mocked(useSession).mockReturnValue({ session: { membership: { role: "ADMIN" } } } as ReturnType<typeof useSession>); return render(<QueryClientProvider client={client}><DashboardDetails /></QueryClientProvider>); }

describe("detalhes do dashboard", () => {
  beforeEach(() => { vi.mocked(getDashboardStatusDistribution).mockReset().mockResolvedValue(statuses); vi.mocked(getDashboardPriorityDistribution).mockReset().mockResolvedValue(priorities); vi.mocked(getDashboardRecent).mockReset().mockResolvedValue(recent); vi.mocked(getDashboardOverdue).mockReset().mockResolvedValue(overdue); });
  afterEach(cleanup);

  it("renderiza gráfico por status com dados reais", async () => { setup(); expect(await screen.findByRole("table", { name: /Alternativa textual para Status/ })).toBeDefined(); expect(screen.getAllByTestId("pie-chart").length).toBeGreaterThan(0); });
  it("mantém status com contagem zero", async () => { setup(); const table = await screen.findByRole("table", { name: /Alternativa textual para Status/ }); const row = within(table).getByText("Aguardando retorno").closest("tr")!; expect(row.textContent).toContain("0"); });
  it("renderiza gráfico por prioridade", async () => { setup(); expect(await screen.findByRole("table", { name: /Alternativa textual para Prioridade/ })).toBeDefined(); expect(screen.getAllByTestId("pie-chart")).toHaveLength(2); });
  it("mantém prioridade com contagem zero", async () => { setup(); const table = await screen.findByRole("table", { name: /Alternativa textual para Prioridade/ }); expect(within(table).getByText("Baixa").closest("tr")?.textContent).toContain("0"); });
  it("traduz todos os códigos", async () => { setup(); await screen.findByText("Aguardando retorno"); for (const label of ["Pendente", "Em andamento", "Concluída", "Cancelada", "Média", "Alta", "Urgente"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0); expect(screen.queryByText("IN_PROGRESS")).toBeNull(); });
  it("inclui tooltip, legenda e dados acessíveis", async () => { setup(); await screen.findByRole("table", { name: /Status/ }); expect(screen.getAllByTestId("chart-tooltip")).toHaveLength(2); expect(screen.getAllByTestId("chart-legend")).toHaveLength(2); });
  it("lista solicitações recentes com dados pedidos", async () => { setup(); const list = await screen.findByRole("list", { name: "Solicitações recentes em ordem do backend" }); expect(list.textContent).toContain("Mais recente"); expect(list.textContent).toContain("Em andamento"); expect(list.textContent).toContain("Alta"); expect(list.textContent).toContain("Ana Souza"); expect(list.textContent).toContain("15/07/2026"); });
  it("preserva ordem de recentes recebida", async () => { setup(); const items = within(await screen.findByRole("list", { name: /recentes em ordem/ })).getAllByRole("listitem"); expect(items[0].textContent).toContain("Mais recente"); expect(items[1].textContent).toContain("Anterior"); });
  it("lista maiores atrasos com prazo, duração, prioridade e responsável", async () => { setup(); const list = await screen.findByRole("list", { name: "Maiores atrasos em ordem do backend" }); for (const text of ["Cinco horas", "5h 0min em atraso", "Alta", "Ana Souza", "Venceu em:"]) expect(list.textContent).toContain(text); });
  it("preserva ordem de atrasos recebida", async () => { setup(); const items = within(await screen.findByRole("list", { name: /Maiores atrasos em ordem/ })).getAllByRole("listitem"); expect(items[0].textContent).toContain("Cinco horas"); expect(items[1].textContent).toContain("Duas horas"); });
  it("fornece links para detalhes", async () => { setup(); expect((await screen.findByRole("link", { name: "Mais recente" })).getAttribute("href")).toBe("/solicitacoes/recent-2"); expect(screen.getByRole("link", { name: "Cinco horas" }).getAttribute("href")).toBe("/solicitacoes/late-5"); });
  it("trata vazios por bloco", async () => { vi.mocked(getDashboardRecent).mockResolvedValue([]); vi.mocked(getDashboardOverdue).mockResolvedValue([]); setup(); expect(await screen.findByText("Nenhuma solicitação recente.")).toBeDefined(); expect(screen.getByText("Nenhuma solicitação atrasada.")).toBeDefined(); });
  it("isola erro parcial", async () => { vi.mocked(getDashboardStatusDistribution).mockRejectedValue(new Error("falha")); setup(); expect(await screen.findByRole("alert")).toBeDefined(); expect(screen.getByRole("heading", { name: "Solicitações por prioridade" })).toBeDefined(); expect(await screen.findByText("Mais recente")).toBeDefined(); });
  it("exibe loading independente", () => { vi.mocked(getDashboardStatusDistribution).mockReturnValue(new Promise(() => undefined)); vi.mocked(getDashboardPriorityDistribution).mockReturnValue(new Promise(() => undefined)); vi.mocked(getDashboardRecent).mockReturnValue(new Promise(() => undefined)); vi.mocked(getDashboardOverdue).mockReturnValue(new Promise(() => undefined)); setup(); for (const label of ["Carregando gráfico por status", "Carregando gráfico por prioridade", "Carregando solicitações recentes", "Carregando maiores atrasos"]) expect(screen.getByRole("status", { name: label })).toBeDefined(); });
  it("usa grids responsivos", async () => { const { container } = setup(); await screen.findByText("Mais recente"); expect(container.querySelectorAll(".lg\\:grid-cols-2")).toHaveLength(2); expect(container.querySelector(".sm\\:flex-row")).toBeDefined(); });
  it("oferece alternativas textuais tabulares", async () => { setup(); await screen.findByRole("table", { name: /Alternativa textual para Prioridade/ }); const tables = screen.getAllByRole("table"); expect(tables).toHaveLength(2); expect(tables[0].querySelectorAll("tbody tr")).toHaveLength(5); expect(tables[1].querySelectorAll("tbody tr")).toHaveLength(4); });
});
