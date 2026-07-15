import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { listActiveCategories } from "@/services/categories";
import { createTicket } from "@/services/tickets";
import type { Category } from "@/types/categories";
import type { TicketSummary } from "@/types/tickets";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/services/categories", async (original) => ({ ...(await original<typeof import("@/services/categories")>()), listActiveCategories: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), createTicket: vi.fn() }));

const category: Category = { id: "cat-1", organization_id: "org-1", name: "Acessos", description: null, is_active: true, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z" };
const created: TicketSummary = { id: "ticket-1", title: "Acesso ao financeiro", description: "Liberar perfil", status: "PENDING", priority: "HIGH", due_date: null, started_at: null, completed_at: null, cancelled_at: null, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z", organization: { id: "org-1", name: "Org", slug: "org" }, category: { id: "cat-1", name: "Acessos", description: null }, requester: { id: "u1", name: "Ana" }, assignee: null, is_overdue: false, overdue_seconds: 0 };

function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  return { client, ...render(<QueryClientProvider client={client}><NewTicketForm /></QueryClientProvider>) };
}

async function fill(overrides: { due?: string; priority?: string } = {}) {
  await screen.findByLabelText("Título");
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Acesso ao financeiro" } });
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Liberar perfil" } });
  fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "cat-1" } });
  if (overrides.priority) fireEvent.change(screen.getByLabelText("Prioridade"), { target: { value: overrides.priority } });
  if (overrides.due !== undefined) fireEvent.change(screen.getByLabelText("Prazo (opcional)"), { target: { value: overrides.due } });
}

describe("nova solicitação", () => {
  beforeEach(() => { push.mockReset(); vi.mocked(listActiveCategories).mockReset(); vi.mocked(listActiveCategories).mockResolvedValue([category]); vi.mocked(createTicket).mockReset(); vi.mocked(createTicket).mockResolvedValue(created); });
  afterEach(cleanup);

  it("renderiza o formulário com os campos do contrato", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "Nova solicitação" })).toBeDefined();
    for (const label of ["Título", "Descrição", "Categoria", "Prioridade", "Prazo (opcional)"]) expect(await screen.findByLabelText(label)).toBeDefined();
  });

  it("carrega somente categorias ativas e oferece suas opções", async () => {
    setup();
    expect(await screen.findByRole("option", { name: "Acessos" })).toBeDefined();
    expect(listActiveCategories).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("exibe estado sem categorias e não mostra formulário", async () => {
    vi.mocked(listActiveCategories).mockResolvedValue([]);
    setup();
    expect(await screen.findByText("Nenhuma categoria disponível")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Criar solicitação" })).toBeNull();
  });

  it("valida campos obrigatórios", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Criar solicitação" }));
    expect(await screen.findByText("Informe o título.")).toBeDefined();
    expect(screen.getByText("Informe a descrição.")).toBeDefined();
    expect(screen.getByText("Selecione uma categoria.")).toBeDefined();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it("exibe prioridades em português e envia o enum", async () => {
    setup();
    await fill({ priority: "URGENT" });
    expect(screen.getByRole("option", { name: "Urgente" }).getAttribute("value")).toBe("URGENT");
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    await waitFor(() => expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({ priority: "URGENT" }), expect.anything()));
  });

  it("rejeita prazo passado no frontend", async () => {
    setup();
    await fill({ due: "2020-01-01T10:00" });
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    expect(await screen.findByText("Informe um prazo futuro.")).toBeDefined();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it("envia payload exato e converte o horário local para ISO", async () => {
    setup();
    await fill({ due: "2099-07-20T15:30", priority: "HIGH" });
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    await waitFor(() => expect(createTicket).toHaveBeenCalledWith({ title: "Acesso ao financeiro", description: "Liberar perfil", category_id: "cat-1", priority: "HIGH", due_date: new Date("2099-07-20T15:30").toISOString() }, expect.anything()));
    const payload = vi.mocked(createTicket).mock.calls[0][0] as Record<string, unknown>;
    for (const internal of ["organization_id", "requester_id", "assignee_id", "status", "started_at", "completed_at", "cancelled_at", "created_at"]) expect(payload).not.toHaveProperty(internal);
  });

  it("impede envio duplicado durante criação", async () => {
    vi.mocked(createTicket).mockReturnValue(new Promise(() => undefined));
    setup();
    await fill();
    const button = screen.getByRole("button", { name: "Criar solicitação" });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "Criando..." }).hasAttribute("disabled")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Criando..." }));
    expect(createTicket).toHaveBeenCalledTimes(1);
  });

  it("exibe loading das categorias", () => {
    vi.mocked(listActiveCategories).mockReturnValue(new Promise(() => undefined));
    setup();
    expect(screen.getByRole("status", { name: "Carregando categorias" })).toBeDefined();
  });

  it("exibe erro de categorias e permite tentar novamente", async () => {
    vi.mocked(listActiveCategories).mockRejectedValue(new Error("falha"));
    setup();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(listActiveCategories).toHaveBeenCalledTimes(2));
  });

  it("mapeia categoria inativa para o campo", async () => {
    vi.mocked(createTicket).mockRejectedValue(new ApiError({ status: 400, code: "category_inactive", message: "inativa" }));
    setup();
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    expect((await screen.findAllByText("A categoria selecionada não está mais ativa.")).length).toBeGreaterThan(0);
  });

  it("trata erro inesperado da API", async () => {
    vi.mocked(createTicket).mockRejectedValue(new Error("falha"));
    setup();
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    expect(await screen.findByText("Não foi possível criar a solicitação. Tente novamente.")).toBeDefined();
  });

  it("invalida a listagem, mostra feedback e redireciona ao detalhe", async () => {
    const { client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Criar solicitação" }));
    expect(await screen.findByRole("status", { name: "" })).toBeDefined();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] }));
    expect(push).toHaveBeenCalledWith("/solicitacoes/ticket-1");
  });

  it("confirma cancelamento quando há alterações", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    setup();
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(confirm).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
