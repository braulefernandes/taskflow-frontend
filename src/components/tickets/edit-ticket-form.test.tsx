import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditTicketForm } from "@/components/tickets/edit-ticket-form";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { useSession } from "@/providers/session-provider";
import { listActiveCategories } from "@/services/categories";
import { getTicket, updateTicket } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { Category } from "@/types/categories";
import type { TicketSummary } from "@/types/tickets";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/categories", async (original) => ({ ...(await original<typeof import("@/services/categories")>()), listActiveCategories: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), getTicket: vi.fn(), updateTicket: vi.fn() }));

const id = "123e4567-e89b-42d3-a456-426614174000";
const category: Category = { id: "cat-1", organization_id: "org-1", name: "Acessos", description: null, is_active: true, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z" };
const secondCategory: Category = { ...category, id: "cat-2", name: "Infraestrutura" };
const ticket: TicketSummary = { id, title: "Acesso ao financeiro", description: "Liberar perfil", status: "PENDING", priority: "HIGH", due_date: "2099-07-20T18:30:00Z", started_at: null, completed_at: null, cancelled_at: null, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z", organization: { id: "org-1", name: "Org", slug: "org" }, category: { id: "cat-1", name: "Acessos", description: null }, requester: { id: "user-1", name: "Bruno" }, assignee: null, is_overdue: false, overdue_seconds: 0 };

function session(role: AuthMembership["role"], userId = "admin-1") { return { status: "authenticated", session: { user: { id: userId, name: "Usuário", email: "u@example.com", avatar_url: null, is_active: true }, organization: { id: "org-1", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } }, signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), updateSessionUser: vi.fn() } as const; }
function setup() { const client = createQueryClient(); client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } }); return { client, ...render(<QueryClientProvider client={client}><EditTicketForm id={id} /></QueryClientProvider>) }; }

describe("edição de solicitação", () => {
  beforeEach(() => { push.mockReset(); vi.mocked(useSession).mockReturnValue(session("ADMIN")); vi.mocked(getTicket).mockReset(); vi.mocked(getTicket).mockResolvedValue(ticket); vi.mocked(listActiveCategories).mockReset(); vi.mocked(listActiveCategories).mockResolvedValue([category, secondCategory]); vi.mocked(updateTicket).mockReset(); vi.mocked(updateTicket).mockResolvedValue(ticket); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("carrega os valores iniciais", async () => {
    setup();
    expect((await screen.findByLabelText("Título") as HTMLInputElement).value).toBe("Acesso ao financeiro");
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).value).toBe("Liberar perfil");
    expect((screen.getByLabelText("Categoria") as HTMLSelectElement).value).toBe("cat-1");
    expect((screen.getByLabelText("Prioridade") as HTMLSelectElement).value).toBe("HIGH");
    expect(screen.getByRole("button", { name: "Salvar alterações" }).hasAttribute("disabled")).toBe(true);
  });

  it("faz edição válida e parcial", async () => {
    setup();
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Acesso financeiro atualizado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(updateTicket).toHaveBeenCalledWith(id, { title: "Acesso financeiro atualizado" }));
  });

  it("não envia campos internos", async () => {
    setup();
    fireEvent.change(await screen.findByLabelText("Descrição"), { target: { value: "Nova descrição" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(updateTicket).toHaveBeenCalled());
    const payload = vi.mocked(updateTicket).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toEqual({ description: "Nova descrição" });
    for (const field of ["organization_id", "requester_id", "assignee_id", "status", "started_at", "completed_at", "cancelled_at", "created_at"]) expect(payload).not.toHaveProperty(field);
  });

  it("mapeia categoria inativa para o campo", async () => {
    vi.mocked(updateTicket).mockRejectedValue(new ApiError({ status: 400, code: "category_inactive", message: "inativa" }));
    setup();
    fireEvent.change(await screen.findByLabelText("Categoria"), { target: { value: "cat-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect((await screen.findAllByText("A categoria selecionada não está mais ativa.")).length).toBeGreaterThan(0);
  });

  it("bloqueia prazo passado alterado", async () => {
    setup();
    fireEvent.change(await screen.findByLabelText("Prazo (opcional)"), { target: { value: "2020-01-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Informe um prazo futuro.")).toBeDefined();
    expect(updateTicket).not.toHaveBeenCalled();
  });

  it("esconde formulário de usuário sem permissão", async () => {
    vi.mocked(useSession).mockReturnValue(session("AGENT", "agent-1"));
    setup();
    expect(await screen.findByRole("heading", { name: "Edição indisponível" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Salvar alterações" })).toBeNull();
  });

  it("bloqueia ticket cancelado", async () => {
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, status: "CANCELLED" });
    setup();
    expect(await screen.findByText("Solicitações canceladas não podem ser editadas.")).toBeDefined();
  });

  it("ticket concluído permite apenas a regra formal descritiva", async () => {
    vi.mocked(getTicket).mockResolvedValue({ ...ticket, status: "COMPLETED" });
    setup();
    expect(await screen.findByLabelText("Título")).toBeDefined();
    expect(screen.getByLabelText("Descrição")).toBeDefined();
    expect(screen.getByLabelText("Categoria")).toBeDefined();
    expect(screen.queryByLabelText("Prioridade")).toBeNull();
    expect(screen.queryByLabelText("Prazo (opcional)")).toBeNull();
  });

  it("requester permitido não vê prioridade ou prazo", async () => {
    vi.mocked(useSession).mockReturnValue(session("REQUESTER", "user-1"));
    setup();
    expect(await screen.findByLabelText("Título")).toBeDefined();
    expect(screen.queryByLabelText("Prioridade")).toBeNull();
  });

  it("atualiza caches, mostra sucesso e retorna ao detalhe", async () => {
    const updated = { ...ticket, title: "Título atualizado" };
    vi.mocked(updateTicket).mockResolvedValue(updated);
    const { client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Título atualizado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Solicitação atualizada com sucesso.")).toBeDefined();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"], refetchType: "none" }));
    expect(client.getQueryData(["tickets", "detail", id])).toEqual(updated);
    expect(push).toHaveBeenCalledWith(`/solicitacoes/${id}`);
  });

  it("exibe erro inesperado", async () => {
    vi.mocked(updateTicket).mockRejectedValue(new Error("falha"));
    setup();
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Outro título" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Não foi possível atualizar a solicitação. Tente novamente.")).toBeDefined();
  });

  it("confirma o descarte e cancela a edição", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    setup();
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Alterado" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(confirm).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(`/solicitacoes/${id}`);
  });
});
