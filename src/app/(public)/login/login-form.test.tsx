import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";
import { getCurrentSession, loginAccount, logoutSession } from "@/services/auth";
import LoginPage from "@/app/(public)/login/page";

const routerPushMock = vi.hoisted(() => vi.fn());
const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/auth", () => ({
  authMeQueryKey: ["auth", "me"],
  getCurrentSession: vi.fn(),
  loginAccount: vi.fn(),
  logoutSession: vi.fn(),
}));

const session = {
  user: {
    id: "user-id",
    name: "Ana Silva",
    email: "ana@example.com",
    avatar_url: null,
    is_active: true,
  },
  organization: {
    id: "org-id",
    name: "Acme Suporte",
    slug: "acme-suporte",
  },
  membership: {
    id: "membership-id",
    role: "ADMIN",
    is_active: true,
  },
} as const;

function renderLogin() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <LoginPage />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "Senha123" },
  });
}

function submitLoginForm() {
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getCurrentSession).mockReset();
    vi.mocked(loginAccount).mockReset();
    vi.mocked(logoutSession).mockReset();
    routerPushMock.mockReset();
    routerReplaceMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the login form", async () => {
    renderLogin();

    expect(await screen.findByLabelText("E-mail")).toBeDefined();
    expect(screen.getByLabelText("Senha")).toBeDefined();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Criar conta" })).toBeDefined();
  });

  it("validates login fields", async () => {
    renderLogin();

    await screen.findByRole("button", { name: "Entrar" });
    submitLoginForm();

    expect(await screen.findAllByText("Campo obrigatório.")).toHaveLength(2);
    expect(loginAccount).not.toHaveBeenCalled();
  });

  it("validates invalid email", async () => {
    renderLogin();

    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "email-invalido" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "Senha123" },
    });
    submitLoginForm();

    expect(await screen.findByText("Informe um e-mail válido.")).toBeDefined();
    expect(loginAccount).not.toHaveBeenCalled();
  });

  it("logs in, stores the token, fetches /auth/me and redirects", async () => {
    vi.mocked(loginAccount).mockResolvedValueOnce({
      access_token: "jwt-token",
      token_type: "bearer",
      expires_in: 1800,
    });
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);
    renderLogin();

    await screen.findByLabelText("E-mail");
    fillLoginForm();
    submitLoginForm();

    await waitFor(() => {
      expect(loginAccount).toHaveBeenCalledWith({
        email: "ana@example.com",
        password: "Senha123",
      });
    });
    expect(window.localStorage.getItem("taskflow.access_token")).toBe(
      "jwt-token",
    );
    expect(getCurrentSession).toHaveBeenCalledWith("jwt-token");
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a generic invalid credentials error", async () => {
    vi.mocked(loginAccount).mockRejectedValueOnce(
      new ApiError({
        status: 401,
        code: "invalid_credentials",
        message: "Credenciais inválidas.",
      }),
    );
    renderLogin();

    await screen.findByLabelText("E-mail");
    fillLoginForm();
    submitLoginForm();

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeDefined();
  });

  it("disables the button while logging in", async () => {
    vi.mocked(loginAccount).mockReturnValueOnce(new Promise(() => undefined));
    renderLogin();

    await screen.findByLabelText("E-mail");
    fillLoginForm();
    submitLoginForm();

    const button = await screen.findByRole("button", { name: "Entrando..." });
    expect(button).toHaveProperty("disabled", true);
  });

  it("clears invalid stored token while validating the session", async () => {
    window.localStorage.setItem("taskflow.access_token", "invalid-token");
    vi.mocked(getCurrentSession).mockRejectedValueOnce(
      new ApiError({
        status: 401,
        code: "not_authenticated",
        message: "Não autenticado.",
      }),
    );
    renderLogin();

    expect(await screen.findByLabelText("E-mail")).toBeDefined();
    expect(window.localStorage.getItem("taskflow.access_token")).toBeNull();
  });

  it("redirects authenticated users away from login", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);
    renderLogin();

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByLabelText("E-mail")).toBeNull();
  });
});
