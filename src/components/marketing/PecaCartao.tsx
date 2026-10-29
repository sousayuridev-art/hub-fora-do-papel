import { ArrowRightLeft, MoreHorizontal, TriangleAlert, Trash2 } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { SiglaCanal } from "@/components/marketing/SiglaCanal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { diaMes } from "@/lib/formatar";
import {
  contarAvisos,
  etapasMoviveis,
  rotuloEtapa,
  rotuloPilar,
  type Etapa,
  type Peca,
} from "@/lib/marketing";

/**
 * Uma peça no quadro: campanha ou pilar, título, canais (verde = publicada), etapa, prazo e
 * avisos da marca. Clique abre o painel; o menu "…" move ou remove (toque e teclado).
 */
export function PecaCartao({
  p,
  hoje,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  p: Peca;
  hoje: string;
  aoAbrir: () => void;
  aoMover: (e: Etapa) => void;
  aoRemover: () => void;
}) {
  const avisos = contarAvisos(p);
  const atrasada =
    !!p.due_date && p.due_date < hoje && !["pronto", "publicado", "analisado"].includes(p.stage);
  const publicada = p.versoes.some((v) => v.published_at);
  const agendada = p.versoes
    .map((v) => v.scheduled_at)
    .filter((d): d is string => !!d)
    .sort()[0];
  const topo = p.campanha?.nome ?? (p.pillar ? rotuloPilar[p.pillar] : "Sem pilar");

  return (
    <li className="relative flex flex-col gap-1.5 rounded-xl border border-hub-borda bg-white p-3.5 pr-11 shadow-[0_1px_2px_rgba(14,16,19,0.04)] transition-colors hover:border-[#CFCFC8]">
      <span className="min-w-0 truncate text-[12.5px] text-hub-suave">{topo}</span>
      <button
        type="button"
        onClick={aoAbrir}
        className="text-left text-[14.5px] font-semibold leading-snug after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-hub-tinta"
      >
        {p.title}
      </button>
      <span className="flex flex-wrap items-center gap-1">
        {p.versoes.map((v) => (
          <SiglaCanal
            key={v.id}
            canal={v.channel}
            nome={v.canal_nome}
            publicada={!!v.published_at}
          />
        ))}
        {p.versoes.length === 0 && (
          <span className="text-[12.5px] text-hub-suave">Sem versões</span>
        )}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {p.coluna !== "aprovacao" && p.coluna !== "pronto" && (
          <Selo tom="neutro" ponto={false}>
            {rotuloEtapa[p.stage]}
          </Selo>
        )}
        {agendada && p.stage === "pronto" && (
          <Selo tom="info" ponto={false}>
            Agendada {diaMes(agendada)}
          </Selo>
        )}
        {p.due_date && !publicada && (
          <span
            className={atrasada ? "text-[12.5px] text-sit-risco-t" : "text-[12.5px] text-hub-suave"}
          >
            {atrasada ? "Atrasada · " : "Prazo "}
            {diaMes(p.due_date)}
          </span>
        )}
        {avisos.total > 0 && (
          <span
            className={
              avisos.bloqueiam > 0
                ? "inline-flex items-center gap-1 text-[12.5px] text-sit-risco-t"
                : "inline-flex items-center gap-1 text-[12.5px] text-sit-atencao-t"
            }
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {avisos.total} {avisos.total === 1 ? "aviso" : "avisos"}
          </span>
        )}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="absolute right-1 top-1 z-10 flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta"
          aria-label={`Ações da peça ${p.title}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!publicada && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-[13px] text-hub-suave">
                <ArrowRightLeft className="size-3.5" aria-hidden="true" /> Mover para
              </DropdownMenuLabel>
              {etapasMoviveis
                .filter((e) => e !== p.stage)
                .map((e) => (
                  <DropdownMenuItem key={e} className="min-h-11" onSelect={() => aoMover(e)}>
                    {rotuloEtapa[e]}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="min-h-11 text-sit-risco-t" onSelect={aoRemover}>
                <Trash2 className="size-4" aria-hidden="true" /> Remover peça
              </DropdownMenuItem>
            </>
          )}
          {publicada && (
            <DropdownMenuItem className="min-h-11" onSelect={aoAbrir}>
              Abrir resultados
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
