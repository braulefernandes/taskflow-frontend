export type ApiErrorBody = {
  message: string;
  code?: string;
  details?: unknown;
};

export type ApiErrorShape = ApiErrorBody & {
  status: number;
};

export type ApiRequestOptions<TBody = unknown> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: HeadersInit;
  auth?: boolean;
  accessToken?: string;
  signal?: AbortSignal;
};
