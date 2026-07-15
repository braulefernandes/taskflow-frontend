import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "@/components/password-reset/forgot-password-form";
import { ResetPasswordForm } from "@/components/password-reset/reset-password-form";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { requestPasswordReset, resetPassword } from "@/services/password-reset";

const navigation = vi.hoisted(() => ({ token: "token-seguro", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: navigation.replace }), useSearchParams: () => new URLSearchParams(navigation.token ? `token=${encodeURIComponent(navigation.token)}` : "") }));
vi.mock("@/services/password-reset", () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));

function setup(component: React.ReactNode) { const client = createQueryClient(); client.setDefaultOptions({ mutations: { retry: false } }); return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>); }
function submitRecovery(email: string) { fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } }); fireEvent.click(screen.getByRole("button", { name: "Enviar instrucoes" })); }
function submitReset(password = "NovaSenha123", confirmation = password) { fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: password } }); fireEvent.change(screen.getByLabelText("Confirmacao da senha"), { target: { value: confirmation } }); fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" })); }

describe("recuperacao de senha", () => {
  beforeEach(() => { navigation.token = "token-seguro"; navigation.replace.mockReset(); vi.mocked(requestPasswordReset).mockReset(); vi.mocked(resetPassword).mockReset(); window.history.replaceState(null, "", "/"); });
  afterEach(cleanup);

  it("solicita recuperacao com e-mail normalizado", async () => { vi.mocked(requestPasswordReset).mockResolvedValue({ message: "ok" }); setup(<ForgotPasswordForm />); submitRecovery(" ANA@Example.COM "); await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith("ana@example.com")); });
  it("rejeita e-mail invalido sem chamar a API", async () => { setup(<ForgotPasswordForm />); submitRecovery("email-invalido"); expect(await screen.findByText("Informe um e-mail valido.")).toBeDefined(); expect(requestPasswordReset).not.toHaveBeenCalled(); });
  it("mostra sempre a resposta generica e impede novo envio", async () => { vi.mocked(requestPasswordReset).mockResolvedValue({ message: "detalhe que nao deve aparecer" }); setup(<ForgotPasswordForm />); submitRecovery("ana@example.com"); expect(await screen.findByText("Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha.")).toBeDefined(); expect(screen.queryByRole("button", { name: "Enviar instrucoes" })).toBeNull(); expect(screen.queryByText("detalhe que nao deve aparecer")).toBeNull(); });
  it("exibe loading e bloqueia multiplos envios", async () => { vi.mocked(requestPasswordReset).mockReturnValue(new Promise(() => undefined)); setup(<ForgotPasswordForm />); submitRecovery("ana@example.com"); const button = await screen.findByRole("button", { name: "Enviando..." }) as HTMLButtonElement; expect(button.disabled).toBe(true); fireEvent.click(button); expect(requestPasswordReset).toHaveBeenCalledTimes(1); });
  it("redefine senha enviando o token da URL", async () => { vi.mocked(resetPassword).mockResolvedValue({ message: "ok" }); setup(<ResetPasswordForm />); submitReset(); await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("token-seguro", "NovaSenha123")); });
  it("trata token ausente e nao renderiza senhas", () => { navigation.token = ""; setup(<ResetPasswordForm />); expect(screen.getByRole("alert").textContent).toContain("Token de redefinicao ausente"); expect(screen.queryByLabelText("Nova senha")).toBeNull(); });
  it("rejeita senha fora da politica do backend", async () => { setup(<ResetPasswordForm />); submitReset("curta1"); expect(await screen.findByText("A senha deve ter entre 8 e 128 caracteres e conter letras e numeros.")).toBeDefined(); expect(resetPassword).not.toHaveBeenCalled(); });
  it("rejeita confirmacao divergente", async () => { setup(<ResetPasswordForm />); submitReset("NovaSenha123", "OutraSenha123"); expect(await screen.findByText("As senhas informadas nao coincidem.")).toBeDefined(); expect(resetPassword).not.toHaveBeenCalled(); });
  it("mostra sucesso, limpa senha e remove token da URL", async () => { window.history.replaceState(null, "", "/redefinir-senha?token=token-seguro"); vi.mocked(resetPassword).mockResolvedValue({ message: "ok" }); setup(<ResetPasswordForm />); submitReset(); expect(await screen.findByText("Senha redefinida com sucesso. Redirecionando para o login.")).toBeDefined(); expect((screen.getByLabelText("Nova senha") as HTMLInputElement).value).toBe(""); expect(window.location.search).toBe(""); });
  it("trata token invalido sem expor detalhes", async () => { vi.mocked(resetPassword).mockRejectedValue(new ApiError({ status: 400, code: "invalid_reset_token", message: "interno" })); setup(<ResetPasswordForm />); submitReset(); const message = await screen.findByText("Este link e invalido, expirou ou ja foi utilizado. Solicite uma nova redefinicao."); expect(message).toBeDefined(); expect(screen.queryByText("interno")).toBeNull(); });
  it("trata token expirado com a mesma resposta segura", async () => { vi.mocked(resetPassword).mockRejectedValue(new ApiError({ status: 400, code: "invalid_reset_token", message: "expired" })); setup(<ResetPasswordForm />); submitReset(); expect(await screen.findByText(/Este link e invalido, expirou ou ja foi utilizado/)).toBeDefined(); });
  it("trata token usado com a mesma resposta segura", async () => { vi.mocked(resetPassword).mockRejectedValue(new ApiError({ status: 400, code: "invalid_reset_token", message: "used" })); setup(<ResetPasswordForm />); submitReset(); expect(await screen.findByText(/Este link e invalido, expirou ou ja foi utilizado/)).toBeDefined(); });
  it("redireciona ao login apos o sucesso", async () => { vi.mocked(resetPassword).mockResolvedValue({ message: "ok" }); setup(<ResetPasswordForm />); submitReset(); await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login?senha_redefinida=true"), { timeout: 1500 }); });
});
