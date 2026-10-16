import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { HorasSemana } from "@/components/projetos/HorasSemana";
import { LancarHorasPainel, type HorasNovas } from "@/components/projetos/LancarHorasPainel";
import { NovoProjetoPainel, type ProjetoNovo } from "@/components/projetos/NovoProjetoPainel";
import { ProjetoCartao } from "@/components/projetos/ProjetoCartao";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesProjetos,
  criarProjeto,
  lancarHoras,
  listarProjetos,
  mensagemDoProjeto,
  rotuloSituacaoProjeto,
  type SituacaoProjeto,
} from "@/lib/projetos";

const busca = z.object({
  aba: z.enum(["andamento", "mensalidade", "concluido"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/projetos/")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Projetos · Hub Fora do Papel" }] }),
  component: Projetos,
});

function Projetos() {
  const { aba = "andamento" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const irPara = useNavigate();
  const qc = useQueryClient();
  const [horasAberto, setHorasAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const lista = useQuery({
    queryKey: chavesProjetos.lista(aba),
    queryFn: () => listarProjetos(aba),
  });
  const andamento = useQuery({
    queryKey: chavesProjetos.lista("andamento"),
    queryFn: () => listarProjetos("andamento"),
    enabled: horasAberto && aba !== "andamento",
  });
  const falhou = (e: unknown) => mensagemDoProjeto(e) ?? mensagemDeErro(e);

  const horas = useMutation({
    mutationFn: (v: HorasNovas) => lancarHoras(v),
    onSuccess: () => ok("Horas lançadas."),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => horas.mutate(v) }),
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesProjetos.tudo }),
  });
  const novo = useMutation({
    mutationFn: (v: ProjetoNovo) => criarProjeto(v),
    onSuccess: (r) => {
      ok("Projeto criado.");
      void irPara({ to: "/app/projetos/$id", params: { id: r.id } });
    },
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => novo.mutate(v) }),
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesProjetos.tudo }),
  });

  const d = lista.data;
  const ativos = (aba === "andamento" ? d : andamento.data)?.projetos ?? [];
  const resumo = d
    ? [
        `${d.contagem.andamento} em andamento`,
        `${moeda(d.contagem.contratado_cents)} contratados`,
        d.proximo_lancamento
          ? `próximo lançamento: ${d.proximo_lancamento.nome} em ${diaMes(dataLocal(d.proximo_lancamento.data))}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : " ";

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Entregar"
        titulo="Projetos"
        resumo={resumo}
        acao={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => setNovoAberto(true)}
            >
              <Plus className="size-4" aria-hidden="true" /> Novo projeto
            </button>
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setHorasAberto(true)}
            >
              <Clock className="size-4" aria-hidden="true" /> Lançar horas
            </button>
          </div>
        }
      />

      <FiltrosChip<SituacaoProjeto>
        rotulo="Situação dos projetos"
        ativo={aba}
        aoEscolher={(id) =>
          void navigate({ search: { aba: id === "andamento" ? undefined : id }, replace: true })
        }
        opcoes={(["andamento", "mensalidade", "concluido"] as const).map((id) => ({
          id,
          rotulo: rotuloSituacaoProjeto[id],
          contagem: d?.contagem[id],
        }))}
      />

      {lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os projetos"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : !d ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            {d.projetos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                {aba === "andamento"
                  ? "Nenhum projeto em andamento. Quando um cliente aceitar a proposta, o projeto aparece aqui sozinho."
                  : aba === "mensalidade"
                    ? "Nenhum projeto em mensalidade. Projetos lançados com plano combinado aparecem aqui."
                    : "Nenhum projeto concluído ainda."}
              </p>
            ) : (
              d.projetos.map((p) => <ProjetoCartao key={p.id} p={p} />)
            )}
          </div>
          <HorasSemana semana={d.semana} />
        </div>
      )}

      <LancarHorasPainel
        aberto={horasAberto}
        aoMudar={setHorasAberto}
        projetos={ativos.map((p) => ({ id: p.id, rotulo: `${p.empresa} · ${p.nome}` }))}
        aoLancar={(v) => horas.mutate(v)}
      />
      <NovoProjetoPainel
        aberto={novoAberto}
        aoMudar={setNovoAberto}
        aoCriar={(v) => novo.mutate(v)}
      />
    </div>
  );
}
