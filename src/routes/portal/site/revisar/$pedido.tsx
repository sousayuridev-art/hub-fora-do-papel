import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, MessageCircle } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { SemSite } from "@/components/portal/site/SemSite";
import { useMutacoesRevisao, useRevisao } from "@/components/portal/revisao/useRevisao";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { enderecoDaPrevia } from "@/lib/materiais";
import { nomeDoTipo, situacaoDoAjuste, type AjusteEnviado } from "@/lib/revisao";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/site/revisar/$pedido")({
  head: () => ({ meta: [{ title: "Conferir ajuste · Painel Fora do Papel" }] }),
  component: Conferir,
});

const ehEndereco = (v: string | null) => Boolean(v && /^https?:\/\//.test(v));

/** "Ficou como você queria?" (card RS-3, tela 08): Antes e Depois num toque, e a decisão. */
function Conferir() {
  const { pedido } = Route.useParams();
  const navigate = useNavigate();
  const sites = useSitesPortal();
  const q = useRevisao(sites.site?.id ?? null);
  const [lado, setLado] = useState<"antes" | "depois">("depois");
  const [pedindo, setPedindo] = useState(false);
  const [texto, setTexto] = useState("");
  const m = useMutacoesRevisao(sites.site?.id ?? "sem-site");

  const todos = q.data?.rodadas.flatMap((d) => d.ajustes) ?? [];
  const a = todos.find((x) => x.id === pedido) ?? null;
  const paraVer = todos.filter((x) => x.situacao === "para_ver");
  const posicao = a ? paraVer.findIndex((x) => x.id === a.id) : -1;

  const fotoNova = useQuery({
    queryKey: ["revisao", "foto", a?.foto ?? ""],
    queryFn: () => enderecoDaPrevia(a?.foto as string),
    enabled: Boolean(a?.foto),
    staleTime: 8 * 60_000,
  });

  useEffect(() => setLado("depois"), [pedido]);

  if (sites.carregando) return <SemSite motivo="carregando" />;
  if (!sites.site) return <SemSite motivo="sem-site" />;
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir o ajuste"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div className="h-80 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (!a)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[15px]">Não encontramos este ajuste.</p>
        <Link to="/portal/site/revisar" className="font-semibold underline underline-offset-4">
          Voltar para a revisão
        </Link>
      </div>
    );
  return (
    <ConferirAjuste
      a={a}
      dominio={q.data.site.dominio}
      rotulo={
        posicao >= 0
          ? `Ajuste ${posicao + 1} de ${paraVer.length}`
          : situacaoDoAjuste[a.situacao].rotulo
      }
      lado={lado}
      aoTrocarLado={setLado}
      fotoNova={fotoNova.data ?? null}
      aoFicouBom={() =>
        m.bom.mutate(a.id, {
          onSuccess: () => {
            const proximo = paraVer.find((x) => x.id !== a.id);
            void navigate(
              proximo
                ? { to: "/portal/site/revisar/$pedido", params: { pedido: proximo.id } }
                : { to: "/portal/site/revisar" },
            );
          },
        })
      }
      ocupado={m.bom.isPending}
      aoPedirOutra={() => setPedindo(true)}
      painel={
        <PainelLateral
          aberto={pedindo}
          aoMudar={setPedindo}
          titulo="O que ainda precisa mudar?"
          descricao={
            a.refeito_vezes >= 2
              ? "Este ajuste já foi refeito duas vezes. Para mudar de novo, marque um ajuste novo na próxima revisão."
              : "Conte com suas palavras. Voltamos a fazer e avisamos quando estiver pronto."
          }
          rodape={
            <button
              type="button"
              disabled={texto.trim().length < 3 || m.outra.isPending || a.refeito_vezes >= 2}
              onClick={() =>
                m.outra.mutate(
                  { pedidoId: a.id, texto: texto.trim() },
                  {
                    onSuccess: () => {
                      setPedindo(false);
                      setTexto("");
                      void navigate({ to: "/portal/site/revisar" });
                    },
                  },
                )
              }
              className="h-12 w-full rounded-xl bg-[#FFB020] text-base font-semibold text-hub-tinta disabled:opacity-50"
            >
              Enviar o pedido
            </button>
          }
        >
          <label htmlFor="outra" className="mb-1.5 block text-[14px] font-semibold">
            O que mudar
          </label>
          <textarea
            id="outra"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={a.refeito_vezes >= 2}
            className="w-full resize-none rounded-xl border-[1.5px] border-hub-tinta bg-white px-3.5 py-3 text-base outline-none"
          />
        </PainelLateral>
      }
    />
  );
}

