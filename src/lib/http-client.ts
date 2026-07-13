import { ApiError } from "@/lib/api-error";
import type { ApiErrorBody, ApiRequestOptions } from "@/types/api";

const jsonContentType = "application/json";

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return baseUrl.replace(/\/$/, "");
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes(jsonContentType)) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

function toApiErrorBody(payload: unknown): ApiErrorBody {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    const nestedError =
      typeof record.error === "object" && record.error !== null
        ? (record.error as Record<string, unknown>)
        : undefined;
    const source = nestedError ?? record;
    const message =
      typeof source.message === "string"
        ? source.message
        : typeof source.detail === "string"
          ? source.detail
          : "A API retornou um erro.";

    return {
      message,
      code: typeof source.code === "string" ? source.code : undefined,
      details: source.details ?? source.detail,
    };
  }

  if (typeof payload === "string" && payload.length > 0) {
    return { message: payload };
  }

  return { message: "A API retornou um erro." };
}

export async function httpClient<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);

  headers.set("Accept", jsonContentType);

  if (options.body !== undefined) {
    headers.set("Content-Type", jsonContentType);
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorBody = toApiErrorBody(payload);

    throw new ApiError({
      status: response.status,
      ...errorBody,
    });
  }

  return payload as TResponse;
}
