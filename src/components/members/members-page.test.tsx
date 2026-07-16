import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from "@/components/members/members-page";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { useSession } from "@/providers/session-provider";
import { createMember, listMembers, updateMemberRole, updateMemberStatus } from "@/services/members";
import type { Member, MemberList } from "@/types/members";

vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/members", async (original) => ({
  ...(await original<typeof import("@/services/members")>()),
  listMembers: vi.fn(), createMember: vi.fn(), updateMemberRole: vi.fn(), updateMemberStatus: vi.fn(),
}));

const member: Member = { id: "member-1", user_id: "user-1", name: "Ana Silva", email: "ana@example.com", role: "AGENT", is_active: true, created_at: "2026-07-14T12:00:00Z", updated_at: "2026-07-14T12:00:00Z" };
const list: MemberList = { items: [member], total: 1, page: 1, page_size: 20 };
const session = (role: "ADMIN" | "MANAGER" = "ADMIN") => ({ status: "authenticated", session: { user: { id: "u", name: "Admin", email: "admin@example.com", avatar_url: null, is_active: true }, organization: { id: "o", name: "Org", slug: "org" }, membership: { id: "m", role, is_active: true } }, signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), updateSessionUser: vi.fn() } as const);

function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return { client, ...render(<QueryClientProvider client={client}><MembersPage /></QueryClientProvider>) };
}

