import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { CalendarioConteudo } from "@/components/marketing/CalendarioConteudo";
import { CampanhaPainel } from "@/components/marketing/CampanhaPainel";
import { CampanhasLista } from "@/components/marketing/CampanhasLista";
import { ConfirmarRemocao } from "@/components/marketing/ConfirmarRemocao";
import { FiltrosMarketing } from "@/components/marketing/FiltrosMarketing";
import { ListaProducao } from "@/components/marketing/ListaProducao";
import { NovaPecaPainel } from "@/components/marketing/NovaPecaPainel";
import { PecaPainel } from "@/components/marketing/PecaPainel";
import { QuadroProducao } from "@/components/marketing/QuadroProducao";
import { ResultadosConteudo } from "@/components/marketing/ResultadosConteudo";
import { useAvisoDeErro } from "@/components/marketing/useAvisoDeErro";
import { useLinksArquivos } from "@/components/marketing/useLinksArquivos";
import { useMutacoesMarketing } from "@/components/marketing/useMutacoesMarketing";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { classeAcaoPrincipal } from "@/lib/estilos";
import {
  buscaMarketing,
  chavesMarketing,
  filtrosDaBusca,
  listarCampanhas,
  listarCanais,
  listarPecas,
  primeiraImagem,
  resumoMarketing,
  type BuscaMarketing,
  type Campanha,
  type Peca,
} from "@/lib/marketing";

export const Route = createFileRoute("/app/marketing")({
  validateSearch: buscaMarketing,
  head: () => ({ meta: [{ title: "Central de conteúdo · Hub Fora do Papel" }] }),
  component: CentralConteudo,
});

type Aba = "producao" | "calendario" | "campanhas" | "resultados";

/**
 * Central de conteúdo (MK-1): da ideia à publicação, com uma versão por canal, revisão da marca,
 * aprovação registrada, calendário, campanhas e resultados (MK-4). Filtros, aba e peça aberta ficam no endereço.
 */
