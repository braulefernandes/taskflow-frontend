import { httpClient } from "@/lib/http-client";
import type { Category, CategoryPayload } from "@/types/categories";

export const categoriesQueryKey = ["categories"] as const;

export function listCategories(signal?: AbortSignal) {
  return httpClient<Category[]>("/categories?include_inactive=true", { auth: true, signal });
}

export function listActiveCategories(signal?: AbortSignal) {
  return httpClient<Category[]>("/categories", { auth: true, signal });
}

export function createCategory(payload: CategoryPayload) {
  return httpClient<Category, CategoryPayload>("/categories", { method: "POST", auth: true, body: payload });
}

export function updateCategory(id: string, payload: CategoryPayload) {
  return httpClient<Category, CategoryPayload>(`/categories/${id}`, { method: "PATCH", auth: true, body: payload });
}

export function updateCategoryStatus(id: string, is_active: boolean) {
  return httpClient<Category, { is_active: boolean }>(`/categories/${id}/status`, { method: "PATCH", auth: true, body: { is_active } });
}
