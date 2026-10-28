import { useState, type ReactNode } from "react";
import { ExternalLink, MessageSquarePlus } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { acoesRapidas } from "@/components/layout/navegacao";
import { AcoesRapidas } from "@/components/portal/AcoesRapidas";
import { FazerPedidoPainel } from "@/components/portal/FazerPedidoPainel";
import { SaudeSite } from "@/components/portal/SaudeSite";
import { CapaPortal, FolhaPortal } from "@/components/portal/CapaPortal";
import { LinhaProjeto } from "@/components/portal/LinhaProjeto";
import { PortalAcoes } from "@/components/portal/PortalAcoes";
import { PortalModulosNoAr } from "@/components/portal/PortalModulosNoAr";
import { ResponsavelCartao } from "@/components/portal/ResponsavelCartao";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { chavesPortal, inicioDoPortal, marcosDosModulos, type InicioPortal } from "@/lib/portal";

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

const longo = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
/** "11 de novembro" */
const diaLongo = (iso: string) => longo.format(dataLocal(iso));

function linhaDoProjeto(p: NonNullable<InicioPortal["projeto"]>): ReactNode {
  if (p.status === "andamento")
    return p.lancamento ? (
      <>
        No ar em <b className="font-semibold text-[#F5F5F2]">{diaLongo(p.lancamento)}</b>
      </>
    ) : (
      "Em andamento"
    );
  if (p.status === "mensalidade")
    return `No ar. Mensalidade ${p.plano ?? ""}${p.mensal_cents ? `, ${moeda(p.mensal_cents)} por mês` : ""}`;
  return "Projeto concluído";
}

/**
 * Início do painel (cards CX-5 e PC-1, direção A): capa escura com a saudação, o site e a linha do projeto;
 * na folha clara, o que precisa da pessoa, ações rápidas, saúde do site e quem cuida do projeto.
 * Sem site ligado, fica como o Início de antes.
 */
function Inicio() {
  const q = useQuery({ queryKey: chavesPortal.inicio, queryFn: inicioDoPortal });
  const m = useMutacoesPortal();
  const [pedindo, setPedindo] = useState(false);

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
  const site = d.site ?? null;

  return (
    <>
      <CapaPortal>
        <div className="flex flex-col gap-3">
          <h1 className="font-marca text-[36px] font-extrabold leading-[0.96] tracking-[-0.04em] md:text-[72px]">
            {saudacao()}
            {primeiro ? (
              <>
                ,<br className="md:hidden" /> {primeiro}.
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="mt-1 max-w-[60ch] text-[15.5px] leading-relaxed text-[#C9CBD0] md:mt-1 md:text-[18px]">
            {resumo(d.pendencias.total + (d.pendencias.contatos ?? 0))}
          </p>
          {site && (
            <div className="mt-5 flex flex-col gap-4 md:mt-7">
              <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] text-[#C9CBD0]">
                <span
                  aria-hidden="true"
                  className={
                    site.no_ar
                      ? "size-2 rounded-full bg-[#3BB273]"
                      : "size-2 rounded-full bg-[#9A9DA3]"
                  }
                />
                {site.no_ar ? (
                  <>
                    No ar em <b className="font-semibold text-[#F5F5F2]">{site.dominio}</b>
                  </>
                ) : (
                  <>{site.nome} ainda não está no ar</>
                )}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPedindo(true)}
                  className="botao-degrade inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-hub-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-sm:w-full"
                >
                  <MessageSquarePlus className="size-4" aria-hidden="true" /> Pedir um ajuste
                </button>
                {site.no_ar && (
                  <a
                    href={`https://${site.dominio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-[15px] font-semibold text-[#F5F5F2] hover:bg-white/10 max-sm:w-full"
                  >
                    Ver site <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only">(abre em outra aba)</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
        {p ? (
          <div aria-label="Linha do projeto" className="mt-8 flex flex-col gap-5 md:mt-[46px]">
            <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1">
              <b className="font-marca text-[20px] font-bold tracking-[-0.02em] md:text-[22px]">
                {p.nome}
              </b>
              <span className="text-[14px] text-[#A3A6AD] max-md:hidden">{linhaDoProjeto(p)}</span>
            </div>
            {p.tipo === "sob_medida"
              ? (p.modulos?.length ?? 0) > 0 && (
                  <LinhaProjeto
                    fases={marcosDosModulos(p.modulos ?? [])}
                    lancamento={p.lancamento}
                    rotuloEtapa="Módulo"
                  />
                )
              : p.fases.length > 0 && <LinhaProjeto fases={p.fases} lancamento={p.lancamento} />}
          </div>
        ) : (
          <p className="mt-8 text-[15px] text-[#C9CBD0] md:mt-[46px]">
            O seu projeto aparece aqui assim que começar.
          </p>
        )}
      </CapaPortal>

      <FolhaPortal>
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] md:gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-[72px]">
          <div className="flex min-w-0 flex-col gap-4">
            <PortalAcoes
              acoes={d.acoes}
              enviando={m.pendencia.isPending}
              aoMarcarFeita={(id) => m.pendencia.mutate(id)}
              contatos={d.pendencias.contatos ?? 0}
            />
            {site && (
              <AcoesRapidas acoes={acoesRapidas(site.modulos)} aoPedir={() => setPedindo(true)} />
            )}
            {d.projeto?.tipo === "sob_medida" && (
              <PortalModulosNoAr modulos={d.projeto.modulos ?? []} />
            )}
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
          <div className="flex flex-col gap-6">
            {site && <SaudeSite site={site} />}
            <ResponsavelCartao
              nome={d.responsavel}
              whatsapp={d.responsavel_whatsapp}
              empresa={d.empresa}
              contato={d.contato}
            />
          </div>
        </div>
      </FolhaPortal>
      <FazerPedidoPainel
        aberto={pedindo}
        aoMudar={setPedindo}
        aoEnviar={(v) => m.pedido.mutateAsync(v)}
        origem={site ? { siteId: site.id } : undefined}
      />
    </>
  );
}
