import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { classeAcaoTexto } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import { modulosSite } from "@/lib/sitesCliente";
import {
  atividadeDoSite,
  chavesSitesHub,
  diasDesde,
  fraseDaAtividade,
  haQuanto,
  rotuloSituacaoSite,
  type SiteResumo,
} from "@/lib/sitesHub";
import { cn } from "@/lib/utils";

function Cartao({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15.5px] font-semibold">{titulo}</h2>
        {acao && <span className="shrink-0 whitespace-nowrap">{acao}</span>}
      </div>
      {children}
    </section>
  );
}

function Linha({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: React.ReactNode;
  tom?: "ok" | "risco" | undefined;
}) {
  return (
    <div className="flex justify-between gap-3 border-t border-[#EEF1F5] py-2 text-[14px] first:border-t-0 first:pt-0">
      <span className="text-hub-suave">{rotulo}</span>
      <b
        className={cn(
          "text-right font-medium",
          tom === "ok" && "text-sit-ok-t",
          tom === "risco" && "text-sit-risco-t",
        )}
      >
        {valor}
      </b>
    </div>
  );
}

/** Iniciais para o círculo da atividade. */
const iniciais = (n: string | null) =>
  (n ?? "?")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/**
 * Visão geral do site (RD2-8): o que precisa de você, o que o cliente fez, contatos pelo site,
 * situação, quem usa o painel e o que o cliente pode editar.
 */
