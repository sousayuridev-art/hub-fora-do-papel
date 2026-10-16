import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { LinhaFases } from "@/components/projetos/LinhaFases";
import { PortalAcoes } from "@/components/portal/PortalAcoes";
import { PortalResumo } from "@/components/portal/PortalResumo";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { chavesPortal, inicioDoPortal } from "@/lib/portal";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Início · Portal Fora do Papel" }] }),
  component: Inicio,
});

function Inicio() {
  const q = useQuery({ queryKey: chavesPortal.inicio, queryFn: inicioDoPortal });
  const m = useMutacoesPortal();

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir o seu portal"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data)
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-16 w-72 animate-pulse rounded-xl bg-white" />
        <div className="h-40 animate-pulse rounded-3xl bg-white" />
      </div>
    );

  const d = q.data;
  const primeiro = d.contato?.split(" ")[0];
  const p = d.projeto;
  const atual = p?.fases.find((f) => f.status === "andamento") ?? null;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <TituloPortal
        rotulo={d.empresa}
        titulo={primeiro ? `Olá, ${primeiro}` : "Olá"}
        texto={`Aqui você acompanha o seu projeto, aprova entregas e faz pedidos. Seu responsável é ${d.responsavel}.`}
      />
      <PortalResumo p={d.pendencias} />
      <PortalAcoes
        acoes={d.acoes}
        enviando={m.pendencia.isPending}
        aoMarcarFeita={(id) => m.pendencia.mutate(id)}
      />

      {p ? (
        <section
          aria-labelledby="projeto-t"
          className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-7"
        >
          <div className="flex flex-col gap-1">
            <h2 id="projeto-t" className="font-titulo text-[20px] font-bold md:text-2xl">
              {p.nome}
            </h2>
            <p className="text-[14.5px] text-hub-suave">
              {p.status === "andamento"
                ? [
                    atual
                      ? `Agora: ${atual.nome}${atual.quando ? ` (${atual.quando})` : ""}`
                      : null,
                    p.lancamento
                      ? `lançamento previsto para ${diaMes(dataLocal(p.lancamento))}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : p.status === "mensalidade"
                  ? `No ar. Mensalidade ${p.plano ?? ""}${p.mensal_cents ? `, ${moeda(p.mensal_cents)} por mês` : ""}.`
                  : "Projeto concluído."}
            </p>
          </div>
          {p.fases.length > 0 && <LinhaFases fases={p.fases} />}
        </section>
      ) : (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          O seu projeto aparece aqui assim que começar.
        </p>
      )}
    </div>
  );
}
