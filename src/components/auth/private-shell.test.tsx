import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateShell } from "@/components/auth/private-shell";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";
import { getCurrentSession, logoutSession } from "@/services/auth";
import type { MeResponse } from "@/types/auth";

const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/services/auth", () => ({ authMeQueryKey: ["auth", "me"], getCurrentSession: vi.fn(), loginAccount: vi.fn(), logoutSession: vi.fn() }));

function session(role: MeResponse["membership"]["role"]): MeResponse {
  return { user: { id: "u1", name: "Ana Silva", email: "ana@example.com", avatar_url: null, is_active: true }, organization: { id: "o1", name: "Acme Suporte", slug: "acme" }, membership: { id: "m1", role, is_active: true } };
}

function renderShell(role: MeResponse["membership"]["role"] = "ADMIN") {
  localStorage.setItem("taskflow.access_token", "token");
  vi.mocked(getCurrentSession).mockResolvedValueOnce(session(role));
  return render(<QueryClientProvider client={createQueryClient()}><SessionProvider><PrivateShell><p>Conteúdo privado</p></PrivateShell></SessionProvider></QueryClientProvider>);
}

describe("private layout", () => {
  beforeEach(() => { localStorage.clear(); replaceMock.mockReset(); vi.mocked(getCurrentSession).mockReset(); vi.mocked(logoutSession).mockReset(); });
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("renders reusable layout with user, organization, role, content and active route", async () => {
    renderShell();
    expect(await screen.findByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("Acme Suporte")).toBeDefined();
    expect(screen.getByText("Administrador")).toBeDefined();
    expect(screen.getByText("Conteúdo privado")).toBeDefined();
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeDefined();
  });

  it("shows administrative navigation to ADMIN", async () => {
    renderShell("ADMIN");
    await screen.findByText("Ana Silva");
    expect(screen.getByRole("link", { name: "Usuários" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Categorias" })).toBeDefined();
  });

  it.each(["MANAGER", "AGENT", "REQUESTER"] as const)("hides administrative navigation from %s", async (role) => {
    renderShell(role);
    await screen.findByText("Ana Silva");
    expect(screen.queryByRole("link", { name: "Usuários" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Categorias" })).toBeNull();
    expect(screen.getByRole("link", { name: "Perfil" })).toBeDefined();
  });

  it("opens and closes the functional mobile menu", async () => {
    renderShell();
    await screen.findByText("Ana Silva");
    const trigger = screen.getByRole("button", { name: "Abrir menu" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    const menu = screen.getByLabelText("Menu mobile");
    expect(within(menu).getByRole("link", { name: "Dashboard" })).toBeDefined();
    expect(within(menu).getByRole("link", { name: /Usu/ })).toBeDefined();
    expect(within(menu).getByRole("link", { name: "Categorias" })).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("Menu mobile")).toBeNull();
  });

  it("keeps administrative items out of the mobile menu for non-admin roles", async () => {
    renderShell("AGENT");
    await screen.findByText("Ana Silva");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const menu = screen.getByLabelText("Menu mobile");
    expect(within(menu).queryByRole("link", { name: /Usu/ })).toBeNull();
    expect(within(menu).queryByRole("link", { name: "Categorias" })).toBeNull();
    expect(within(menu).getByRole("link", { name: "Perfil" })).toBeDefined();
  });

  it("supports the keyboard-accessible user menu and logout", async () => {
    vi.mocked(logoutSession).mockResolvedValueOnce({ message: "ok", token_revoked: false });
    renderShell();
    const trigger = await screen.findByRole("button", { name: /Ana Silva/ });
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "Sair" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });
});
