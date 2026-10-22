import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Unplug, Video } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { Selo } from "@/components/hub/Selo";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import { erro, ok } from "@/lib/notify";
import { textoDoErroGoogle, useBuscarAgora } from "@/components/reunioes/useBuscarAgora";
import {
  chavesReunioes,
  desligarGoogle,
  ligarGoogle,
  situacaoGoogle,
  type SituacaoGoogle,
} from "@/lib/reunioes";

/** Configurações › Google Meet e Agenda (card RE-1). */
export function SecaoGoogle() {
  const qc = useQueryClient();
  const g = useQuery({ queryKey: chavesReunioes.google, queryFn: situacaoGoogle });

  const ligar = useMutation({
    mutationFn: ligarGoogle,
    onError: (e) => erro(textoDoErroGoogle(e), { tentarDeNovo: () => ligar.mutate() }),
  });
  const buscar = useBuscarAgora();
  const desligar = useMutation({
    mutationFn: desligarGoogle,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: chavesReunioes.google });
      const antes = qc.getQueryData<SituacaoGoogle>(chavesReunioes.google);
      qc.setQueryData<SituacaoGoogle>(chavesReunioes.google, (s) =>
        s ? { ...s, ligada: false, email: null, situacao: null } : s,
      );
      return { antes };
    },
    onSuccess: () => ok("Google desligado. As reuniões já guardadas continuam no Hub."),
    onError: (e, _v, ctx) => {
      qc.setQueryData(chavesReunioes.google, ctx?.antes);
      erro(textoDoErroGoogle(e), { tentarDeNovo: () => desligar.mutate() });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesReunioes.google }),
  });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sit-info text-sit-info-t">
          <Video className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-titulo text-lg font-bold">Google Meet e Agenda</h2>
          <p className="text-[15px] text-hub-suave">
            Traz para o Hub as reuniões com transcrição da conta da Fora do Papel, a cada 15
            minutos.
          </p>
        </div>
      </div>

      {g.isPending ? (
        <div className="h-20 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : g.isError ? (
        <EstadoErro
          titulo="Não foi possível ver a ligação com o Google"
          aoTentarDeNovo={() => void g.refetch()}
        />
      ) : !g.data.ligada ? (
        <button
          type="button"
          className={`${classeAcaoPrincipal} self-start`}
          disabled={ligar.isPending}
          onClick={() => ligar.mutate()}
        >
          Ligar ao Google
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[15px]">
            {g.data.situacao === "religar" ? (
              <Selo tom="risco">Precisa ligar de novo</Selo>
            ) : (
              <Selo tom="ok">Ligado</Selo>
            )}
            <span>
              como <b className="font-semibold">{g.data.email}</b>
            </span>
          </div>
          <p className="text-[14.5px] text-hub-suave">
            {g.data.ultima_busca
              ? `Última busca: ${diaComHora(g.data.ultima_busca)}.`
              : "Ainda não buscou reuniões."}
            {g.data.erro && <span className="mt-1 block text-sit-risco-t">{g.data.erro}</span>}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {g.data.situacao === "religar" ? (
              <button
                type="button"
                className={classeAcaoPrincipal}
                disabled={ligar.isPending}
                onClick={() => ligar.mutate()}
              >
                Ligar de novo
              </button>
            ) : (
              <button
                type="button"
                className={classeBotaoSecundario}
                disabled={buscar.isPending}
                onClick={() => buscar.mutate()}
              >
                <RefreshCw
                  className={buscar.isPending ? "size-4 animate-spin" : "size-4"}
                  aria-hidden="true"
                />
                {buscar.isPending ? "Buscando…" : "Buscar agora"}
              </button>
            )}
            <button
              type="button"
              className={classeBotaoSecundario}
              disabled={desligar.isPending}
              onClick={() => desligar.mutate()}
            >
              <Unplug className="size-4" aria-hidden="true" />
              Desligar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
