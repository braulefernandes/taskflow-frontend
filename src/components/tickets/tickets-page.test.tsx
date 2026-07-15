import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketsPage } from "@/components/tickets/tickets-page";
import { defaultTicketFilters, parseTicketFilters, serializeTicketFilters } from "@/lib/ticket-list-filters";
import { useSession } from "@/providers/session-provider";
import { listActiveCategories } from "@/services/categories";
import { listMembers } from "@/services/members";
import { listTickets } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketListResponse, TicketListUrlFilters, TicketSummary } from "@/types/tickets";
import { createTestQueryClient } from "@/test/query-client";

const navigation = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ usePathname: () => "/solicitacoes", useRouter: () => navigation }));
vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/categories", async (original) => ({ ...(await original<typeof import("@/services/categories")>()), listActiveCategories: vi.fn() }));
vi.mock("@/services/members", async (original) => ({ ...(await original<typeof import("@/services/members")>()), listMembers: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), listTickets: vi.fn() }));

const categoryId = "11111111-1111-4111-8111-111111111111";
const assigneeId = "22222222-2222-4222-8222-222222222222";
const ticket: TicketSummary = { id: "ticket-1", title: "Acesso ao financeiro", description: "Liberar perfil", status: "IN_PROGRESS", priority: "HIGH", due_date: "2026-07-14T12:00:00Z", started_at: null, completed_at: null, cancelled_at: null, created_at: "2026-07-12T10:00:00Z", updated_at: "2026-07-13T12:00:00Z", organization: { id: "org-1", name: "TaskFlow", slug: "taskflow" }, category: { id: categoryId, name: "Acessos", description: null }, requester: { id: "user-1", name: "Bruno Lima" }, assignee: { id: assigneeId, name: "Ana Souza" }, is_overdue: true, overdue_seconds: 5400 };
const response: TicketListResponse = { page: 1, page_size: 20, total: 45, total_pages: 3, items: [ticket] };

function session(role: AuthMembership["role"] = "ADMIN") { return { status: "authenticated", session: { user: { id: "u", name: "Usuário", email: "u@example.com", avatar_url: null, is_active: true }, organization: { id: "o", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } } } as ReturnType<typeof useSession>; }
function setup(filters: TicketListUrlFilters = defaultTicketFilters) { const client = createTestQueryClient(); return render(<QueryClientProvider client={client}><TicketsPage initialFilters={filters} /></QueryClientProvider>); }

