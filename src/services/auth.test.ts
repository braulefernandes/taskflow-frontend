import { describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import {
  getCurrentSession,
  loginAccount,
  logoutSession,
  registerAccount,
  updateOwnProfile,
  toLoginRequest,
  toRegisterRequest,
} from "@/services/auth";
import type { RegisterFormValues } from "@/schemas/register";
import type { LoginFormValues } from "@/schemas/login";

vi.mock("@/lib/http-client", () => ({
  httpClient: vi.fn(),
}));

const formValues: RegisterFormValues = {
  name: "Ana Silva",
  email: "ana@example.com",
  organizationName: "Acme Suporte",
  password: "Senha123",
  passwordConfirmation: "Senha123",
};

const loginValues: LoginFormValues = {
  email: "ana@example.com",
  password: "Senha123",
};

describe("auth service", () => {
  it("builds the register payload without password confirmation", () => {
    expect(toRegisterRequest(formValues)).toEqual({
      user_name: "Ana Silva",
      email: "ana@example.com",
      password: "Senha123",
      organization_name: "Acme Suporte",
    });
  });

  it("posts register data to the auth endpoint", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});

    await registerAccount(formValues);

    expect(httpClient).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: {
        user_name: "Ana Silva",
        email: "ana@example.com",
        password: "Senha123",
        organization_name: "Acme Suporte",
      },
    });
  });

  it("builds the login payload", () => {
    expect(toLoginRequest(loginValues)).toEqual({
      email: "ana@example.com",
      password: "Senha123",
    });
  });

  it("posts login data as JSON credentials", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});

    await loginAccount(loginValues);

    expect(httpClient).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: {
        email: "ana@example.com",
        password: "Senha123",
      },
    });
  });

  it("fetches the current session with bearer auth", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});

    await getCurrentSession("token-123");

    expect(httpClient).toHaveBeenCalledWith("/auth/me", {
      auth: true,
      accessToken: "token-123",
    });
  });

  it("posts logout with bearer auth", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});

    await logoutSession();

    expect(httpClient).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
      auth: true,
    });
  });

  it("patches only the editable profile fields with bearer auth", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});
    await updateOwnProfile({ name: "Ana Atualizada", avatar_url: "https://example.com/avatar.png" });
    expect(httpClient).toHaveBeenCalledWith("/users/me", {
      method: "PATCH",
      auth: true,
      body: { name: "Ana Atualizada", avatar_url: "https://example.com/avatar.png" },
    });
  });
});
