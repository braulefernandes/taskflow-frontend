import { httpClient } from "@/lib/http-client";

type MessageResponse = { message: string };

export function requestPasswordReset(email: string) {
  return httpClient<MessageResponse, { email: string }>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, newPassword: string) {
  return httpClient<MessageResponse, { token: string; new_password: string }>("/auth/reset-password", { method: "POST", body: { token, new_password: newPassword } });
}