async function openAndFillForm() {
  fireEvent.click(screen.getByRole("button", { name: "Novo membro" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Bruno Lima" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "bruno@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha temporária"), { target: { value: "Temporaria123" } });
}

describe("gerenciamento de membros", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue(session());
    vi.mocked(listMembers).mockReset();
    vi.mocked(listMembers).mockResolvedValue(list);
    vi.mocked(createMember).mockReset();
    vi.mocked(updateMemberRole).mockReset();
    vi.mocked(updateMemberStatus).mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("permite que administrador acesse a página", async () => { setup(); expect(await screen.findByRole("heading", { name: "Membros" })).toBeDefined(); });
  it("bloqueia visualmente outro papel e não consulta o backend", () => { vi.mocked(useSession).mockReturnValue(session("MANAGER")); setup(); expect(screen.getByRole("alert").textContent).toContain("Apenas administradores"); expect(listMembers).not.toHaveBeenCalled(); });
  it("lista nome, e-mail, papel, status e entrada", async () => { setup(); expect(await screen.findByText("Ana Silva")).toBeDefined(); expect(screen.getByText("ana@example.com")).toBeDefined(); expect(screen.getByText("Ativo")).toBeDefined(); expect(screen.getByText("14/07/2026")).toBeDefined(); });
  it("exibe loading", () => { vi.mocked(listMembers).mockReturnValue(new Promise(() => undefined)); setup(); expect(screen.getByRole("status", { name: "Carregando membros" })).toBeDefined(); });
  it("exibe vazio", async () => { vi.mocked(listMembers).mockResolvedValue({ ...list, items: [], total: 0 }); setup(); expect(await screen.findByText("Nenhum membro encontrado")).toBeDefined(); });
  it("exibe erro e permite tentar novamente", async () => { vi.mocked(listMembers).mockRejectedValue(new Error("falha")); setup(); expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar"); expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeDefined(); });
  it("cria membro com o contrato real e inválida o cache", async () => { const created = { ...member, id: "member-2", name: "Bruno Lima", email: "bruno@example.com" }; vi.mocked(createMember).mockResolvedValue(created); const { client } = setup(); const invalidate = vi.spyOn(client, "invalidateQueries"); await screen.findByText("Ana Silva"); await openAndFillForm(); fireEvent.click(screen.getByRole("button", { name: "Adicionar membro" })); await waitFor(() => expect(createMember).toHaveBeenCalledWith({ name: "Bruno Lima", email: "bruno@example.com", role: "AGENT", temporary_password: "Temporaria123" }, expect.anything())); await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["members"] })); expect(screen.getByRole("status").textContent).toContain("Bruno Lima foi adicionado"); });
  it("trata duplicidade no e-mail", async () => { vi.mocked(createMember).mockRejectedValue(new ApiError({ status: 409, code: "membership_already_exists", message: "duplicado" })); setup(); await screen.findByText("Ana Silva"); await openAndFillForm(); fireEvent.click(screen.getByRole("button", { name: "Adicionar membro" })); expect((await screen.findAllByText("Este e-mail já pertence a organização.")).length).toBeGreaterThan(0); });
  it("altera papel com confirmação e atualiza o cache", async () => { vi.mocked(updateMemberRole).mockResolvedValue({ ...member, role: "MANAGER" }); const { client } = setup(); await screen.findByText("Ana Silva"); fireEvent.change(screen.getByLabelText("Papel de Ana Silva"), { target: { value: "MANAGER" } }); await waitFor(() => expect(updateMemberRole).toHaveBeenCalledWith("member-1", "MANAGER")); await waitFor(() => expect(client.getQueriesData<MemberList>({ queryKey: ["members"] })[0]?.[1]?.items[0].role).toBe("MANAGER")); });
  it("mostra a regra do ultimo administrador", async () => { vi.mocked(updateMemberRole).mockRejectedValue(new ApiError({ status: 409, code: "last_active_admin", message: "ultimo" })); vi.mocked(listMembers).mockResolvedValue({ ...list, items: [{ ...member, role: "ADMIN" }] }); setup(); await screen.findByText("Ana Silva"); fireEvent.change(screen.getByLabelText("Papel de Ana Silva"), { target: { value: "AGENT" } }); expect(await screen.findByText("A organização deve manter ao menos um administrador ativo.")).toBeDefined(); });
  it("desativa com confirmação e feedback", async () => { vi.mocked(updateMemberStatus).mockResolvedValue({ ...member, is_active: false }); setup(); await screen.findByText("Ana Silva"); fireEvent.click(screen.getByRole("button", { name: "Desativar" })); expect(confirm).toHaveBeenCalledWith("Deseja desativar Ana Silva?"); expect(await screen.findByText("Membro Ana Silva desativado.")).toBeDefined(); });
  it("ativa membro inativo", async () => { vi.mocked(listMembers).mockResolvedValue({ ...list, items: [{ ...member, is_active: false }] }); vi.mocked(updateMemberStatus).mockResolvedValue(member); setup(); await screen.findByText("Inativo"); fireEvent.click(screen.getByRole("button", { name: "Ativar" })); expect(await screen.findByText("Membro Ana Silva ativado.")).toBeDefined(); });
  it("faz rollback visual quando a alteração de status falha", async () => { vi.mocked(updateMemberStatus).mockRejectedValue(new Error("falha")); setup(); await screen.findByText("Ativo"); fireEvent.click(screen.getByRole("button", { name: "Desativar" })); await waitFor(() => expect(screen.getByText("Ativo")).toBeDefined()); expect(await screen.findByText("Não foi possível concluir a operacao. Tente novamente.")).toBeDefined(); });
  it("envia busca e filtros suportados pelo backend", async () => { setup(); await screen.findByText("Ana Silva"); fireEvent.change(screen.getByLabelText("Buscar membros"), { target: { value: "ana" } }); fireEvent.change(screen.getByLabelText("Filtrar por papel"), { target: { value: "AGENT" } }); fireEvent.change(screen.getByLabelText("Filtrar por status"), { target: { value: "true" } }); await waitFor(() => expect(listMembers).toHaveBeenCalledWith(expect.objectContaining({ search: "ana", role: "AGENT", is_active: true }), expect.any(AbortSignal)), { timeout: 1000 }); });
  it("mantem tabela navegavel em viewport estreita", async () => { setup(); await screen.findByText("Ana Silva"); expect(screen.getByRole("table").parentElement?.className).toContain("overflow-x-auto"); expect(screen.getByRole("table").className).toContain("min-w-[760px]"); });
});
