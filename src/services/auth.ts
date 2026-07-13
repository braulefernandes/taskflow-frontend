import { httpClient } from "@/lib/http-client";
import type { RegisterFormValues } from "@/schemas/register";
import type { RegisterRequest, RegisterResponse } from "@/types/auth";

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
