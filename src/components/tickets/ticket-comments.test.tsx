import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { useSession } from "@/providers/session-provider";
import { createTicketComment, listTicketComments, ticketCommentsQueryKey } from "@/services/ticket-comments";
import type { TicketComment } from "@/types/ticket-comments";
import type { TicketSummary } from "@/types/tickets";
import { createTestQueryClient } from "@/test/query-client";
import { canCommentOnTicket, TicketComments } from "./ticket-comments";

vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/ticket-comments", () => ({
  ticketCommentsQueryKey: (id: string) => ["tickets", "detail", id, "comments"],
  listTicketComments: vi.fn(),
  createTicketComment: vi.fn(),
}));

const ticket: TicketSummary = { id: "ticket-1", title: "Ticket", description: "Descrição", status: "IN_PROGRESS", priority: "MEDIUM", due_date: null, started_at: null, completed_at: null, cancelled_at: null, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z", organization: { id: "org", name: "Org", slug: "org" }, category: { id: "cat", name: "Categoria", description: null }, requester: { id: "user-1", name: "Ana" }, assignee: { id: "agent-1", name: "Agente" }, is_overdue: false, overdue_seconds: 0 };
const comments: TicketComment[] = [
  { id: "c1", ticket_id: ticket.id, content: "Primeiro comentário", author: { id: "user-1", name: "Ana Silva", avatar_url: null }, created_at: "2026-07-15T12:00:00Z", updated_at: "2026-07-15T12:00:00Z" },
  { id: "c2", ticket_id: ticket.id, content: "Segundo comentário", author: { id: "agent-1", name: "Bruno Lima", avatar_url: "https://example.com/avatar.png" }, created_at: "2026-07-15T13:30:00Z", updated_at: "2026-07-15T13:30:00Z" },
];

function session(role = "ADMIN", userId = "admin") { return { status: "authenticated", session: { user: { id: userId, name: "Usuário", email: "u@example.com", avatar_url: null, is_active: true }, organization: { id: "org", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } } } as ReturnType<typeof useSession>; }
function setup(currentTicket = ticket) {
  const client = createTestQueryClient();
  const view = render(<QueryClientProvider client={client}><TicketComments ticket={currentTicket} /></QueryClientProvider>);
  return { ...view, client };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

describe("comentários da solicitação", () => {
  beforeEach(() => { vi.mocked(useSession).mockReturnValue(session()); vi.mocked(listTicketComments).mockReset(); vi.mocked(createTicketComment).mockReset(); vi.mocked(listTicketComments).mockResolvedValue([]); });
  afterEach(cleanup);

  it("exibe loading", () => { vi.mocked(listTicketComments).mockReturnValue(new Promise(() => undefined)); setup(); expect(screen.getByRole("status", { name: "Carregando comentários" })).toBeDefined(); });
  it("exibe erro e permite tentar novamente", async () => { vi.mocked(listTicketComments).mockRejectedValue(new Error("falha")); setup(); expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar"); expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeDefined(); });
  it("exibe estado vazio", async () => { setup(); expect(await screen.findByText("Nenhum comentário ainda. Seja o primeiro a participar.")).toBeDefined(); });
  it("lista conteúdo, autor, avatar opcional e data em ordem recebida", async () => { vi.mocked(listTicketComments).mockResolvedValue(comments); setup(); const list = await screen.findByRole("list", { name: "Comentários em ordem cronológica" }); const items = within(list).getAllByRole("listitem"); expect(items).toHaveLength(2); expect(items[0].textContent).toContain("Ana Silva"); expect(items[0].textContent).toContain("Primeiro comentário"); expect(items[1].textContent).toContain("Bruno Lima"); expect(items[1].textContent).toContain("Segundo comentário"); expect(within(items[0]).getByText(/15\/07\/2026/).getAttribute("datetime")).toBe(comments[0].created_at); expect(within(items[1]).getByRole("presentation").getAttribute("src")).toBe(comments[1].author.avatar_url); });
  it("valida comentário vazio após trim e mantém foco", async () => { setup(); await screen.findByText(/Nenhum comentário/); const field = screen.getByLabelText("Novo comentário"); fireEvent.change(field, { target: { value: "   " } }); fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" })); expect(await screen.findByText("Escreva um comentário antes de enviar.")).toBeDefined(); expect(document.activeElement).toBe(field); expect(createTicketComment).not.toHaveBeenCalled(); });
  it("envia comentário válido com trim, limpa e devolve foco", async () => { vi.mocked(createTicketComment).mockResolvedValue(comments[0]); setup(); await screen.findByText(/Nenhum comentário/); const field = screen.getByLabelText("Novo comentário") as HTMLTextAreaElement; fireEvent.change(field, { target: { value: "  Texto válido  " } }); fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" })); await waitFor(() => expect(createTicketComment).toHaveBeenCalledWith(ticket.id, { content: "Texto válido" })); await waitFor(() => expect(field.value).toBe("")); expect(document.activeElement).toBe(field); });
  it("bloqueia envio duplicado e apresenta loading", async () => { const pending = deferred<TicketComment>(); vi.mocked(createTicketComment).mockReturnValue(pending.promise); setup(); await screen.findByText(/Nenhum comentário/); fireEvent.change(screen.getByLabelText("Novo comentário"), { target: { value: "Comentário" } }); const button = screen.getByRole("button", { name: "Enviar comentário" }); fireEvent.click(button); expect((await screen.findByRole("button", { name: "Enviando..." }) as HTMLButtonElement).disabled).toBe(true); fireEvent.click(screen.getByRole("button", { name: "Enviando..." })); expect(createTicketComment).toHaveBeenCalledTimes(1); pending.resolve(comments[0]); });
  it("exibe erro da API sem limpar o texto", async () => { vi.mocked(createTicketComment).mockRejectedValue(new ApiError({ status: 500, message: "falha" })); setup(); await screen.findByText(/Nenhum comentário/); const field = screen.getByLabelText("Novo comentário") as HTMLTextAreaElement; fireEvent.change(field, { target: { value: "Preservar" } }); fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" })); expect(await screen.findByText("Não foi possível enviar o comentário. Tente novamente.")).toBeDefined(); expect(field.value).toBe("Preservar"); });
  it("invalida e atualiza o cache sem inserir comentário local duplicado", async () => { vi.mocked(listTicketComments).mockResolvedValueOnce([]).mockResolvedValueOnce(comments); vi.mocked(createTicketComment).mockResolvedValue(comments[0]); const { client } = setup(); await screen.findByText(/Nenhum comentário/); fireEvent.change(screen.getByLabelText("Novo comentário"), { target: { value: "Primeiro comentário" } }); fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" })); expect(await screen.findByText("Primeiro comentário")).toBeDefined(); expect(client.getQueryData(ticketCommentsQueryKey(ticket.id))).toEqual(comments); expect(screen.getAllByText("Primeiro comentário")).toHaveLength(1); });
  it("oculta formulário em ticket cancelado", async () => { setup({ ...ticket, status: "CANCELLED" }); expect(await screen.findByText("Solicitações canceladas não aceitam novos comentários.")).toBeDefined(); expect(screen.queryByLabelText("Novo comentário")).toBeNull(); });
  it("mantém formulário em ticket concluído", async () => { setup({ ...ticket, status: "COMPLETED" }); await screen.findByText(/Nenhum comentário/); expect(screen.getByLabelText("Novo comentário")).toBeDefined(); });
  it("oculta formulário para usuário sem permissão", async () => { vi.mocked(useSession).mockReturnValue(session("REQUESTER", "outro")); setup(); expect(await screen.findByText("Você não tem permissão para comentar nesta solicitação.")).toBeDefined(); expect(screen.queryByRole("button", { name: "Enviar comentário" })).toBeNull(); });
  it("reflete as regras visuais de papel e vínculo", () => { expect(canCommentOnTicket(ticket, "ADMIN", "x")).toBe(true); expect(canCommentOnTicket(ticket, "AGENT", "agent-1")).toBe(true); expect(canCommentOnTicket(ticket, "REQUESTER", "user-1")).toBe(true); expect(canCommentOnTicket(ticket, "REQUESTER", "x")).toBe(false); expect(canCommentOnTicket({ ...ticket, status: "CANCELLED" }, "ADMIN", "x")).toBe(false); });
  it("associa rótulo, ajuda, contador e erro ao campo", async () => { setup(); await screen.findByText(/Nenhum comentário/); const field = screen.getByLabelText("Novo comentário"); expect(field.getAttribute("maxlength")).toBe("5000"); expect(field.getAttribute("aria-describedby")).toBe("ticket-comment-count"); expect(screen.getByText("0/5000 caracteres")).toBeDefined(); expect(screen.getByText(/Evite incluir senhas/)).toBeDefined(); });
});
