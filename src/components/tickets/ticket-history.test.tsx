import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeHistoryEvent, formatHistoryValue, translateHistoryAction } from "@/lib/ticket-history-formatters";
import { listTicketHistory } from "@/services/ticket-history";
import type { TicketHistoryAction, TicketHistoryEvent } from "@/types/ticket-history";
import { createTestQueryClient } from "@/test/query-client";
import { TicketHistory } from "./ticket-history";

vi.mock("@/services/ticket-history", () => ({
  ticketHistoryQueryKey: (id: string) => ["tickets", "detail", id, "history"],
  listTicketHistory: vi.fn(),
}));

const id = "11111111-1111-4111-8111-111111111111";
function event(action: TicketHistoryAction, overrides: Partial<TicketHistoryEvent> = {}): TicketHistoryEvent {
  return { id: `${action}-id`, action, field_name: null, old_value: null, new_value: null, author: { id: "user-1", name: "Ana Silva", avatar_url: null }, created_at: "2026-07-15T15:00:00Z", ...overrides };
}
function setup() {
  const client = createTestQueryClient();
  return render(<QueryClientProvider client={client}><TicketHistory id={id} /></QueryClientProvider>);
}

describe("histórico da solicitação", () => {
  beforeEach(() => { vi.mocked(listTicketHistory).mockReset(); vi.mocked(listTicketHistory).mockResolvedValue([]); });
  afterEach(cleanup);

  it("exibe loading", () => { vi.mocked(listTicketHistory).mockReturnValue(new Promise(() => undefined)); setup(); expect(screen.getByRole("status", { name: "Carregando histórico" })).toBeDefined(); });
  it("exibe erro", async () => { vi.mocked(listTicketHistory).mockRejectedValue(new Error("falha")); setup(); expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o histórico"); expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeDefined(); });
  it("exibe vazio", async () => { setup(); expect(await screen.findByText("Nenhum evento registrado.")).toBeDefined(); });
  it("exibe criação sem códigos crus", async () => { vi.mocked(listTicketHistory).mockResolvedValue([event("CREATED")]); setup(); expect(await screen.findByText("Solicitação criada")).toBeDefined(); expect(screen.queryByText("CREATED")).toBeNull(); });
  it("formata alteração simples", () => { expect(describeHistoryEvent(event("TITLE_CHANGED", { old_value: "Título antigo", new_value: "Título novo" }))).toBe("Título alterado de Título antigo para Título novo"); });
  it("traduz status", () => { expect(describeHistoryEvent(event("STATUS_CHANGED", { old_value: "PENDING", new_value: "IN_PROGRESS" }))).toBe("Status alterado de Pendente para Em andamento"); });
  it("traduz prioridade", () => { expect(describeHistoryEvent(event("PRIORITY_CHANGED", { old_value: "LOW", new_value: "URGENT" }))).toBe("Prioridade alterada de Baixa para Urgente"); });
  it("formata responsável e remove UUID", () => { expect(describeHistoryEvent(event("ASSIGNEE_CHANGED", { old_value: null, new_value: "11111111-1111-4111-8111-111111111111 | João Silva" }))).toBe("Responsável alterado de Sem responsável para João Silva"); });
  it("formata prazo e prazo ausente", () => { const due = event("DUE_DATE_CHANGED", { old_value: null, new_value: "2026-07-20T18:00:00Z" }); expect(formatHistoryValue(due, null)).toBe("Sem prazo"); expect(formatHistoryValue(due, due.new_value)).toContain("20/07/2026"); });
  it("traduz cancelamento e seus status", () => { expect(describeHistoryEvent(event("CANCELLED", { old_value: "PENDING", new_value: "CANCELLED" }))).toBe("Solicitação cancelada de Pendente para Cancelada"); });
  it("exibe autor", async () => { vi.mocked(listTicketHistory).mockResolvedValue([event("CREATED")]); setup(); expect(await screen.findByText("Ana Silva")).toBeDefined(); });
  it("exibe data sem alterar o valor semântico", async () => { const created = event("CREATED"); vi.mocked(listTicketHistory).mockResolvedValue([created]); setup(); const time = await screen.findByText(/15\/07\/2026/); expect(time.getAttribute("datetime")).toBe(created.created_at); });
  it("formata nulos por contexto", () => { expect(formatHistoryValue(event("CATEGORY_CHANGED"), null)).toBe("Sem categoria"); expect(formatHistoryValue(event("TITLE_CHANGED"), null)).toBe("Não informado"); expect(formatHistoryValue(event("ASSIGNEE_REMOVED"), null)).toBe("Sem responsável"); });
  it("centraliza a tradução de todas as ações", () => { const actions: TicketHistoryAction[] = ["CREATED", "TITLE_CHANGED", "DESCRIPTION_CHANGED", "CATEGORY_CHANGED", "PRIORITY_CHANGED", "DUE_DATE_CHANGED", "ASSIGNED", "ASSIGNEE_CHANGED", "ASSIGNEE_REMOVED", "STATUS_CHANGED", "COMPLETED", "REOPENED", "CANCELLED"]; for (const action of actions) expect(translateHistoryAction(action)).not.toBe(action); });
  it("usa layout responsivo sem largura fixa", async () => { vi.mocked(listTicketHistory).mockResolvedValue([event("CREATED")]); const { container } = setup(); await screen.findByText("Solicitação criada"); expect(container.querySelector(".sm\\:flex-row")).toBeDefined(); expect(container.querySelector(".sm\\:pl-8")).toBeDefined(); expect(container.querySelector("[class*='w-[']")).toBeNull(); });
  it("oferece estrutura acessível de seção, lista e itens", async () => { vi.mocked(listTicketHistory).mockResolvedValue([event("CREATED"), event("CANCELLED", { id: "cancel-id", old_value: "PENDING", new_value: "CANCELLED" })]); setup(); expect(screen.getByRole("heading", { name: "Histórico" })).toBeDefined(); const list = await screen.findByRole("list", { name: "Linha do tempo da solicitação" }); expect(within(list).getAllByRole("listitem")).toHaveLength(2); expect(within(list).getByRole("article", { name: "Solicitação criada" })).toBeDefined(); });
});
