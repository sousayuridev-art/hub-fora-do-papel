import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlugZap } from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { PrecosFormulario } from "@/components/precos/PrecosFormulario";
import { classeBotaoSecundario } from "@/lib/estilos";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { chavesPrecos, lerPrecos } from "@/lib/precos";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Hub Fora do Papel" }] }),
  component: Configuracoes,
});

/** Configurações: Preços (card S2) e teste de conexão. */
function Configuracoes() {
  const precos = useQuery({ queryKey: chavesPrecos.tudo, queryFn: lerPrecos });
  const testarConexao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("my_access");
      if (error) throw error;
    },
    onSuccess: () => ok("Conexão com o banco funcionando."),
    onError: (e) => erro(mensagemDeErro(e), { tentarDeNovo: () => testarConexao.mutate() }),
  });

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo="Configurações"
        resumo="Preços que as propostas usam e a conexão com o banco."
      />
      <h2 className="font-titulo text-xl font-bold">Preços</h2>
      {precos.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : precos.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os preços"
          aoTentarDeNovo={() => void precos.refetch()}
        />
      ) : (
        <PrecosFormulario dados={precos.data} />
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
        <h2 className="font-titulo text-lg font-bold">Conexão com o banco</h2>
        <p className="text-[15px] text-hub-suave">
          Confere se o Hub consegue falar com o banco usando o seu acesso.
        </p>
        <button
          type="button"
          className={`${classeBotaoSecundario} self-start`}
          disabled={testarConexao.isPending}
          onClick={() => testarConexao.mutate()}
        >
          <PlugZap className="size-4" aria-hidden="true" />
          Testar conexão
        </button>
      </section>
    </div>
  );
}
