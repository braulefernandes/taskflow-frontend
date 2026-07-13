import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { PrivateRouteGuard } from "@/components/auth/private-route-guard";
import { PrivateShell } from "@/components/auth/private-shell";
import { PublicRouteGuard } from "@/components/auth/public-route-guard";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";
import { getCurrentSession, loginAccount, logoutSession } from "@/services/auth";

const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}));

vi.mock("@/services/auth", () => ({
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

function CacheMarker() {
  const queryClient = useQueryClient();
  queryClient.setQueryData(["session-marker"], "cached");
  return null;
}

function renderWithSession(children: React.ReactNode) {
  const queryClient = createQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}

describe("route guards", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getCurrentSession).mockReset();
    vi.mocked(loginAccount).mockReset();
    vi.mocked(logoutSession).mockReset();
    routerReplaceMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("redirects unauthenticated users away from private routes without rendering private content", async () => {
    renderWithSession(
      <PrivateRouteGuard>
        <p>Conteudo privado</p>
      </PrivateRouteGuard>,
    );

    expect(screen.getByRole("status", { name: "Validando sessao" })).toBeDefined();
    expect(screen.queryByText("Conteudo privado")).toBeNull();

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("renders private content for authenticated users", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);

    renderWithSession(
      <PrivateRouteGuard>
        <p>Conteudo privado</p>
      </PrivateRouteGuard>,
    );

    expect(await screen.findByText("Conteudo privado")).toBeDefined();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("shows validation state while checking a stored token", () => {
    window.localStorage.setItem("taskflow.access_token", "validating-token");
    vi.mocked(getCurrentSession).mockReturnValueOnce(new Promise(() => undefined));

    renderWithSession(
      <PrivateRouteGuard>
        <p>Conteudo privado</p>
      </PrivateRouteGuard>,
    );

    expect(screen.getByRole("status", { name: "Validando sessao" })).toBeDefined();
    expect(screen.queryByText("Conteudo privado")).toBeNull();
  });

  it("clears invalid tokens and redirects", async () => {
    window.localStorage.setItem("taskflow.access_token", "invalid-token");
    vi.mocked(getCurrentSession).mockRejectedValueOnce(
      new ApiError({
        status: 401,
        code: "not_authenticated",
        message: "Nao autenticado.",
      }),
    );

    renderWithSession(
      <PrivateRouteGuard>
        <p>Conteudo privado</p>
      </PrivateRouteGuard>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("taskflow.access_token")).toBeNull();
      expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Conteudo privado")).toBeNull();
  });

  it("clears expired tokens and redirects", async () => {
    window.localStorage.setItem("taskflow.access_token", "expired-token");
    vi.mocked(getCurrentSession).mockRejectedValueOnce(
      new ApiError({
        status: 401,
        code: "not_authenticated",
        message: "Nao autenticado.",
      }),
    );

    renderWithSession(
      <PrivateRouteGuard>
        <p>Conteudo privado</p>
      </PrivateRouteGuard>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("taskflow.access_token")).toBeNull();
      expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects authenticated users away from login public pages", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);

    renderWithSession(
      <PublicRouteGuard>
        <p>Formulario de login</p>
      </PublicRouteGuard>,
    );

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByText("Formulario de login")).toBeNull();
  });

  it("redirects authenticated users away from cadastro public pages", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);

    renderWithSession(
      <PublicRouteGuard>
        <p>Formulario de cadastro</p>
      </PublicRouteGuard>,
    );

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByText("Formulario de cadastro")).toBeNull();
  });

  it("logs out, clears token, clears cache and redirects", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);
    vi.mocked(logoutSession).mockResolvedValueOnce({
      message: "Logout registrado no cliente. Descarte o token localmente.",
      token_revoked: false,
    });
    const { queryClient } = renderWithSession(
      <>
        <CacheMarker />
        <PrivateShell>
          <p>Conteudo privado</p>
        </PrivateShell>
      </>,
    );

    expect(await screen.findByText("Ana Silva")).toBeDefined();
    expect(queryClient.getQueryData(["session-marker"])).toBe("cached");

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(logoutSession).toHaveBeenCalled();
      expect(window.localStorage.getItem("taskflow.access_token")).toBeNull();
      expect(queryClient.getQueryData(["session-marker"])).toBeUndefined();
      expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("clears local session even when logout fails by network", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);
    vi.mocked(logoutSession).mockRejectedValueOnce(new TypeError("Failed fetch"));

    renderWithSession(
      <PrivateShell>
        <p>Conteudo privado</p>
      </PrivateShell>,
    );

    expect(await screen.findByText("Ana Silva")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("taskflow.access_token")).toBeNull();
      expect(routerReplaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
