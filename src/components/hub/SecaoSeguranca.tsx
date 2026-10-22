import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { classeBotaoSecundario } from "@/lib/estilos";
import { appsAtivos, chavesSeguranca } from "@/lib/seguranca";

/** Configurações › Segurança da conta (card SEG-1). */
export function SecaoSeguranca() {
  const apps = useQuery({ queryKey: chavesSeguranca.apps, queryFn: appsAtivos });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
      <h2 className="font-titulo text-lg font-bold">Segurança da conta</h2>
      {apps.isPending ? (
        <div className="h-10 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : apps.isError ? (
        <EstadoErro
          titulo="Não foi possível ver a segurança da conta"
          aoTentarDeNovo={() => void apps.refetch()}
        />
      ) : (
        <p className="flex items-center gap-2 text-[15px] text-hub-suave">
          <ShieldCheck className="size-5 shrink-0 text-[#145A37]" aria-hidden="true" />
          Entrada com senha e código do app ·{" "}
          {apps.data.length === 1 ? "1 aparelho ativado" : `${apps.data.length} aparelhos ativados`}
          {apps.data.length === 1 && " (ative um segundo como reserva)"}
        </p>
      )}
      <Link to="/seguranca" className={`${classeBotaoSecundario} self-start`}>
        Senha e app autenticador
      </Link>
    </section>
  );
}
