import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { useLogos } from "@/components/clientes/useLogos";
import { SistemaCartao } from "@/components/sistemas/SistemaCartao";
import { SistemaPainel } from "@/components/sistemas/SistemaPainel";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import { chavesSistemas, sistemasResumo, type SistemaResumo } from "@/lib/sistemas";

const busca = z.object({
  filtro: z.enum(["todos", "no_ar", "construcao", "atencao"]).optional().catch(undefined),
});
type Filtro = "todos" | "no_ar" | "construcao" | "atencao";

export const Route = createFileRoute("/app/sistemas/")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Sistemas · Hub Fora do Papel" }] }),
  component: Sistemas,
});

function noFiltro(s: SistemaResumo, f: Filtro) {
  if (f === "todos") return true;
  if (f === "atencao") return s.avisos.length > 0;
  if (f === "construcao") return s.situacao === "construcao" || s.situacao === "teste";
  return s.situacao === f;
}

/**
 * Sistemas (card SIS-1): os sistemas sob medida que entregamos, no mesmo formato da central de
 * Sites. Números e avisos vêm prontos do banco (sistemas_resumo).
 */
function Sistemas() {
  const { filtro = "todos" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesSistemas.resumo, queryFn: sistemasResumo });
  const [novo, setNovo] = useState(false);
  const itens = useMemo(
    () => (q.data?.itens ?? []).filter((s) => noFiltro(s, filtro)),
    [q.data, filtro],
  );
  const imagens = useLogos([...itens.map((s) => s.logo_path), ...itens.map((s) => s.capa_path)]);
  const r = q.data?.resumo;
  const escolher = (f: Filtro) =>
    void navigate({ search: { filtro: f === "todos" ? undefined : f }, replace: true });

  const abas: { id: Filtro; rotulo: string; n: number | undefined }[] = [
    { id: "todos", rotulo: "Todos", n: r?.total },
    { id: "no_ar", rotulo: "No ar", n: r?.no_ar },
    { id: "construcao", rotulo: "Em construção", n: r?.construcao },
    { id: "atencao", rotulo: "Pedem atenção", n: r?.atencao },
  ];

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Entregar"
        titulo="Sistemas"
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" /> Novo sistema
          </button>
        }
      />

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os sistemas"
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
              apoio: `de ${r.total} ${r.total === 1 ? "sistema" : "sistemas"}`,
              aoClicar: () => escolher("no_ar"),
              ativo: filtro === "no_ar",
            },
            {
              rotulo: "Pedem atenção",
              valor: r.atencao,
              apoio: r.atencao === 0 ? "Tudo em dia" : "veja os avisos nos cartões",
              tom: r.atencao > 0 ? "atencao" : undefined,
              aoClicar: () => escolher("atencao"),
              ativo: filtro === "atencao",
            },
            {
              rotulo: "Mensalidades desses clientes",
              valor: moeda(r.mensalidades_cents),
              apoio: "por mês",
            },
            {
              rotulo: "Nosso custo de infraestrutura",
              valor: moeda(r.custo_nosso_cents),
              apoio: "por mês",
            },
          ]}
        />
      )}

      <div
        role="tablist"
        aria-label="Quais sistemas"
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

      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {q.data && q.data.itens.length === 0
            ? "Nenhum sistema ainda. Use “Novo sistema” para cadastrar o primeiro."
            : "Nenhum sistema com esse filtro."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((s) => (
            <SistemaCartao
              key={s.id}
              s={s}
              logo={s.logo_path ? imagens[s.logo_path] : undefined}
              capa={s.capa_path ? imagens[s.capa_path] : undefined}
            />
          ))}
        </div>
      )}

      <SistemaPainel
        aberto={novo}
        sistema={null}
        aoFechar={() => setNovo(false)}
        aoCriar={(id) => void navigate({ to: "/app/sistemas/$id", params: { id } })}
      />
    </div>
  );
}
