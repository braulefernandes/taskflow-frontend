import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "@/components/profile/profile-page";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { useSession } from "@/providers/session-provider";
import { authMeQueryKey, updateOwnProfile } from "@/services/auth";
import type { MeResponse } from "@/types/auth";

vi.mock("@/providers/session-provider", () => ({ useSession: vi.fn() }));
vi.mock("@/services/auth", async (original) => ({ ...(await original<typeof import("@/services/auth")>()), updateOwnProfile: vi.fn() }));

const current: MeResponse = {
  user: { id: "u1", name: "Ana Silva", email: "ana@example.com", avatar_url: "https://example.com/ana.png", is_active: true },
  organization: { id: "o1", name: "Acme Suporte", slug: "acme" },
  membership: { id: "m1", role: "MANAGER", is_active: true },
};
const updateSessionUser = vi.fn();

function session(value: MeResponse | null = current) {
  return { status: value ? "authenticated" as const : "unauthenticated" as const, session: value, signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), updateSessionUser };
}
function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  return { client, ...render(<QueryClientProvider client={client}><ProfilePage /></QueryClientProvider>) };
}

describe("perfil do usuário", () => {
  beforeEach(() => { vi.mocked(useSession).mockReturnValue(session()); vi.mocked(updateOwnProfile).mockReset(); updateSessionUser.mockReset(); });
  afterEach(cleanup);

  it("renderiza a página e o formulário", () => { setup(); expect(screen.getByRole("heading", { name: "Meu perfil" })).toBeDefined(); expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDefined(); });
  it("exibe os dados atuais", () => { setup(); expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Ana Silva"); expect((screen.getByLabelText("URL do avatar") as HTMLInputElement).value).toBe("https://example.com/ana.png"); });
  it("edita o nome usando o contrato do backend", async () => { vi.mocked(updateOwnProfile).mockResolvedValue({ ...current.user, name: "Ana Atualizada" }); setup(); fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Atualizada" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); await waitFor(() => expect(updateOwnProfile).toHaveBeenCalledWith({ name: "Ana Atualizada", avatar_url: "https://example.com/ana.png" })); });
  it("aceita avatar HTTP ou HTTPS e permite remover", async () => { vi.mocked(updateOwnProfile).mockResolvedValue({ ...current.user, avatar_url: null }); setup(); fireEvent.change(screen.getByLabelText("URL do avatar"), { target: { value: "" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); await waitFor(() => expect(updateOwnProfile).toHaveBeenCalledWith({ name: "Ana Silva", avatar_url: null })); });
  it.each(["avatar-invalido", "ftp://example.com/avatar.png"])("rejeita avatar inválido: %s", async (avatar) => { setup(); fireEvent.change(screen.getByLabelText("URL do avatar"), { target: { value: avatar } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); expect(await screen.findByText("Informe uma URL HTTP ou HTTPS válida.")).toBeDefined(); expect(updateOwnProfile).not.toHaveBeenCalled(); });
  it("mantem e-mail, organização e papel somente leitura", () => { setup(); for (const label of ["E-mail", "Organização", "Papel"]) { const field = screen.getByLabelText(label) as HTMLInputElement; expect(field.readOnly).toBe(true); } expect((screen.getByLabelText("Papel") as HTMLInputElement).value).toBe("Gerente"); });
  it("mostra sucesso, atualiza sessão e mantem dados salvos", async () => { const updated = { ...current.user, name: "Novo Nome" }; vi.mocked(updateOwnProfile).mockResolvedValue(updated); setup(); fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Novo Nome" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); expect(await screen.findByText("Perfil atualizado com sucesso.")).toBeDefined(); expect(updateSessionUser).toHaveBeenCalledWith(updated); expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Novo Nome"); });
  it("mostra erro da API sem perder os dados editados", async () => { vi.mocked(updateOwnProfile).mockRejectedValue(new ApiError({ status: 500, message: "falha" })); setup(); fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Nome em edição" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); expect(await screen.findByText("Não foi possível atualizar o perfil. Tente novamente.")).toBeDefined(); expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Nome em edição"); });
  it("atualiza e inválida o cache de auth me", async () => { const updated = { ...current.user, name: "Nome no Cache" }; vi.mocked(updateOwnProfile).mockResolvedValue(updated); const { client } = setup(); const invalidate = vi.spyOn(client, "invalidateQueries"); fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Nome no Cache" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); await waitFor(() => expect(client.getQueryData<MeResponse>(authMeQueryKey)?.user.name).toBe("Nome no Cache")); expect(invalidate).toHaveBeenCalledWith({ queryKey: authMeQueryKey, refetchType: "none" }); });
  it("trata ausência de sessão sem chamar a API", () => { vi.mocked(useSession).mockReturnValue(session(null)); setup(); expect(screen.getByRole("alert").textContent).toContain("Entre novamente"); expect(updateOwnProfile).not.toHaveBeenCalled(); });
});
