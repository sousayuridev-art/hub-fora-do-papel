import { createFileRoute, redirect } from "@tanstack/react-router";

/** Endereço antigo (antes do RD2-8): a central de sites agora é /app/sites. */
export const Route = createFileRoute("/app/site")({
  beforeLoad: () => {
    throw redirect({ to: "/app/sites", replace: true });
  },
});
