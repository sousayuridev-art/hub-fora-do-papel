import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { useBuscarAgora } from "@/components/reunioes/useBuscarAgora";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import { chavesReunioes, situacaoGoogle } from "@/lib/reunioes";
import { cn } from "@/lib/utils";

/**
 * Ação do cabeçalho de Reuniões (card RD-4): situação da ligação com o Google e "Buscar agora".
 * Sem ligação (ou pedindo para ligar de novo), leva para Configurações.
 */
export function GoogleCabecalho() {
  const g = useQuery({ queryKey: chavesReunioes.google, queryFn: situacaoGoogle });
  const buscar = useBuscarAgora();

  if (g.isPending) return <div className="h-11 w-56 animate-pulse rounded-xl bg-hub-fundo" />;
  if (g.isError) {
    return (
      <button type="button" className={classeBotaoSecundario} onClick={() => void g.refetch()}>
        Ver a ligação com o Google de novo
      </button>
    );
  }

  const s = g.data;
  const ligada = s.ligada && s.situacao !== "religar";
  const texto = !s.ligada
    ? "Google desligado"
    : s.situacao === "religar"
      ? "Google precisa ser ligado de novo"
      : `Google ligado · ${s.ultima_busca ? `última busca ${diaComHora(s.ultima_busca)}` : "ainda sem busca"}`;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
      <span className="inline-flex items-center gap-2 text-[13.5px] text-[#2A2D33]">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            ligada ? "bg-sit-ok-t" : s.ligada ? "bg-sit-risco-t" : "bg-hub-suave",
          )}
        />
        {texto}
        {s.erro && ligada && <span className="sr-only">. Último erro: {s.erro}</span>}
      </span>
      {ligada ? (
        <button
          type="button"
          className={classeAcaoPrincipal}
          disabled={buscar.isPending}
          onClick={() => buscar.mutate()}
        >
          <RefreshCw
            className={buscar.isPending ? "size-4 animate-spin" : "size-4"}
            aria-hidden="true"
          />
          {buscar.isPending ? "Buscando…" : "Buscar agora"}
        </button>
      ) : (
        <Link to="/app/configuracoes" className={classeBotaoSecundario}>
          {s.ligada ? "Ligar de novo" : "Ligar ao Google"}
        </Link>
      )}
    </div>
  );
}
