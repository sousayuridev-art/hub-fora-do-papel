import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeDollarSign,
  FileText,
  Inbox,
  MessageCircle,
  TriangleAlert,
  Trophy,
  Users,
} from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { Selo } from "@/components/hub/Selo";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { AvisoPublicacao } from "@/components/painel/AvisoPublicacao";
import { AvisoUsoIA } from "@/components/painel/AvisoUsoIA";
import { PainelEntregas } from "@/components/painel/PainelEntregas";
import { PainelCapacidade } from "@/components/painel/PainelCapacidade";
import { PainelFila } from "@/components/painel/PainelFila";
import { PainelNovidades } from "@/components/painel/PainelNovidades";
import { PainelTarefas } from "@/components/painel/PainelTarefas";
import { linkWhatsapp, moeda, prazoRelativo } from "@/lib/formatar";
import { capacidadeDoMes, chavesPainel, filaDoPainel, novidadesDoPainel } from "@/lib/painel";
import { chavesFunil, painelHoje, rotuloEtapa } from "@/lib/funil";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Painel · Hub Fora do Papel" }] }),
  component: Painel,
});

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

/** Painel: fila única do que precisa do Yuri hoje + indicadores reais do funil. */
function Painel() {
  const dados = useQuery({ queryKey: chavesFunil.painel, queryFn: painelHoje });
  const { session } = useSession();
  const nomeCompleto = (session?.user.user_metadata?.["full_name"] as string | undefined) ?? "";
  const primeiroNome = nomeCompleto.split(" ")[0];
  const extra = useQuery({ queryKey: chavesPainel.novidades, queryFn: novidadesDoPainel });
  const n = extra.data;
  const fila = useQuery({ queryKey: chavesPainel.fila, queryFn: filaDoPainel });
  const capacidade = useQuery({ queryKey: chavesPainel.capacidade, queryFn: capacidadeDoMes });

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo={primeiroNome ? `${saudacao()}, ${primeiroNome}!` : `${saudacao()}!`}
      />
      <AvisoPublicacao />
      <AvisoUsoIA />

      {dados.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o painel"
          aoTentarDeNovo={() => void dados.refetch()}
        />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-hub-borda bg-white p-5">
              <dt className="flex items-center gap-2.5 text-[14px] text-hub-suave">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#9A5B00]">
                  <Users className="size-[18px]" aria-hidden="true" />
                </span>
                Contatos ativos
              </dt>
              <dd className="mt-3 font-titulo text-3xl font-bold tabular-nums">
                {dados.data?.resumo.ativos ?? "–"}
              </dd>
              {dados.data && dados.data.resumo.vencidos > 0 && (
                <dd className="mt-1 text-[13.5px] text-sit-risco-t">
                  {dados.data.resumo.vencidos}{" "}
                  {dados.data.resumo.vencidos === 1 ? "passo vencido" : "passos vencidos"}
                </dd>
              )}
            </div>
            <div className="rounded-2xl border border-hub-borda bg-white p-5">
              <dt className="flex items-center gap-2.5 text-[14px] text-hub-suave">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sit-info text-sit-info-t">
                  <BadgeDollarSign className="size-[18px]" aria-hidden="true" />
                </span>
                Em negociação
              </dt>
              <dd className="mt-3 font-titulo text-3xl font-bold tabular-nums">
                {dados.data ? moeda(dados.data.resumo.em_negociacao_cents) : "–"}
              </dd>
              <dd className="mt-1 text-[13.5px] text-hub-suave">Diagnósticos e propostas</dd>
            </div>
            <div className="rounded-2xl border border-hub-borda bg-white p-5">
              <dt className="flex items-center gap-2.5 text-[14px] text-hub-suave">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sit-ok text-sit-ok-t">
                  <Trophy className="size-[18px]" aria-hidden="true" />
                </span>
                Fechado no mês
              </dt>
              <dd className="mt-3 font-titulo text-3xl font-bold tabular-nums">
                {n ? moeda(n.fechado_mes_cents) : "–"}
              </dd>
              <dd className="mt-1 text-[13.5px] text-hub-suave">
                {n
                  ? `${n.fechados_mes} ${n.fechados_mes === 1 ? "contrato" : "contratos"} neste mês`
                  : " "}
              </dd>
            </div>
            <div className="rounded-2xl border border-hub-borda bg-white p-5">
              <dt className="flex items-center gap-2.5 text-[14px] text-hub-suave">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#9A5B00]">
                  <FileText className="size-[18px]" aria-hidden="true" />
                </span>
                Propostas aguardando
              </dt>
              <dd className="mt-3 font-titulo text-3xl font-bold tabular-nums">
                {n ? n.propostas_aguardando : "–"}
              </dd>
              <dd className="mt-1 text-[13.5px] text-hub-suave">
                {n
                  ? n.propostas_aguardando === 0
                    ? "Nenhuma esperando resposta"
                    : `${moeda(n.propostas_aguardando_cents)} · ${n.propostas_vistas} já ${n.propostas_vistas === 1 ? "aberta" : "abertas"}`
                  : " "}
              </dd>
            </div>
          </dl>

          {n && n.falhas_site > 0 && (
            <p
              className="flex items-start gap-3 rounded-2xl bg-sit-risco p-4 text-[14.5px] text-sit-risco-t"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {n.falhas_site === 1
                ? "1 pedido do site não entrou no funil nos últimos 30 dias."
                : `${n.falhas_site} pedidos do site não entraram no funil nos últimos 30 dias.`}{" "}
              Os dados não se perderam; fale com o suporte para importar.
            </p>
          )}

          {n && n.pedidos_novos > 0 && (
            <Link
              to="/app/pedidos"
              search={{ aba: "recebido" }}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#FFF1D6] p-4 text-[14.5px] text-[#7A4200] hover:bg-[#FFE8BD]"
            >
              <Inbox className="size-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">
                {n.pedidos_novos === 1
                  ? "1 pedido de cliente esperando classificação."
                  : `${n.pedidos_novos} pedidos de clientes esperando classificação.`}
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          )}

          <PainelTarefas />

          <section aria-labelledby="titulo-hoje" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="titulo-hoje" className="font-titulo text-xl font-bold">
                Funil: próximos passos
              </h2>
              <Link to="/app/pipeline" className={`${classeAcaoTexto} gap-1`}>
                Abrir o funil <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {dados.isPending ? (
              <div className="h-48 animate-pulse rounded-2xl bg-white" aria-busy="true" />
            ) : dados.data.itens.length === 0 ? (
              <p className="rounded-2xl border border-hub-borda bg-white p-6 text-[15px] text-hub-suave">
                Tudo em dia. Os próximos passos aparecem aqui no dia marcado.
              </p>
            ) : (
              <ol className="flex flex-col rounded-2xl border border-hub-borda bg-white">
                {dados.data.itens.map((i, n) => {
                  const prazo = prazoRelativo(i.dia, i.hoje, i.com_hora ? i.quando : null);
                  const wpp = linkWhatsapp(i.whatsapp);
                  return (
                    <li
                      key={i.deal_id}
                      className="flex flex-col gap-3 border-b border-hub-borda px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1D6] text-[13px] font-semibold text-[#7A4200] tabular-nums">
                        {n + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          to="/app/clientes/$id"
                          params={{ id: i.client_id }}
                          className="-my-2.5 inline-block self-start py-2.5 font-semibold hover:text-[#4A4D54]"
                        >
                          {i.empresa}
                        </Link>
                        <p className="text-[14.5px]">
                          {i.proximo_passo}{" "}
                          <span className="text-hub-suave">· {rotuloEtapa[i.etapa]}</span>
                        </p>
                        <span className="self-start">
                          <Selo tom={i.vencido ? "risco" : "atencao"}>{prazo.texto}</Selo>
                        </span>
                      </div>
                      {wpp ? (
                        <a
                          href={wpp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classeBotaoSecundario}
                        >
                          <MessageCircle className="size-4" aria-hidden="true" /> Abrir WhatsApp
                        </a>
                      ) : (
                        <Link
                          to="/app/clientes/$id"
                          params={{ id: i.client_id }}
                          className={classeBotaoSecundario}
                        >
                          Abrir ficha
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {fila.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar cobranças e adicionais"
              aoTentarDeNovo={() => void fila.refetch()}
            />
          ) : (
            fila.data && <PainelFila itens={fila.data.itens} />
          )}

          {capacidade.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar a capacidade do mês"
              aoTentarDeNovo={() => void capacidade.refetch()}
            />
          ) : (
            capacidade.data && <PainelCapacidade c={capacidade.data} />
          )}

          <PainelEntregas />

          {extra.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar as novidades"
              aoTentarDeNovo={() => void extra.refetch()}
            />
          ) : n ? (
            <PainelNovidades itens={n.novidades} />
          ) : (
            <div className="h-40 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          )}
        </>
      )}
    </div>
  );
}
