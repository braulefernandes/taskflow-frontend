import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { requestPasswordReset, resetPassword } from "@/services/password-reset";

vi.mock("@/lib/http-client", () => ({ httpClient: vi.fn() }));

describe("password reset service", () => {
  beforeEach(() => vi.mocked(httpClient).mockReset());
  it("posts the recovery email without authentication", async () => { vi.mocked(httpClient).mockResolvedValueOnce({}); await requestPasswordReset("ana@example.com"); expect(httpClient).toHaveBeenCalledWith("/auth/forgot-password", { method: "POST", body: { email: "ana@example.com" } }); });
  it("posts token and new_password using the backend names", async () => { vi.mocked(httpClient).mockResolvedValueOnce({}); await resetPassword("token-seguro", "NovaSenha123"); expect(httpClient).toHaveBeenCalledWith("/auth/reset-password", { method: "POST", body: { token: "token-seguro", new_password: "NovaSenha123" } }); });
});
