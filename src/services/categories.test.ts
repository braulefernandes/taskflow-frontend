import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { createCategory, listCategories, updateCategory, updateCategoryStatus } from "@/services/categories";

vi.mock("@/lib/http-client", () => ({ httpClient: vi.fn() }));

describe("categories service", () => {
  beforeEach(() => vi.mocked(httpClient).mockReset());

  it("lists active and inactive categories for administration", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce([]);
    const signal = new AbortController().signal;
    await listCategories(signal);
    expect(httpClient).toHaveBeenCalledWith("/categories?include_inactive=true", { auth: true, signal });
  });

  it("uses the real create and edit contracts", async () => {
    vi.mocked(httpClient).mockResolvedValue({});
    const body = { name: "Financeiro", description: null };
    await createCategory(body);
    await updateCategory("category-id", body);
    expect(httpClient).toHaveBeenNthCalledWith(1, "/categories", { method: "POST", auth: true, body });
    expect(httpClient).toHaveBeenNthCalledWith(2, "/categories/category-id", { method: "PATCH", auth: true, body });
  });

  it("changes status without calling a delete endpoint", async () => {
    vi.mocked(httpClient).mockResolvedValueOnce({});
    await updateCategoryStatus("category-id", false);
    expect(httpClient).toHaveBeenCalledWith("/categories/category-id/status", { method: "PATCH", auth: true, body: { is_active: false } });
  });
});
