import { httpClient } from "@/lib/http-client";
import type { LoginFormValues } from "@/schemas/login";
import type { RegisterFormValues } from "@/schemas/register";
import type {
  LoginRequest,
  LogoutResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
  TokenResponse,
  UserProfileUpdateRequest,
} from "@/types/auth";

export const authMeQueryKey = ["auth", "me"] as const;

export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  return {
    user_name: values.name,
    email: values.email,
    password: values.password,
    organization_name: values.organizationName,
  };
}

export function registerAccount(values: RegisterFormValues) {
  return httpClient<RegisterResponse, RegisterRequest>("/auth/register", {
    method: "POST",
    body: toRegisterRequest(values),
  });
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return {
    email: values.email,
    password: values.password,
  };
}

export function loginAccount(values: LoginFormValues) {
  return httpClient<TokenResponse, LoginRequest>("/auth/login", {
    method: "POST",
    body: toLoginRequest(values),
  });
}

export function getCurrentSession(accessToken?: string | null) {
  return httpClient<MeResponse>("/auth/me", {
    auth: true,
    accessToken: accessToken ?? undefined,
  });
}

export function logoutSession() {
  return httpClient<LogoutResponse>("/auth/logout", {
    method: "POST",
    auth: true,
  });
}

export function updateOwnProfile(payload: UserProfileUpdateRequest) {
  return httpClient<MeResponse["user"], UserProfileUpdateRequest>("/users/me", {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}