function ConferirAjuste({
  a,
  dominio,
  rotulo,
  lado,
  aoTrocarLado,
  fotoNova,
  aoFicouBom,
  ocupado,
  aoPedirOutra,
  painel,
}: {
  a: AjusteEnviado;
  dominio: string;
  rotulo: string;
  lado: "antes" | "depois";
  aoTrocarLado: (l: "antes" | "depois") => void;
  fotoNova: string | null;
  aoFicouBom: () => void;
  ocupado: boolean;
  aoPedirOutra: () => void;
  painel: ReactNode;
}) {
  const decidir = a.situacao === "para_ver";
  const antesFoto = ehEndereco(a.antes) ? a.antes : null;
  const conteudo =
    lado === "antes" ? (
      antesFoto ? (
        <img src={antesFoto} alt="Como estava" className="max-h-[360px] w-full object-cover" />
      ) : (
        <p className="p-5 text-[18px] leading-snug text-hub-suave">
          {a.antes ?? "Sem registro de como estava."}
        </p>
      )
    ) : fotoNova ? (
      <img src={fotoNova} alt="Foto nova" className="max-h-[360px] w-full object-cover" />
    ) : (
      <p className="p-5 text-[20px] font-semibold leading-snug text-hub-tinta">
        {a.depois ?? a.descricao ?? "Ajuste feito."}
      </p>
    );
  const ultimaDaEquipe = [...a.conversa].reverse().find((x) => x.autor === "equipe");

  return (
    <div className="flex max-w-2xl flex-col gap-4 max-md:pb-36">
      <Link
        to="/portal/site/revisar"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-hub-suave hover:text-hub-tinta"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {rotulo}
      </Link>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] text-hub-suave">
          {nomeDoTipo(a.tipo)} · {a.secao ?? a.pagina}
        </span>
        <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[40px]">
          {decidir ? "Ficou como você queria?" : situacaoDoAjuste[a.situacao].rotulo}
        </h1>
      </div>

      <div
        role="tablist"
        aria-label="Antes e depois"
        className="grid grid-cols-2 rounded-full bg-[#F1F1EC] p-1"
      >
        {(["antes", "depois"] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lado === l}
            onClick={() => aoTrocarLado(l)}
            className={cn(
              "h-11 rounded-full text-[15px] font-semibold",
              lado === l ? "bg-white text-hub-tinta shadow-sm" : "text-hub-suave",
            )}
          >
            {l === "antes" ? "Antes" : "Depois"}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
        {conteudo}
      </div>
      <a
        href={`https://${dominio}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold underline underline-offset-4"
      >
        Ver no site <ExternalLink className="size-4" aria-hidden="true" />
      </a>

      {(a.nota || ultimaDaEquipe) && (
        <p className="flex gap-2.5 rounded-xl bg-[#F1F1EC] p-3 text-[14.5px] leading-snug">
          <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <b>{ultimaDaEquipe?.nome ?? "Fora do Papel"}:</b> {ultimaDaEquipe?.texto ?? a.nota}
          </span>
        </p>
      )}

      {decidir && (
        <div className="barra-fixa flex flex-col gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:border-t max-md:border-hub-borda max-md:bg-white max-md:px-4 max-md:pt-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))] md:flex-row">
          <button
            type="button"
            disabled={ocupado}
            onClick={aoFicouBom}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFB020] text-base font-semibold text-hub-tinta disabled:opacity-60"
          >
            <Check className="size-5" aria-hidden="true" /> Ficou bom
          </button>
          <button
            type="button"
            onClick={aoPedirOutra}
            className="h-12 flex-1 rounded-xl border border-[#DADAD3] bg-white text-base font-semibold text-hub-tinta"
          >
            Quero outra mudança
          </button>
        </div>
      )}
      {painel}
    </div>
  );
}
