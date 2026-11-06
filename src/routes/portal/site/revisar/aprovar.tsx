import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCircle2, Users } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { SemSite } from "@/components/portal/site/SemSite";
import { useMutacoesRevisao, useRevisao } from "@/components/portal/revisao/useRevisao";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { oQueFalta, prontoParaAprovar } from "@/lib/revisao";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/site/revisar/aprovar")({
  head: () => ({ meta: [{ title: "Aprovar o site · Painel Fora do Papel" }] }),
  component: AprovarSite,
});

const confirmacoes = [
  "Vi todas as páginas do site.",
  "Os ajustes que pedi foram feitos ou combinados.",
  "Autorizo colocar o site no ar.",
];

/**
 * Aprovar o site (card RS-3, tela 09): três confirmações e só o responsável pelo contrato que pode
 * aprovar (CX-0). Quem é da equipe vê que está pronto e quem aprova (tela 09b).
 */
function AprovarSite() {
  const navigate = useNavigate();
  const sites = useSitesPortal();
  const q = useRevisao(sites.site?.id ?? null);
  const m = useMutacoesRevisao(sites.site?.id ?? "sem-site");
  const [marcadas, setMarcadas] = useState([false, false, false]);

  if (sites.carregando) return <SemSite motivo="carregando" />;
  if (!sites.site) return <SemSite motivo="sem-site" />;
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir a aprovação"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div className="h-80 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  const r = q.data;
  const pronto = prontoParaAprovar(r);
  const falta = oQueFalta(r);
  const todas = marcadas.every(Boolean);

  const voltar = (
    <Link
      to="/portal/site/revisar"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-hub-suave hover:text-hub-tinta"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Meu site
    </Link>
  );

  if (r.aprovado_em)
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        {voltar}
        <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[40px]">
          O site já foi aprovado
        </h1>
        <p className="text-[15px] text-hub-suave">Mudanças novas são pedidos de ajuste.</p>
      </div>
    );

  return (
    <div className="flex max-w-2xl flex-col gap-4 max-md:pb-40">
      {voltar}
      {pronto && (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sit-ok px-3 py-1 text-[13px] font-semibold text-sit-ok-t">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Todos os ajustes conferidos
        </span>
      )}
      <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[40px]">
        {r.pode_aprovar ? "Tudo certo para colocar no ar?" : "Tudo pronto para aprovar"}
      </h1>

      {!r.pode_aprovar ? (
        <p className="flex gap-3 rounded-2xl bg-[#F1F1EC] p-4 text-[15px] leading-snug">
          <Users className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <b className="block">Quem aprova o site é {r.responsavel}.</b>É a pessoa responsável
            pelo contrato. Avisamos que está tudo pronto.
          </span>
        </p>
      ) : !pronto ? (
        <p className="rounded-2xl bg-sit-atencao p-4 text-[15px] text-sit-atencao-t">
          Ainda falta: {falta}. Confira tudo antes de aprovar.
        </p>
      ) : (
        <>
          <p className="text-[16px] leading-relaxed text-hub-suave">
            Esta é a última etapa. Depois de aprovar, o site vai para o ar e mudanças novas viram
            pedidos de ajuste.
          </p>
          <fieldset id="aprovar" className="flex flex-col gap-2">
            <legend className="sr-only">Confirmações</legend>
            {confirmacoes.map((c, i) => (
              <label
                key={c}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-2",
                  marcadas[i] ? "border-hub-tinta" : "border-hub-borda",
                )}
              >
                <input
                  type="checkbox"
                  checked={marcadas[i]}
                  onChange={(e) =>
                    setMarcadas((v) => v.map((x, j) => (j === i ? e.target.checked : x)))
                  }
                  className="size-5 shrink-0 accent-hub-tinta"
                />
                <span className="text-base leading-snug">{c}</span>
              </label>
            ))}
          </fieldset>
          <p className="flex items-center gap-2 text-[14px] text-hub-suave">
            <Users className="size-4" aria-hidden="true" /> Só você, como responsável pelo contrato,
            aprova o site.
          </p>
          <div className="barra-fixa flex flex-col gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:border-t max-md:border-hub-borda max-md:bg-white max-md:px-4 max-md:pt-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))] md:flex-row">
            <button
              type="button"
              disabled={!todas || m.aprovar.isPending}
              onClick={() =>
                m.aprovar.mutate(marcadas, {
                  onSuccess: () => void navigate({ to: "/portal/site/revisar" }),
                })
              }
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFB020] text-base font-semibold text-hub-tinta disabled:opacity-50"
            >
              <Check className="size-5" aria-hidden="true" />
              {m.aprovar.isPending ? "Aprovando…" : "Aprovar e colocar no ar"}
            </button>
            <Link
              to="/portal/site/revisar"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[#DADAD3] bg-white text-base font-semibold text-hub-tinta"
            >
              Ainda quero ajustar algo
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
