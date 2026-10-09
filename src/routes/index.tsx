import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hub Fora do Papel" },
      { name: "description", content: "Hub Fora do Papel — estrutura inicial do projeto." },
      { property: "og:title", content: "Hub Fora do Papel" },
      { property: "og:description", content: "Hub Fora do Papel — estrutura inicial do projeto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Hub Fora do Papel</h1>
    </main>
  );
}
