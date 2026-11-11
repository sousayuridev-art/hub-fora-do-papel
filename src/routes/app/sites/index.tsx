import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { useLogos } from "@/components/clientes/useLogos";
import { SiteCartao } from "@/components/sites/SiteCartao";
import { chavesSitesHub, diasDesde, sitesResumo, type SiteResumo } from "@/lib/sitesHub";

const busca = z.object({
  filtro: z.enum(["todos", "no_ar", "construcao", "atencao"]).optional().catch(undefined),
});
type Filtro = "todos" | "no_ar" | "construcao" | "atencao";

export const Route = createFileRoute("/app/sites/")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Sites · Hub Fora do Papel" }] }),
  component: Sites,
});

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function noFiltro(s: SiteResumo, f: Filtro) {
  if (f === "todos") return true;
  if (f === "atencao") return s.avisos.length > 0;
  return s.situacao === f;
}

/**
 * Sites (card RD2-8): todos os sites que entregamos, o da Fora do Papel primeiro, com o que
 * cada cliente faz no dele. Números e avisos vêm prontos do banco (sites_resumo).
 */
function Sites() {
  const { filtro = "todos" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesSitesHub.resumo, queryFn: sitesResumo });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(semAcento(texto.trim()));
  const itens = useMemo(
    () =>
      (q.data?.itens ?? []).filter(
        (s) =>
          noFiltro(s, filtro) &&
          (!termo || semAcento(`${s.nome} ${s.dominio} ${s.empresa ?? ""}`).includes(termo)),
      ),
    [q.data, filtro, termo],
  );
  const logos = useLogos(itens.map((s) => s.logo_path));
  const r = q.data?.resumo;
  const escolher = (f: Filtro) =>
    void navigate({ search: { filtro: f === "todos" ? undefined : f }, replace: true });
  const desde = diasDesde(r?.sem_resposta_desde ?? null);

  const abas: { id: Filtro; rotulo: string; n: number | undefined }[] = [
    { id: "todos", rotulo: "Todos", n: r?.total },
    { id: "no_ar", rotulo: "No ar", n: r?.no_ar },
    { id: "construcao", rotulo: "Em construção", n: r?.construcao },
    { id: "atencao", rotulo: "Pedem atenção", n: r?.atencao },
  ];

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina grupo="Entregar" titulo="Sites" />

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os sites"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !r ? (
        <div className="h-[92px] animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : (
        <FaixaNumeros
          itens={[
            {
              rotulo: "No ar",
              valor: r.no_ar,
              apoio: `de ${r.total} ${r.total === 1 ? "site" : "sites"}`,
              aoClicar: () => escolher("no_ar"),
              ativo: filtro === "no_ar",
            },
            {
              rotulo: "Contatos sem resposta",
              valor: r.sem_resposta,
              apoio:
                r.sem_resposta === 0
                  ? "Ninguém esperando"
                  : desde === 0
                    ? "o mais antigo é de hoje"
                    : `o mais antigo há ${desde} ${desde === 1 ? "dia" : "dias"}`,
              tom: r.sem_resposta > 0 && (desde ?? 0) >= 2 ? "risco" : undefined,
              aoClicar: () => escolher("atencao"),
              ativo: filtro === "atencao",
            },
            {
              rotulo: "Publicado pelos clientes",
              valor: r.publicacoes_cliente_30d,
              apoio: "nos últimos 30 dias",
            },
            {
              rotulo: "Pedidos de ajuste dos sites",
              valor: r.pedidos_abertos,
              apoio: r.pedidos_abertos === 1 ? "aberto" : "abertos",
            },
          ]}
        />
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Quais sites"
          className="flex max-w-full self-start overflow-x-auto rounded-xl bg-[#E9EDF2] p-1"
        >
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={filtro === a.id}
              onClick={() => escolher(a.id)}
              className={
                filtro === a.id
                  ? "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] md:min-h-10"
                  : "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-[14px] text-[#4A4D54] hover:text-hub-tinta md:min-h-10"
              }
            >
              {a.rotulo}
              {a.n !== undefined && <span className="tabular-nums text-hub-suave">{a.n}</span>}
            </button>
          ))}
        </div>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#D9DEE5] bg-white px-3 focus-within:border-hub-tinta md:w-80">
          <Search className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
          <span className="sr-only">Buscar site</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar site, domínio ou cliente"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none md:text-[15px]"
          />
        </label>
      </div>

      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {q.data && q.data.itens.length === 0
            ? "Nenhum site ainda. Ligue um site a um cliente na página do cliente, aba Projetos e propostas."
            : "Nenhum site com esses filtros."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((s) => (
            <SiteCartao key={s.id} s={s} logo={s.logo_path ? logos[s.logo_path] : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