export function SiteVisaoGeral({
  s,
  aoIr,
}: {
  s: SiteResumo;
  aoIr: (aba: "contatos" | "edicao" | "artigos") => void;
}) {
  const q = useQuery({
    queryKey: chavesSitesHub.atividade(s.id),
    queryFn: () => atividadeDoSite(s.id),
  });
  const a = q.data;
  const nosso = s.client_id === null;
  const desde = diasDesde(s.sem_resposta_desde);

  const pendencias = [
    s.sem_resposta > 0 && {
      chave: "contatos",
      risco: (desde ?? 0) >= 2,
      titulo: `${s.sem_resposta} ${s.sem_resposta === 1 ? "contato sem resposta" : "contatos sem resposta"}${desde ? ` há ${desde} ${desde === 1 ? "dia" : "dias"}` : ""}`,
      apoio: nosso
        ? "Pedidos de orçamento pelo formulário do site."
        : "O cliente responde pelo painel; um lembrete no WhatsApp costuma resolver.",
      acao: (
        <button type="button" className={classeAcaoTexto} onClick={() => aoIr("contatos")}>
          Ver contatos ›
        </button>
      ),
    },
    s.pedidos_abertos > 0 &&
      s.client_id && {
        chave: "pedidos",
        risco: false,
        titulo: `${s.pedidos_abertos} ${s.pedidos_abertos === 1 ? "pedido de ajuste aberto" : "pedidos de ajuste abertos"} neste site`,
        apoio: "Feitos pelo cliente no painel, já com a página.",
        acao: (
          <Link
            to="/app/pedidos"
            search={{ cliente: s.client_id, vista: "lista" }}
            className={classeAcaoTexto}
          >
            Abrir ›
          </Link>
        ),
      },
    s.avisos.includes("cliente_sumido") && {
      chave: "sumido",
      risco: false,
      titulo:
        s.ultimo_acesso === null
          ? "Ninguém da empresa entrou no painel ainda"
          : `Cliente não entra no painel há ${diasDesde(s.ultimo_acesso)} dias`,
      apoio: "Vale um lembrete no WhatsApp com o que ele pode fazer sozinho.",
      acao: null,
    },
    s.avisos.includes("rascunho_parado") && {
      chave: "rascunho",
      risco: false,
      titulo: "Artigo em rascunho parado há mais de 7 dias",
      apoio: "Publique ou arquive para não ficar esquecido.",
      acao: (
        <button type="button" className={classeAcaoTexto} onClick={() => aoIr("artigos")}>
          Ver artigos ›
        </button>
      ),
    },
  ].filter((x): x is Exclude<typeof x, false | null | undefined | 0 | ""> => Boolean(x));

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {pendencias.length > 0 && (
          <Cartao titulo="Precisa de você">
            <ul className="flex flex-col gap-2">
              {pendencias.map((p) => (
                <li
                  key={p.chave}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl p-3.5 sm:flex-row sm:items-center sm:justify-between",
                    p.risco ? "bg-sit-risco text-sit-risco-t" : "bg-[#F5F7FA]",
                  )}
                >
                  <span className="flex min-w-0 flex-col text-[14px]">
                    <b className="font-semibold">{p.titulo}</b>
                    <span className={cn("text-[13px]", !p.risco && "text-hub-suave")}>
                      {p.apoio}
                    </span>
                  </span>
                  {p.acao && <span className="shrink-0 [&>*]:bg-white">{p.acao}</span>}
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        <Cartao
          titulo={nosso ? "O que mudou no site" : "O que o cliente fez no site"}
          acao={<span className="text-[13px] text-hub-suave">últimos 30 dias</span>}
        >
          {q.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar a atividade"
              aoTentarDeNovo={() => void q.refetch()}
            />
          ) : !a ? (
            <div className="h-40 animate-pulse rounded-xl bg-[#F5F7FA]" aria-busy="true" />
          ) : a.itens.length === 0 ? (
            <p className="text-[14px] text-hub-suave">Nada publicado nos últimos 30 dias.</p>
          ) : (
            <ul className="flex flex-col">
              {a.itens.slice(0, 8).map((i, n) => (
                <li
                  key={`${i.quando}-${n}`}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#EEF1F5] py-2.5 text-[14px] first:border-t-0 first:pt-0"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-[12.5px] font-semibold",
                      i.quem === "cliente"
                        ? "bg-sit-info text-sit-info-t"
                        : "bg-[#FFF1D6] text-[#7A4200]",
                    )}
                  >
                    {i.quem === "dono" ? "FP" : iniciais(i.nome)}
                  </span>
                  <span className="min-w-0">{fraseDaAtividade(i)}</span>
                  <span className="text-[13px] text-hub-suave">
                    {haQuanto(i.quando) === "Hoje" ? "Hoje" : diaMes(i.quando)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {a && (
          <Cartao
            titulo="Contatos pelo site"
            acao={
              <button type="button" className={classeAcaoTexto} onClick={() => aoIr("contatos")}>
                Todos ›
              </button>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Neste mês", a.contatos.mes],
                ["Pelo formulário", a.contatos.formulario],
                ["Pelo WhatsApp", a.contatos.whatsapp],
              ].map(([r, v]) => (
                <div key={String(r)} className="flex flex-col">
                  <span className="text-[13px] text-hub-suave">{r}</span>
                  <b className="text-[22px] font-semibold tabular-nums">{v}</b>
                </div>
              ))}
            </div>
          </Cartao>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Cartao titulo="Situação">
          <div>
            <Linha
              rotulo="Site"
              valor={rotuloSituacaoSite[s.situacao]}
              tom={s.situacao === "no_ar" ? "ok" : undefined}
            />
            {s.situacao === "construcao" && s.projeto?.vai_ao_ar && (
              <Linha rotulo="Vai ao ar" valor={diaMes(s.projeto.vai_ao_ar)} />
            )}
            <Linha rotulo="Última publicação" valor={haQuanto(s.ultima_publicacao)} />
            {a && <Linha rotulo="Artigos em rascunho" valor={a.rascunhos} />}
            {a && (
              <Linha
                rotulo="Fotos sem descrição"
                valor={a.fotos_sem_descricao}
                tom={a.fotos_sem_descricao > 0 ? "risco" : undefined}
              />
            )}
          </div>
        </Cartao>

        {!nosso && (
          <Cartao titulo="Quem usa o painel">
            {!a ? (
              <div className="h-16 animate-pulse rounded-xl bg-[#F5F7FA]" />
            ) : a.pessoas.length === 0 ? (
              <p className="text-[14px] text-hub-suave">
                Ninguém da empresa tem acesso ainda. Convide na página do cliente, em Acesso ao
                portal.
              </p>
            ) : (
              <div>
                {a.pessoas.map((p, n) => (
                  <Linha
                    key={`${p.nome}-${n}`}
                    rotulo={`${p.nome ?? "Pessoa"} · ${p.perfil === "responsavel" ? "responsável" : "equipe"}`}
                    valor={
                      p.ultimo_acesso
                        ? `Entrou ${haQuanto(p.ultimo_acesso).toLowerCase()}`
                        : "Ainda não entrou"
                    }
                  />
                ))}
              </div>
            )}
          </Cartao>
        )}

        {!nosso && (
          <Cartao
            titulo="O que o cliente pode editar"
            acao={
              <button type="button" className={classeAcaoTexto} onClick={() => aoIr("edicao")}>
                Mudar ›
              </button>
            }
          >
            <div>
              {modulosSite.map((m) => (
                <Linha
                  key={m.id}
                  rotulo={m.rotulo}
                  valor={s.modulos.includes(m.id) ? "Ligado" : "Desligado"}
                  tom={s.modulos.includes(m.id) ? "ok" : undefined}
                />
              ))}
            </div>
          </Cartao>
        )}
      </div>
    </div>
  );
}
