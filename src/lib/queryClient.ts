import { QueryClient } from "@tanstack/react-query";

/** Padrões de cache do Hub: 30 s de dados "frescos", 1 nova tentativa em leituras e nenhuma em mutações. */
export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  });
}