describe("filtros da listagem de solicitações", () => {
  beforeEach(() => {
    navigation.push.mockReset(); navigation.replace.mockReset();
    vi.mocked(useSession).mockReturnValue(session());
    vi.mocked(listTickets).mockReset(); vi.mocked(listTickets).mockResolvedValue(response);
    vi.mocked(listActiveCategories).mockResolvedValue([{ id: categoryId, organization_id: "o", name: "Acessos", description: null, is_active: true, created_at: "", updated_at: "" }]);
    vi.mocked(listMembers).mockResolvedValue({ page: 1, page_size: 100, total: 1, items: [{ id: "m", user_id: assigneeId, name: "Ana Souza", email: "ana@example.com", role: "AGENT", is_active: true, created_at: "", updated_at: "" }] });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("busca por título e permite limpar", async () => { setup({ ...defaultTicketFilters, search: "financeiro" }); expect(await screen.findByDisplayValue("financeiro")).toBeDefined(); fireEvent.click(screen.getByRole("button", { name: "Limpar busca" })); expect(navigation.replace).toHaveBeenCalledWith("/solicitacoes", { scroll: false }); });
  it("aplica debounce sem requisitar a cada tecla", async () => { setup(); await screen.findByRole("table"); vi.useFakeTimers(); const input = screen.getByLabelText("Buscar por título"); fireEvent.change(input, { target: { value: "f" } }); fireEvent.change(input, { target: { value: "fi" } }); fireEvent.change(input, { target: { value: "fin" } }); expect(navigation.replace).not.toHaveBeenCalled(); await act(() => vi.advanceTimersByTimeAsync(399)); expect(navigation.replace).not.toHaveBeenCalled(); await act(() => vi.advanceTimersByTimeAsync(1)); expect(navigation.replace).toHaveBeenCalledTimes(1); expect(navigation.replace).toHaveBeenCalledWith("/solicitacoes?search=fin", { scroll: false }); });
  it("sincroniza status", async () => { setup(); fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "WAITING" } }); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?status=WAITING", { scroll: false }); });
  it("sincroniza prioridade", async () => { setup(); fireEvent.change(await screen.findByLabelText("Prioridade"), { target: { value: "URGENT" } }); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?priority=URGENT", { scroll: false }); });
  it("carrega e sincroniza categoria", async () => { setup(); const select = await screen.findByLabelText("Categoria"); await waitFor(() => expect((select as HTMLSelectElement).disabled).toBe(false)); fireEvent.change(select, { target: { value: categoryId } }); expect(navigation.push).toHaveBeenCalledWith(`/solicitacoes?category=${categoryId}`, { scroll: false }); });
  it("carrega somente responsáveis elegíveis", async () => { setup(); const select = await screen.findByLabelText("Responsável"); await waitFor(() => expect((select as HTMLSelectElement).disabled).toBe(false)); expect(screen.getByRole("option", { name: "Ana Souza" })).toBeDefined(); fireEvent.change(select, { target: { value: assigneeId } }); expect(navigation.push).toHaveBeenCalledWith(`/solicitacoes?assignee=${assigneeId}`, { scroll: false }); });
  it("sincroniza período", async () => { setup(); fireEvent.change(await screen.findByLabelText("Criadas a partir de"), { target: { value: "2026-07-01" } }); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?createdFrom=2026-07-01", { scroll: false }); });
  it("filtra somente atrasadas", async () => { setup(); fireEvent.click(await screen.findByLabelText("Somente atrasadas")); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?overdue=true", { scroll: false }); });
  it("combina filtros na requisição", async () => { const filters = parseTicketFilters({ search: "falha", status: "IN_PROGRESS", priority: "HIGH", category: categoryId, assignee: assigneeId, createdFrom: "2026-07-01", createdTo: "2026-07-31", overdue: "true" }); setup(filters); await screen.findByRole("table"); expect(listTickets).toHaveBeenCalledWith(expect.objectContaining({ search: "falha", status: "IN_PROGRESS", priority: "HIGH", category_id: categoryId, assignee_id: assigneeId, overdue: true, created_from: "2026-07-01T00:00:00.000Z", created_to: "2026-07-31T23:59:59.999Z" }), expect.any(AbortSignal)); });
  it("limpa todos os filtros", async () => { setup({ ...defaultTicketFilters, status: "WAITING", overdue: true }); fireEvent.click(await screen.findByRole("button", { name: "Limpar filtros" })); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes"); });
  it("serializa URL compartilhável com aliases públicos", () => { expect(serializeTicketFilters({ ...defaultTicketFilters, category_id: categoryId, assignee_id: assigneeId, page: 2 })).toBe(`category=${categoryId}&assignee=${assigneeId}&page=2`); });
  it("reproduz filtros no reload pelo parser", () => { expect(parseTicketFilters({ search: "  financeiro ", status: "WAITING", page: "3" })).toEqual(expect.objectContaining({ search: "financeiro", status: "WAITING", page: 3 })); });
  it("links de detalhes permitem voltar à URL filtrada pelo histórico do navegador", async () => { setup({ ...defaultTicketFilters, status: "WAITING" }); expect((await screen.findAllByRole("link", { name: /Acesso ao financeiro|Ver detalhes/ }))[0].getAttribute("href")).toBe("/solicitacoes/ticket-1"); expect(serializeTicketFilters({ ...defaultTicketFilters, status: "WAITING" })).toBe("status=WAITING"); });
  it("reseta página ao alterar filtro", async () => { setup({ ...defaultTicketFilters, page: 4 }); fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "COMPLETED" } }); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?status=COMPLETED", { scroll: false }); });
  it.each([["created_at:desc", "/solicitacoes"], ["created_at:asc", "/solicitacoes?sortOrder=asc"], ["due_date:asc", "/solicitacoes?sortBy=due_date&sortOrder=asc"], ["due_date:desc", "/solicitacoes?sortBy=due_date"]])("mapeia ordenação %s", async (value, url) => { setup(); fireEvent.change(await screen.findByLabelText("Ordenação"), { target: { value } }); expect(navigation.push).toHaveBeenCalledWith(url, { scroll: false }); });
  it("ignora parâmetros inválidos com segurança", () => { expect(parseTicketFilters({ status: "INVALID", priority: "X", category: "bad", page: "-2", overdue: "yes", sortBy: "title" })).toEqual(defaultTicketFilters); });
  it("diferencia vazio filtrado", async () => { vi.mocked(listTickets).mockResolvedValue({ ...response, total: 0, items: [] }); setup({ ...defaultTicketFilters, status: "WAITING" }); expect(await screen.findByRole("heading", { name: "Nenhum resultado para os filtros" })).toBeDefined(); expect(screen.getByText("Tente remover ou ajustar os filtros aplicados.")).toBeDefined(); });
  it("mantém painel, tabela desktop e cards mobile responsivos", async () => { const { container } = setup(); await screen.findByRole("table"); expect(container.querySelector(".lg\\:grid-cols-4")).toBeDefined(); expect(container.querySelector(".md\\:hidden")?.className).toContain("grid"); expect(screen.getByRole("table").closest(".md\\:block")?.className).toContain("hidden"); });
  it("envia parâmetros reais corretos ao backend", async () => { setup({ ...defaultTicketFilters, sort_by: "due_date", sort_order: "asc", page: 2 }); await screen.findByRole("table"); expect(listTickets).toHaveBeenCalledWith({ page: 2, page_size: 20, sort_by: "due_date", sort_order: "asc" }, expect.any(AbortSignal)); });
  it("paginação preserva filtros ativos", async () => { setup({ ...defaultTicketFilters, search: "financeiro", status: "IN_PROGRESS" }); fireEvent.click(await screen.findByRole("button", { name: "Próxima" })); expect(navigation.push).toHaveBeenCalledWith("/solicitacoes?search=financeiro&status=IN_PROGRESS&page=2"); });
});
