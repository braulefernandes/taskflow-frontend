import { QueryClient } from "@tanstack/react-query";

const activeClients = new Set<QueryClient>();

export function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  activeClients.add(client);
  return client;
}

export function clearTestQueryClients() {
  for (const client of activeClients) client.clear();
  activeClients.clear();
}
