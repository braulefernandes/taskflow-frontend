import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { availableTicketActions, TicketDetails } from "@/components/tickets/ticket-details";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { useSession } from "@/providers/session-provider";
import { getTicket } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketSummary } from "@/types/tickets";

vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), getTicket: vi.fn() }));

const id = "123e4567-e89b-42d3-a456-426614174000";
const ticket: TicketSummary = {
  id, title: "Acesso ao financeiro", description: "Liberar acesso para o fechamento mensal.", status: "IN_PROGRESS", priority: "HIGH",
  due_date: "2026-07-14T12:00:00Z", started_at: "2026-07-13T12:00:00Z", completed_at: null, cancelled_at: null,
  created_at: "2026-07-12T10:00:00Z", updated_at: "2026-07-13T12:00:00Z", organization: { id: "org-1", name: "TaskFlow", slug: "taskflow" },
  category: { id: "cat-1", name: "Acessos", description: "Permissões de sistemas" }, requester: { id: "user-1", name: "Bruno Lima", email: "bruno@example.com" },
  assignee: { id: "user-2", name: "Ana Souza", email: "ana@example.com" }, is_overdue: true, overdue_seconds: 5400,
};

function session(role: AuthMembership["role"], userId = "user-admin") {
  return { status: "authenticated", session: { user: { id: userId, name: "Usuário", email: "u@example.com", avatar_url: null, is_active: true }, organization: { id: "org-1", name: "TaskFlow", slug: "taskflow" }, membership: { id: "m", role, is_active: true } }, signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), updateSessionUser: vi.fn() } as const;
}

function setup(ticketId = id) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(<QueryClientProvider client={client}><TicketDetails id={ticketId} /></QueryClientProvider>);
}

describe("detalhes da solicitação", () => {
  beforeEach(() => { vi.mocked(useSession).mockReturnValue(session("ADMIN")); vi.mocked(getTicket).mockReset(); vi.mocked(getTicket).mockResolvedValue(ticket); });
  afterEach(cleanup);

  it("renderiza as seções organizadas", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "Acesso ao financeiro" })).toBeDefined();
    for (const section of ["Resumo", "Descrição", "Datas", "Responsáveis", "Ações"]) expect(screen.getByRole("heading", { name: section })).toBeDefined();
  });

  it("exibe loading", () => {
    vi.mocked(getTicket).mockReturnValue(new Promise(() => undefined));
    setup();
    expect(screen.getByRole("status", { name: "Carregando detalhes da solicitação" })).toBeDefined();
  });

  it("trata erro inesperado", async () => {
    vi.mocked(getTicket).mockRejectedValue(new Error("falha"));
    setup();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar");
  });

  it("trata não encontrado sem revelar existência", async () => {
    vi.mocked(getTicket).mockRejectedValue(new ApiError({ status: 404, code: "resource_not_found", message: "não encontrado" }));
    setup();
    expect(await screen.findByRole("heading", { name: "Solicitação não encontrada" })).toBeDefined();
    expect(screen.getByText(/não existe ou não está disponível/)).toBeDefined();
  });

  it("rejeita ID inválido sem consultar a API", () => {
    setup("id-invalido");
    expect(screen.getByRole("heading", { name: "Identificador de solicitação inválido" })).toBeDefined();
    expect(getTicket).not.toHaveBeenCalled();
  });

  it("exibe dados principais, relações e datas", async () => {
    setup();
    for (const text of ["Acessos", "Permissões de sistemas", "TaskFlow", "Bruno Lima", "Ana Souza", "Em andamento", "Alta", "Liberar acesso para o fechamento mensal."]) expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(getTicket).toHaveBeenCalledWith(id, expect.any(AbortSignal));
  });

  it("exibe responsável nulo", async () => {
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, assignee: null });
    setup();
    expect(await screen.findByText("Sem responsável")).toBeDefined();
  });

  it("exibe atraso, quantidade e prazo em estado acessível", async () => {
    setup();
    const overdue = await screen.findByRole("status");
    expect(overdue.textContent).toContain("Atrasada · 1h 30min em atraso");
    expect(screen.getAllByText(/Venceu em:/).length).toBeGreaterThan(0);
  });

  it("concluído não aparece atrasado e mantém ações compatíveis", async () => {
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, status: "COMPLETED", is_overdue: true, completed_at: "2026-07-14T14:00:00Z" });
    setup();
    await screen.findByText("Concluída");
    expect(screen.queryByText(/Atrasada/)).toBeNull();
    expect(screen.getByRole("link", { name: "Editar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reabrir" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Cancelar solicitação" })).toBeNull();
  });

  it("cancelado não aparece atrasado nem oferece ações", async () => {
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, status: "CANCELLED", is_overdue: true, cancelled_at: "2026-07-14T14:00:00Z" });
    setup();
    await screen.findByText("Cancelada");
    expect(screen.queryByText(/Atrasada/)).toBeNull();
    expect(screen.getByText("Nenhuma ação disponível para seu papel e o estado atual.")).toBeDefined();
  });

  it.each([
    ["ADMIN", "user-admin", ["Editar", "Atribuir responsável", "Alterar status", "Cancelar solicitação"]],
    ["MANAGER", "user-manager", ["Editar", "Atribuir responsável", "Alterar status", "Cancelar solicitação"]],
    ["AGENT", "user-2", ["Alterar status"]],
    ["REQUESTER", "user-1", []],
  ] as const)("calcula ações permitidas para %s", (role, userId, labels) => {
    const map = { edit: "Editar", assign: "Atribuir responsável", status: "Alterar status", cancel: "Cancelar solicitação" } as const;
    expect(availableTicketActions(ticket, role, userId).map((action) => map[action])).toEqual(labels);
  });

  it("solicitante pode editar e cancelar somente pendente próprio sem responsável", async () => {
    vi.mocked(useSession).mockReturnValue(session("REQUESTER", "user-1"));
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, status: "PENDING", assignee: null });
    setup();
    expect(await screen.findByRole("link", { name: "Editar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Cancelar solicitação" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Alterar status" })).toBeNull();
  });

  it("usa grid responsivo sem largura fixa", async () => {
    const { container } = setup();
    await screen.findByText("Acesso ao financeiro");
    expect(container.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,2fr\\)_minmax\\(18rem\\,1fr\\)\\]")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Acesso ao financeiro" }).className).toContain("break-words");
  });
});
