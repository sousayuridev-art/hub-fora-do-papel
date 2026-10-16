import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle } from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { Selo } from "@/components/hub/Selo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { linkWhatsapp, moeda, prazoRelativo, isoDoDia } from "@/lib/formatar";
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
  const hoje = isoDoDia(new Date());

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo={primeiroNome ? `${saudacao()}, ${primeiroNome}` : saudacao()}
        resumo={
          dados.data
            ? dados.data.itens.length === 0
              ? "Nenhum passo vencido ou para hoje."
              : `${dados.data.itens.length} ${dados.data.itens.length === 1 ? "item precisa" : "itens precisam"} de você hoje.`
            : " "
        }
      />

      {dados.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o painel"
          aoTentarDeNovo={() => void dados.refetch()}
        />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-hub-borda bg-white p-5">
              <dt className="text-[14px] text-hub-suave">Contatos ativos</dt>
              <dd className="mt-1 font-titulo text-3xl font-bold tabular-nums">
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
              <dt className="text-[14px] text-hub-suave">Em negociação</dt>
              <dd className="mt-1 font-titulo text-3xl font-bold tabular-nums">
                {dados.data ? moeda(dados.data.resumo.em_negociacao_cents) : "–"}
              </dd>
              <dd className="mt-1 text-[13.5px] text-hub-suave">Diagnósticos e propostas</dd>
            </div>
            <div className="rounded-2xl border border-dashed border-[#D6D6CF] p-5 text-[14px] text-hub-suave sm:col-span-2">
              <dt className="font-medium text-hub-tinta">Projetos, recebimentos e mensalidades</dt>
              <dd className="mt-1">
                Entram aqui com os módulos de projetos e financeiro. Até lá, sem números estimados.
              </dd>
            </div>
          </dl>

          <section aria-labelledby="titulo-hoje" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="titulo-hoje" className="font-titulo text-xl font-bold">
                Precisa de você hoje
              </h2>
              <Link
                to="/app/pipeline"
                className="inline-flex min-h-11 items-center gap-1 text-[14.5px] font-medium text-[#1E3FA8]"
              >
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
                  const prazo = prazoRelativo(
                    i.quando.slice(0, 10),
                    hoje,
                    i.com_hora ? i.quando : null,
                  );
                  const wpp = linkWhatsapp(i.whatsapp);
                  return (
                    <li
                      key={i.deal_id}
                      className="flex flex-col gap-3 border-b border-hub-borda px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
                    >
                      <span className="font-rotulo text-[13px] text-hub-suave tabular-nums">
                        {n + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          to="/app/clientes/$id"
                          params={{ id: i.client_id }}
                          className="font-semibold hover:underline"
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
        </>
      )}
    </div>
  );
}
