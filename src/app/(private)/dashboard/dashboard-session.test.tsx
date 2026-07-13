import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";
import { getCurrentSession, loginAccount, logoutSession } from "@/services/auth";
import DashboardPage from "@/app/(private)/dashboard/page";

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

function renderDashboard() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <DashboardPage />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getCurrentSession).mockReset();
    vi.mocked(loginAccount).mockReset();
    vi.mocked(logoutSession).mockReset();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders authenticated user details", async () => {
    window.localStorage.setItem("taskflow.access_token", "valid-token");
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session);

    renderDashboard();

    expect(await screen.findByText("Sessao autenticada.")).toBeDefined();
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("ana@example.com")).toBeDefined();
    expect(screen.getByText("Acme Suporte")).toBeDefined();
    expect(screen.getByText("ADMIN")).toBeDefined();
    expect(getCurrentSession).toHaveBeenCalledWith("valid-token");
  });
});
