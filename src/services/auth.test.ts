import { describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { registerAccount, toRegisterRequest } from "@/services/auth";
import type { RegisterFormValues } from "@/schemas/register";

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
});
