import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

import { Abas } from "@/components/hub/Abas";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import { AcoesPeca } from "@/components/marketing/AcoesPeca";
import { BriefingPeca } from "@/components/marketing/BriefingPeca";
import { HistoricoPeca } from "@/components/marketing/HistoricoPeca";
import { VersoesPeca, type AcoesVersao } from "@/components/marketing/VersoesPeca";
import { useAvisoDeErro } from "@/components/marketing/useAvisoDeErro";
import type { useMutacoesMarketing } from "@/components/marketing/useMutacoesMarketing";
import {
  chavesMarketing,
  detalhePeca,
  listarClientesOpcoes,
  rotuloEtapa,
  type Campanha,
  type Canal,
  type Peca,
  type PecaDetalhe,
} from "@/lib/marketing";

type Aba = "briefing" | "versoes" | "historico";
type Mutacoes = ReturnType<typeof useMutacoesMarketing>;

/**
 * Painel da peça (MK-1, `?peca=<id>`): briefing, versões por canal e histórico, com a ação da
 * etapa no rodapé. Mais largo no computador; painel de baixo no celular.
 */
export function PecaPainel({
  id,
  daLista,
  canais,
  campanhas,
  m,
  aoFechar,
}: {
  id: string | undefined;
  daLista: Peca | null;
  canais: Canal[];
  campanhas: Campanha[];
  m: Mutacoes;
  aoFechar: () => void;
}) {
  const detalhe = useQuery({
    queryKey: chavesMarketing.detalhe(id ?? ""),
    queryFn: () => detalhePeca(id ?? ""),
    enabled: !!id,
    // Abre na hora com o que a lista já tem; o histórico chega com a leitura completa.
    placeholderData: (): PecaDetalhe | undefined =>
      daLista ? { ...daLista, historico: [] } : undefined,
  });
  const clientes = useQuery({
    queryKey: chavesMarketing.clientes,
    queryFn: listarClientesOpcoes,
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
  useAvisoDeErro(
    clientes.isError,
    "Não conseguimos carregar a lista de clientes.",
    clientes.refetch,
  );
  const [aba, setAba] = useState<Aba>("briefing");
  const p = detalhe.data;
  // Outra peça aberta: começa no que importa na etapa (aprovar olha as versões e a prévia).
  const etapaInicial = daLista?.stage ?? p?.stage;
  useEffect(() => {
    if (!id) return;
    setAba(
      etapaInicial && ["aprovacao", "pronto", "publicado", "analisado"].includes(etapaInicial)
        ? "versoes"
        : "briefing",
    );
    // Só ao trocar de peça; mudar de etapa com o painel aberto não troca a aba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ocupado =
    m.mover.isPending ||
    m.aprovar.isPending ||
    m.ajuste.isPending ||
    m.adicionar.isPending ||
    m.removerVersao.isPending ||
    m.agendar.isPending ||
    m.publicar.isPending ||
    m.resultados.isPending ||
    m.ligar.isPending ||
    m.removerArquivo.isPending ||
    m.ordenar.isPending;

  const acoesVersao: AcoesVersao | null = p
    ? {
        salvar: (vid, campos) => m.editarVersao.mutate({ pecaId: p.id, id: vid, campos }),
        adicionar: (canal, formato, copiarDe) =>
          m.adicionar.mutate({ pecaId: p.id, canal, formato, copiarDe }),
        remover: (vid) => m.removerVersao.mutate({ pecaId: p.id, id: vid }),
        agendar: (vid, quando) => m.agendar.mutate({ pecaId: p.id, id: vid, quando }),
        publicar: (vid, link, quando) => m.publicar.mutate({ pecaId: p.id, id: vid, link, quando }),
        registrar: (vid, r) => m.resultados.mutate({ pecaId: p.id, id: vid, r }),
        enviarArquivos: (vid, formato, arquivos) =>
          m.enviar.mutate({ pecaId: p.id, versao: vid, formato, arquivos }),
        ligarArquivo: (vid, material, papel) =>
          m.ligar.mutate({ pecaId: p.id, versao: vid, material, papel }),
        removerArquivo: (vid, id) => m.removerArquivo.mutate({ pecaId: p.id, versao: vid, id }),
        ordenarArquivos: (vid, ids) => m.ordenar.mutate({ pecaId: p.id, versao: vid, ids }),
      }
    : null;

  return (
    <PainelLateral
      aberto={!!id}
      aoMudar={(a) => !a && aoFechar()}
      titulo={p?.title ?? "Peça"}
      descricao={
        p ? `${rotuloEtapa[p.stage]}${p.campanha ? ` · ${p.campanha.nome}` : ""}` : undefined
      }
      largo
      rodape={
        p && (
          <AcoesPeca
            key={`${p.id}-${p.stage}`}
            p={p}
            ocupado={ocupado}
            aoMover={(etapa) => m.mover.mutate({ id: p.id, etapa })}
            aoAprovar={() => m.aprovar.mutate({ id: p.id, nota: null })}
            aoPedirAjuste={(nota) => m.ajuste.mutate({ id: p.id, nota })}
          />
        )
      }
    >
      {detalhe.isError && !p ? (
        <EstadoErro
          titulo="Não conseguimos abrir a peça"
          aoTentarDeNovo={() => void detalhe.refetch()}
        />
      ) : !p ? (
        <p className="text-[14.5px] text-hub-suave">Carregando…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {detalhe.isError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sit-risco px-3 py-2 text-[14px] text-sit-risco-t"
            >
              Não conseguimos atualizar a peça; o que aparece pode estar desatualizado.
              <button
                type="button"
                onClick={() => void detalhe.refetch()}
                className="min-h-11 rounded-lg bg-white px-3 font-semibold text-hub-tinta"
              >
                Tentar de novo
              </button>
            </div>
          )}
          {p.falta.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-sit-atencao px-3 py-2.5 text-[14px] text-sit-atencao-t">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <b className="font-semibold">
                  {["ideia", "briefing"].includes(p.stage)
                    ? "Para ir para a criação, falta: "
                    : "Para ir para a aprovação, falta: "}
                </b>
                {p.falta.join(", ")}.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Selo
              tom={
                p.stage === "aprovacao"
                  ? "atencao"
                  : p.coluna === "publicado" || p.stage === "pronto"
                    ? "ok"
                    : "neutro"
              }
            >
              {rotuloEtapa[p.stage]}
            </Selo>
          </div>
          <Abas<Aba>
            rotulo="Partes da peça"
            ativa={aba}
            aoEscolher={setAba}
            opcoes={[
              { id: "briefing", rotulo: "Briefing" },
              { id: "versoes", rotulo: "Versões", contagem: p.versoes.length },
              { id: "historico", rotulo: "Histórico" },
            ]}
          />
          {aba === "briefing" && (
            <BriefingPeca
              key={p.id}
              p={p}
              campanhas={campanhas}
              clientes={clientes.data ?? []}
              aoSalvar={(campos) => m.editar.mutate({ id: p.id, campos })}
            />
          )}
          {aba === "versoes" && acoesVersao && (
            <VersoesPeca
              p={p}
              canais={canais}
              acoes={acoesVersao}
              ocupado={ocupado}
              enviando={m.enviar.isPending}
            />
          )}
          {aba === "historico" && <HistoricoPeca itens={p.historico} />}
        </div>
      )}
    </PainelLateral>
  );
}
