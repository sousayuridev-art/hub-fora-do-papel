import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { CapaPortal, FolhaPortal } from "@/components/portal/CapaPortal";
import { LinhaProjeto } from "@/components/portal/LinhaProjeto";
import { PortalAcoes } from "@/components/portal/PortalAcoes";
import { ResponsavelCartao } from "@/components/portal/ResponsavelCartao";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { chavesPortal, inicioDoPortal, type InicioPortal } from "@/lib/portal";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Início · Portal Fora do Papel" }] }),
  component: Inicio,
});

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Uma frase com o número do "Precisa de você" (mesma conta dos selos). */
function resumo(total: number): string {
  if (total === 0) return "Nada depende de você agora. Avisamos quando precisar.";
  if (total === 1) return "Uma coisa espera por você.";
  const nomes = ["", "", "Duas", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez"];
  return `${nomes[total] ?? total} coisas esperam por você.`;
}

function linhaDoProjeto(p: NonNullable<InicioPortal["projeto"]>): string {
  if (p.status === "andamento")
    return p.lancamento ? `No ar em ${diaMes(dataLocal(p.lancamento))}` : "Em andamento";
  if (p.status === "mensalidade")
    return `No ar. Mensalidade ${p.plano ?? ""}${p.mensal_cents ? `, ${moeda(p.mensal_cents)} por mês` : ""}`;
  return "Projeto concluído";
}

/**
 * Início do portal (card CX-5, direção A): capa escura com a saudação e a linha do projeto;
 * na folha clara, o que precisa da pessoa e quem cuida do projeto.
 */
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

  return (
    <>
      <CapaPortal>
        <div className="flex flex-col gap-3">
          <h1 className="font-marca text-[36px] font-extrabold leading-[0.98] tracking-[-0.035em] md:text-[68px]">
            {saudacao()}
            {primeiro ? (
              <>
                ,<br className="md:hidden" /> {primeiro}.
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="max-w-[60ch] text-[15.5px] text-[#C9CBD0] md:text-[18px]">
            {resumo(d.pendencias.total)}
          </p>
        </div>
        {p ? (
          <div className="mt-7 flex flex-col gap-5 border-t border-white/15 pt-5 md:mt-11 md:pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <b className="font-marca text-[20px] font-bold tracking-[-0.02em] md:text-[24px]">
                {p.nome}
              </b>
              <span className="text-[14px] text-[#A3A6AD] max-md:hidden">{linhaDoProjeto(p)}</span>
            </div>
            {p.fases.length > 0 && <LinhaProjeto fases={p.fases} lancamento={p.lancamento} />}
          </div>
        ) : (
          <p className="mt-7 border-t border-white/15 pt-5 text-[15px] text-[#C9CBD0]">
            O seu projeto aparece aqui assim que começar.
          </p>
        )}
      </CapaPortal>

      <FolhaPortal>
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] md:gap-16">
          <div className="flex min-w-0 flex-col gap-4">
            <PortalAcoes
              acoes={d.acoes}
              enviando={m.pendencia.isPending}
              aoMarcarFeita={(id) => m.pendencia.mutate(id)}
            />
            {d.pendencias.pedidos_andamento > 0 && (
              <Link
                to="/portal/pedidos"
                className="inline-flex min-h-11 items-center self-start text-[14.5px] text-hub-suave underline-offset-4 hover:underline"
              >
                Acompanhando {d.pendencias.pedidos_andamento}{" "}
                {d.pendencias.pedidos_andamento === 1
                  ? "pedido de ajuste em andamento"
                  : "pedidos de ajuste em andamento"}
              </Link>
            )}
          </div>
          <ResponsavelCartao
            nome={d.responsavel}
            whatsapp={d.responsavel_whatsapp}
            empresa={d.empresa}
            contato={d.contato}
          />
        </div>
      </FolhaPortal>
    </>
  );
}
