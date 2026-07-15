import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketsPage } from "@/components/tickets/tickets-page";
import { createQueryClient } from "@/lib/query-client";
import { useSession } from "@/providers/session-provider";
import { listTickets } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketListResponse, TicketSummary } from "@/types/tickets";

const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/solicitacoes", useRouter: () => ({ push }) }));
vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), listTickets: vi.fn() }));

const ticket: TicketSummary = {
  id: "ticket-1", title: "Acesso ao financeiro", description: "Liberar perfil", status: "IN_PROGRESS", priority: "HIGH",
  due_date: "2026-07-14T12:00:00Z", started_at: "2026-07-13T12:00:00Z", completed_at: null, cancelled_at: null,
  created_at: "2026-07-12T10:00:00Z", updated_at: "2026-07-13T12:00:00Z",
  organization: { id: "org-1", name: "TaskFlow", slug: "taskflow" }, category: { id: "cat-1", name: "Acessos", description: null },
  requester: { id: "user-1", name: "Bruno Lima", email: "bruno@example.com", avatar_url: null },
  assignee: { id: "user-2", name: "Ana Souza", email: "ana@example.com", avatar_url: null }, is_overdue: true, overdue_seconds: 5400,
};
const response: TicketListResponse = { page: 1, page_size: 20, total: 45, items: [ticket] };

function session(role: AuthMembership["role"]) {
  return { status: "authenticated", session: { user: { id: "u", name: "Usuário", email: "u@example.com", avatar_url: null, is_active: true }, organization: { id: "o", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } }, signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), updateSessionUser: vi.fn() } as const;
}

function setup(initialPage = 1) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(<QueryClientProvider client={client}><TicketsPage initialPage={initialPage} /></QueryClientProvider>);
}

describe("listagem de solicitações", () => {
  beforeEach(() => { push.mockReset(); vi.mocked(useSession).mockReturnValue(session("ADMIN")); vi.mocked(listTickets).mockReset(); vi.mocked(listTickets).mockResolvedValue(response); });
  afterEach(cleanup);

  it("lista colunas, status, prioridade, responsável e datas no desktop", async () => {
    setup();
    expect(await screen.findByRole("table", { name: "Lista de solicitações" })).toBeDefined();
    for (const text of ["Acesso ao financeiro", "Acessos", "Em andamento", "Alta", "Ana Souza", "Bruno Lima"]) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it("exibe loading", () => {
    vi.mocked(listTickets).mockReturnValue(new Promise(() => undefined));
    setup();
    expect(screen.getAllByRole("status", { name: "Carregando solicitação" })).toHaveLength(3);
  });

  it("exibe erro e permite nova tentativa", async () => {
    vi.mocked(listTickets).mockRejectedValue(new Error("falha"));
    setup();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(listTickets).toHaveBeenCalledTimes(2));
  });

  it("exibe estado vazio", async () => {
    vi.mocked(listTickets).mockResolvedValue({ ...response, total: 0, items: [] });
    setup();
    expect(await screen.findByRole("heading", { name: "Nenhuma solicitação encontrada" })).toBeDefined();
  });

  it("envia paginação ao backend uma única vez", async () => {
    setup(2);
    await screen.findAllByText("Acesso ao financeiro");
    expect(listTickets).toHaveBeenCalledTimes(1);
    expect(listTickets).toHaveBeenCalledWith({ page: 2, page_size: 20 }, expect.any(AbortSignal));
  });

  it("navega para a próxima página preservando histórico", async () => {
    setup();
    await screen.findAllByText("Acesso ao financeiro");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(push).toHaveBeenCalledWith("/solicitacoes?page=2");
  });

  it("navega para a página anterior e limpa page=1", async () => {
    vi.mocked(listTickets).mockResolvedValue({ ...response, page: 2 });
    setup(2);
    fireEvent.click(await screen.findByRole("button", { name: "Anterior" }));
    expect(push).toHaveBeenCalledWith("/solicitacoes");
  });

  it("fornece links para detalhes e nova solicitação", async () => {
    setup();
    expect((await screen.findAllByRole("link", { name: /Acesso ao financeiro|Ver detalhes/ })).some((link) => link.getAttribute("href") === "/solicitacoes/ticket-1")).toBe(true);
    expect(screen.getByRole("link", { name: "Nova solicitação" }).getAttribute("href")).toBe("/solicitacoes/nova");
  });

  it("destaca atraso com texto e quantidade", async () => {
    setup();
    expect((await screen.findAllByText(/Atrasada · 1h 30min em atraso/)).length).toBeGreaterThan(0);
  });

  it("não marca concluída como atrasada mesmo com resposta inconsistente", async () => {
    vi.mocked(listTickets).mockResolvedValue({ ...response, items: [{ ...ticket, status: "COMPLETED", is_overdue: true }] });
    setup();
    await screen.findAllByText("Concluída");
    expect(screen.queryByText(/Atrasada/)).toBeNull();
  });

  it("mostra responsável nulo", async () => {
    vi.mocked(listTickets).mockResolvedValue({ ...response, items: [{ ...ticket, assignee: null }] });
    setup();
    expect((await screen.findAllByText("Sem responsável")).length).toBeGreaterThan(0);
  });

  it("mantém tabela desktop e cards mobile responsivos", async () => {
    const { container } = setup();
    await screen.findByRole("table");
    expect(screen.getByRole("table").closest(".md\\:block")?.className).toContain("hidden");
    expect(container.querySelector(".md\\:hidden")?.className).toContain("grid");
  });

  it.each([
    ["ADMIN", "Todas as solicitações"], ["MANAGER", "Todas as solicitações"], ["AGENT", "Solicitações atribuídas"], ["REQUESTER", "Minhas solicitações"],
  ] as const)("contextualiza a resposta para %s", async (role, title) => {
    vi.mocked(useSession).mockReturnValue(session(role));
    setup();
    expect(await screen.findByRole("heading", { name: title })).toBeDefined();
  });

  it("não repete a coluna solicitante para requester", async () => {
    vi.mocked(useSession).mockReturnValue(session("REQUESTER"));
    setup();
    await screen.findAllByText("Acesso ao financeiro");
    expect(screen.queryByRole("columnheader", { name: "Solicitante" })).toBeNull();
  });
});
