import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { PlugZap, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmConstrucao } from "@/components/paginas/EmConstrucao";
import { supabase } from "@/lib/supabase";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Hub Fora do Papel" }] }),
  component: Configuracoes,
});

/**
 * Sprint 0: além do título, um teste de conexão que exercita o padrão de mutação
 * (aviso de sucesso e aviso de erro com "Tentar de novo").
 */
function Configuracoes() {
  const testarConexao = useMutation({
    mutationFn: async (simularErro: boolean) => {
      const { error } = simularErro
        ? await supabase.rpc("funcao_que_nao_existe" as never)
        : await supabase.rpc("my_access");
      if (error) throw error;
    },
    onSuccess: () => ok("Conexão com o banco funcionando."),
    onError: (e, simularErro) =>
      erro(mensagemDeErro(e), { tentarDeNovo: () => testarConexao.mutate(simularErro) }),
  });

  return (
    <div className="flex flex-col gap-8">
      <EmConstrucao titulo="Configurações" />
      <section className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
        <h2 className="font-titulo text-xl font-semibold tracking-tight">Conexão com o banco</h2>
        <p className="text-[15px] text-hub-suave">
          Confere se o Hub consegue falar com o Supabase usando o seu acesso.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11"
            disabled={testarConexao.isPending}
            onClick={() => testarConexao.mutate(false)}
          >
            <PlugZap aria-hidden="true" />
            Testar conexão
          </Button>
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              className="h-11"
              disabled={testarConexao.isPending}
              onClick={() => testarConexao.mutate(true)}
            >
              <TriangleAlert aria-hidden="true" />
              Simular erro (só em desenvolvimento)
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
