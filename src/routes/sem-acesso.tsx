import { createFileRoute } from "@tanstack/react-router";

import { Simbolo } from "@/components/layout/Marca";
import { ContaUsuario } from "@/components/layout/ContaUsuario";

export const Route = createFileRoute("/sem-acesso")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acesso pendente · Hub Fora do Papel" }] }),
  component: SemAcesso,
});

/** Quem entrou com um e-mail que ainda não tem papel (nem dono, nem cliente). */
function SemAcesso() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hub-fundo px-4">
      <div className="w-full max-w-md rounded-2xl border border-hub-borda bg-white p-8 shadow-sm">
        <Simbolo />
        <h1 className="mt-5 font-titulo text-2xl font-semibold tracking-tight">
          Seu acesso ainda não foi liberado
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-hub-suave">
          Seu e-mail entrou, mas ainda não está ligado a nenhuma empresa. Fale com a Fora do Papel
          para liberar o acesso.
        </p>
        <div className="mt-6 -mx-3 border-t border-hub-borda pt-3">
          <ContaUsuario />
        </div>
      </div>
    </div>
  );
}
