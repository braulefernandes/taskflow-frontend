import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketActions, validTicketTransitions } from "@/components/tickets/ticket-actions";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { listMembers } from "@/services/members";
import { cancelTicket, updateTicket, updateTicketAssignee, updateTicketStatus } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { Member } from "@/types/members";
import type { TicketSummary } from "@/types/tickets";

vi.mock("@/services/members", async (original) => ({ ...(await original<typeof import("@/services/members")>()), listMembers: vi.fn() }));
vi.mock("@/services/tickets", async (original) => ({ ...(await original<typeof import("@/services/tickets")>()), updateTicket: vi.fn(), updateTicketAssignee: vi.fn(), updateTicketStatus: vi.fn(), cancelTicket: vi.fn() }));

const ticket: TicketSummary = { id: "ticket-1", title: "Falha", description: "Descrição", status: "IN_PROGRESS", priority: "HIGH", due_date: "2099-07-20T18:00:00Z", started_at: null, completed_at: null, cancelled_at: null, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z", organization: { id: "org", name: "Org", slug: "org" }, category: { id: "cat", name: "Suporte", description: null }, requester: { id: "requester", name: "Rita" }, assignee: { id: "agent", name: "Ana", email: "ana@example.com" }, is_overdue: false, overdue_seconds: 0 };
const members: Member[] = [
  { id: "m1", user_id: "agent", name: "Ana", email: "ana@example.com", role: "AGENT", is_active: true, created_at: "", updated_at: "" },
  { id: "m2", user_id: "manager", name: "Marta", email: "marta@example.com", role: "MANAGER", is_active: true, created_at: "", updated_at: "" },
  { id: "m3", user_id: "inactive", name: "Inativo", email: "inativo@example.com", role: "AGENT", is_active: false, created_at: "", updated_at: "" },
  { id: "m4", user_id: "requester", name: "Rita", email: "rita@example.com", role: "REQUESTER", is_active: true, created_at: "", updated_at: "" },
];

function setup(role: AuthMembership["role"] = "ADMIN", value: TicketSummary = ticket, userId = "admin") {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { client, invalidate, ...render(<QueryClientProvider client={client}><TicketActions role={role} ticket={value} userId={userId} /></QueryClientProvider>) };
}

describe("ações operacionais da solicitação", () => {
  beforeEach(() => {
    vi.mocked(listMembers).mockReset(); vi.mocked(listMembers).mockResolvedValue({ items: members, total: 4, page: 1, page_size: 100 });
    vi.mocked(updateTicketAssignee).mockReset(); vi.mocked(updateTicketAssignee).mockResolvedValue(ticket);
    vi.mocked(updateTicketStatus).mockReset(); vi.mocked(updateTicketStatus).mockResolvedValue(ticket);
    vi.mocked(updateTicket).mockReset(); vi.mocked(updateTicket).mockResolvedValue(ticket);
    vi.mocked(cancelTicket).mockReset(); vi.mocked(cancelTicket).mockResolvedValue({ ...ticket, status: "CANCELLED" });
  });
  afterEach(cleanup);

  it.each(["ADMIN", "MANAGER"] as const)("%s atribui responsável", async (role) => { setup(role); fireEvent.change(await screen.findByLabelText("Responsável elegível"), { target: { value: "manager" } }); await waitFor(() => expect(updateTicketAssignee).toHaveBeenCalledWith("ticket-1", "manager")); });
  it("atendente não vê atribuição", () => { setup("AGENT", ticket, "agent"); expect(screen.queryByLabelText("Responsável elegível")).toBeNull(); });
  it("não lista responsável inativo nem solicitante", async () => { setup(); const select = await screen.findByLabelText("Responsável elegível"); expect(select.textContent).toContain("Marta — marta@example.com — MANAGER — Ativo"); expect(select.textContent).not.toContain("Inativo"); expect(select.textContent).not.toContain("Rita"); });
  it("troca responsável", async () => { setup(); fireEvent.change(await screen.findByLabelText("Responsável elegível"), { target: { value: "manager" } }); await waitFor(() => expect(updateTicketAssignee).toHaveBeenCalledWith("ticket-1", "manager")); });
  it("remove responsável com null", async () => { setup(); fireEvent.change(await screen.findByLabelText("Responsável elegível"), { target: { value: "" } }); await waitFor(() => expect(updateTicketAssignee).toHaveBeenCalledWith("ticket-1", null)); });
  it("expõe somente transições válidas", () => { expect(validTicketTransitions(ticket, "ADMIN", "admin")).toEqual(["WAITING", "COMPLETED"]); });
  it("não expõe transições inválidas", () => { setup(); expect(screen.queryByRole("button", { name: "Pendente" })).toBeNull(); expect(screen.queryByRole("button", { name: "Reabrir" })).toBeNull(); });
  it("agente altera ticket atribuído", async () => { setup("AGENT", ticket, "agent"); fireEvent.click(screen.getByRole("button", { name: "Aguardando retorno" })); await waitFor(() => expect(updateTicketStatus).toHaveBeenCalledWith("ticket-1", "WAITING")); });
  it("agente não altera ticket alheio", () => { setup("AGENT", ticket, "outro"); expect(screen.queryByRole("heading", { name: "Alterar status" })).toBeNull(); });
  it("altera prioridade", async () => { setup(); fireEvent.change(screen.getByLabelText("Prioridade"), { target: { value: "URGENT" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar prioridade" })); await waitFor(() => expect(updateTicket).toHaveBeenCalledWith("ticket-1", { priority: "URGENT" })); });
  it("altera prazo convertendo para ISO", async () => { setup(); fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2099-08-01T12:30" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar prazo" })); await waitFor(() => expect(updateTicket).toHaveBeenCalledWith("ticket-1", { due_date: new Date("2099-08-01T12:30").toISOString() })); });
  it("rejeita prazo passado", () => { setup(); fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2020-01-01T10:00" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar prazo" })); expect(screen.getByText("Informe um prazo futuro.")).toBeDefined(); expect(updateTicket).not.toHaveBeenCalled(); });
  it("remove prazo quando suportado", async () => { setup(); fireEvent.click(screen.getByRole("button", { name: "Remover prazo" })); await waitFor(() => expect(updateTicket).toHaveBeenCalledWith("ticket-1", { due_date: null })); });
  it("cancela após confirmação", async () => { setup(); fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitação" })); expect(screen.getByRole("alertdialog")).toBeDefined(); const buttons = screen.getAllByRole("button", { name: "Cancelar solicitação" }); fireEvent.click(buttons[buttons.length - 1]); await waitFor(() => expect(cancelTicket).toHaveBeenCalledWith("ticket-1")); });
  it("permite desistir da confirmação", () => { setup(); fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitação" })); fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); expect(screen.queryByRole("alertdialog")).toBeNull(); expect(cancelTicket).not.toHaveBeenCalled(); });
  it("atualiza detalhe e invalida cache", async () => { const { client, invalidate } = setup(); fireEvent.click(screen.getByRole("button", { name: "Aguardando retorno" })); await screen.findByText("Status atualizado com sucesso."); expect(client.getQueryData(["tickets", "detail", "ticket-1"])).toEqual(ticket); expect(invalidate).toHaveBeenCalled(); });
  it("exibe erro da API sem alteração otimista", async () => { vi.mocked(updateTicketStatus).mockRejectedValue(new ApiError({ status: 409, code: "invalid_status_transition", message: "inválida" })); const { client } = setup(); fireEvent.click(screen.getByRole("button", { name: "Aguardando retorno" })); expect(await screen.findByText("Essa transição de status não é mais válida.")).toBeDefined(); expect(client.getQueryData(["tickets", "detail", "ticket-1"])).toBeUndefined(); });
  it("bloqueia cliques durante loading", async () => { vi.mocked(updateTicketStatus).mockReturnValue(new Promise(() => undefined)); setup(); const button = screen.getByRole("button", { name: "Aguardando retorno" }) as HTMLButtonElement; fireEvent.click(button); await waitFor(() => expect(button.disabled).toBe(true)); fireEvent.click(button); expect(updateTicketStatus).toHaveBeenCalledTimes(1); });
  it("concluído permite somente reabertura administrativa", () => { setup("ADMIN", { ...ticket, status: "COMPLETED", completed_at: "2026-07-15T14:00:00Z" }); expect(screen.getByRole("button", { name: "Reabrir" })).toBeDefined(); expect(screen.queryByLabelText("Responsável elegível")).toBeNull(); expect(screen.queryByLabelText("Prioridade")).toBeNull(); });
  it("cancelado bloqueia todas as ações", () => { setup("ADMIN", { ...ticket, status: "CANCELLED", cancelled_at: "2026-07-15T14:00:00Z" }); expect(screen.queryAllByRole("button")).toHaveLength(0); expect(screen.queryByLabelText("Responsável elegível")).toBeNull(); });
});