function CentralConteudo() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const celular = useIsMobile();
  const aba: Aba = busca.aba ?? "producao";
  const mudar = (p: Partial<BuscaMarketing>) =>
    void navigate({ search: (s) => ({ ...s, ...p }), replace: true });
  const painel = usePainelNaUrl(
    (peca, o) => void navigate({ search: (s) => ({ ...s, peca }), ...o }),
  );

  const filtros = filtrosDaBusca(busca);
  const lista = useQuery({
    queryKey: chavesMarketing.lista(filtros),
    queryFn: () => listarPecas(filtros),
    placeholderData: keepPreviousData,
  });
  const resumo = useQuery({ queryKey: chavesMarketing.resumo, queryFn: resumoMarketing });
  const canais = useQuery({
    queryKey: chavesMarketing.canais,
    queryFn: listarCanais,
    staleTime: 10 * 60_000,
  });
  const campanhas = useQuery({ queryKey: chavesMarketing.campanhas, queryFn: listarCampanhas });
  useAvisoDeErro(resumo.isError, "Não conseguimos carregar as contagens.", resumo.refetch);
  useAvisoDeErro(canais.isError, "Não conseguimos carregar os canais.", canais.refetch);
  useAvisoDeErro(
    campanhas.isError && aba !== "campanhas",
    "Não conseguimos carregar as campanhas.",
    campanhas.refetch,
  );
  const m = useMutacoesMarketing();

  const [novaAberta, setNovaAberta] = useState(false);
  const [campanhaAberta, setCampanhaAberta] = useState<Campanha | "nova" | null>(null);
  const [removendo, setRemovendo] = useState<Peca | null>(null);

  const itens = useMemo(() => lista.data?.itens ?? [], [lista.data]);
  // MK-2: um pedido só de links para as miniaturas de todas as peças da tela
  const { links: miniaturas } = useLinksArquivos(itens.map(primeiraImagem));
  const hoje = lista.data?.hoje ?? resumo.data?.hoje ?? "";
  const daLista = busca.peca ? (itens.find((p) => p.id === busca.peca) ?? null) : null;
  const r = resumo.data;
  const mesAtual = busca.mes ?? (hoje ? hoje.slice(0, 7) : new Date().toISOString().slice(0, 7));

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Marketing"
        titulo="Central de conteúdo"
        resumo="Da ideia à publicação: uma versão para cada canal, revisada pela marca antes de sair."
        acao={
          aba === "campanhas" ? (
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setCampanhaAberta("nova")}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova campanha
            </button>
          ) : (
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setNovaAberta(true)}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova peça
            </button>
          )
        }
        abas={
          <Abas<Aba>
            rotulo="Partes da central"
            ativa={aba}
            aoEscolher={(id) => mudar({ aba: id === "producao" ? undefined : id })}
            opcoes={[
              { id: "producao", rotulo: "Produção" },
              {
                id: "calendario",
                rotulo: "Calendário",
                contagem: r?.agendadas_semana || undefined,
              },
              { id: "campanhas", rotulo: "Campanhas", contagem: campanhas.data?.length },
              { id: "resultados", rotulo: "Resultados" },
            ]}
          />
        }
      />

      {r && aba !== "resultados" && (
        <FaixaNumeros
          itens={[
            { rotulo: "Em planejamento", valor: r.planejamento },
            {
              rotulo: "Em criação",
              valor: r.criacao,
              apoio: r.atrasadas > 0 ? `${r.atrasadas} com prazo vencido` : undefined,
              tom: r.atrasadas > 0 ? "risco" : undefined,
            },
            {
              rotulo: "Para aprovar",
              valor: r.aprovacao,
              tom: r.aprovacao > 0 ? "atencao" : undefined,
            },
            {
              rotulo: "Prontas",
              valor: r.pronto,
              apoio:
                r.agendadas_semana > 0
                  ? `${r.agendadas_semana} ${r.agendadas_semana === 1 ? "agendada" : "agendadas"} na semana`
                  : undefined,
            },
            {
              rotulo: "Publicadas no mês",
              valor: r.publicadas_mes,
              apoio: r.sem_resultados > 0 ? `${r.sem_resultados} sem resultados` : undefined,
            },
          ]}
        />
      )}

      {aba === "producao" && (
        <>
          <FiltrosMarketing
            busca={busca}
            canais={canais.data ?? []}
            campanhas={campanhas.data ?? []}
            aoMudar={mudar}
          />
          {lista.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar as peças"
              aoTentarDeNovo={() => void lista.refetch()}
            />
          ) : !lista.data ? (
            <div className="h-80 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          ) : itens.length === 0 && Object.keys(filtros).length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6">
              <b className="text-[16px]">Comece pela primeira ideia</b>
              <p className="max-w-xl text-[14.5px] text-hub-suave">
                Cada peça nasce de uma ideia e ganha uma versão por canal. Antes de ir para a
                criação, defina objetivo, etapa do funil e pilar. Antes da aprovação, a marca é
                conferida.
              </p>
              <button
                type="button"
                className={classeAcaoPrincipal}
                onClick={() => setNovaAberta(true)}
              >
                <Plus className="size-4" aria-hidden="true" /> Nova peça
              </button>
            </div>
          ) : celular ? (
            <ListaProducao
              itens={itens}
              hoje={hoje}
              miniaturas={miniaturas}
              aoAbrir={(p) => painel.abrir(p.id)}
              aoMover={(p, etapa) => m.mover.mutate({ id: p.id, etapa })}
              aoRemover={setRemovendo}
            />
          ) : (
            <QuadroProducao
              itens={itens}
              hoje={hoje}
              miniaturas={miniaturas}
              aoAbrir={(p) => painel.abrir(p.id)}
              aoMover={(p, etapa) => m.mover.mutate({ id: p.id, etapa })}
              aoRemover={setRemovendo}
            />
          )}
        </>
      )}

      {aba === "resultados" && (
        <ResultadosConteudo
          periodo={busca.periodo ?? "30"}
          agrupar={busca.agrupar ?? "pilar"}
          // Sem a data do banco (lista e resumo falharam), usa a do aparelho para não deixar a aba vazia.
          hoje={hoje || new Date().toLocaleDateString("sv-SE")}
          aoMudar={mudar}
          aoAbrir={(id) => painel.abrir(id)}
        />
      )}

      {aba === "calendario" && (
        <CalendarioConteudo
          mes={mesAtual}
          hoje={hoje}
          aoMudarMes={(mes) => mudar({ mes })}
          aoAbrir={(id) => painel.abrir(id)}
        />
      )}

      {aba === "campanhas" &&
        (campanhas.isError ? (
          <EstadoErro
            titulo="Não foi possível carregar as campanhas"
            aoTentarDeNovo={() => void campanhas.refetch()}
          />
        ) : !campanhas.data ? (
          <div className="h-60 animate-pulse rounded-2xl bg-white" aria-busy="true" />
        ) : (
          <CampanhasLista
            itens={campanhas.data}
            aoEditar={setCampanhaAberta}
            aoVerPecas={(c) => mudar({ aba: undefined, campanha: c.id })}
          />
        ))}

      <PecaPainel
        id={busca.peca}
        abaInicial={aba === "resultados" ? "versoes" : undefined}
        daLista={daLista}
        canais={canais.data ?? []}
        campanhas={campanhas.data ?? []}
        m={m}
        aoFechar={painel.fechar}
      />
      <NovaPecaPainel
        key={novaAberta ? "aberta" : "fechada"}
        aberto={novaAberta}
        aoMudar={setNovaAberta}
        canais={canais.data ?? []}
        campanhas={campanhas.data ?? []}
        campanhaInicial={busca.campanha}
        criando={m.criar.isPending}
        aoCriar={(v) => m.criar.mutate(v, { onSuccess: (p) => painel.abrir(p.id) })}
      />
      <CampanhaPainel
        aberto={campanhaAberta !== null}
        campanha={campanhaAberta === "nova" ? null : campanhaAberta}
        aoMudar={(a) => !a && setCampanhaAberta(null)}
        aoSalvar={(id, campos) => m.campanha.mutate({ id, campos })}
        aoRemover={(id) => m.removerCampanha.mutate(id)}
        salvando={m.campanha.isPending}
      />
      <ConfirmarRemocao
        peca={removendo}
        aoCancelar={() => setRemovendo(null)}
        aoConfirmar={(p) => {
          m.remover.mutate(p.id);
          setRemovendo(null);
        }}
      />
    </div>
  );
}
