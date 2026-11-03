import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Sigla } from "@/components/hub/Selo";
import { CapaDoSistema } from "@/components/sistemas/CapaDoSistema";
import { moeda, sigla } from "@/lib/formatar";
import {
  rotuloSituacaoSistema,
  textoDoAvisoSistema,
  type SistemaResumo,
  type SituacaoSistema,
} from "@/lib/sistemas";
import { cn } from "@/lib/utils";

const corSituacaoSistema: Record<SituacaoSistema, string> = {
  no_ar: "bg-sit-ok text-sit-ok-t",
  teste: "bg-sit-atencao text-sit-atencao-t",
  construcao: "bg-sit-info text-sit-info-t",
  pausado: "bg-[#F1F1EC] text-[#2A2D33]",
};

export function SeloSituacaoSistema({ situacao }: { situacao: SituacaoSistema }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium",
        corSituacaoSistema[situacao],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {rotuloSituacaoSistema[situacao]}
    </span>
  );
}

function Numero({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 text-[12.5px] text-hub-suave">
      <b className="truncate text-[15.5px] font-semibold tabular-nums text-hub-tinta">{valor}</b>
      {rotulo}
    </span>
  );
}

/** Cartão de um sistema (SIS-1): print da tela, situação, 3 números e o aviso principal. */
export function SistemaCartao({
  s,
  logo,
  capa,
}: {
  s: SistemaResumo;
  logo: string | undefined;
  capa: string | undefined;
}) {
  const aviso = textoDoAvisoSistema(s);
  const obra = (s.situacao === "construcao" || s.situacao === "teste") && s.projeto;
  const numeros = [
    obra && s.projeto
      ? {
          valor:
            s.projeto.fase_posicao && s.projeto.fases_total
              ? `Fase ${s.projeto.fase_posicao} de ${s.projeto.fases_total}`
              : "Em andamento",
          rotulo: s.projeto.fase_nome ?? "projeto",
        }
      : {
          valor: s.mensalidade_cents > 0 ? moeda(s.mensalidade_cents) : "—",
          rotulo: "mensalidade",
        },
    {
      valor: s.pedidos_abertos,
      rotulo: s.pedidos_abertos === 1 ? "pedido aberto" : "pedidos abertos",
    },
    {
      valor: s.custo_nosso_cents > 0 ? moeda(s.custo_nosso_cents) : "—",
      rotulo: "custo/mês",
    },
  ];

  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white transition-shadow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-hub-tinta hover:shadow-[0_8px_20px_-10px_rgba(14,16,19,0.25)]">
      <CapaDoSistema url={capa} nome={s.nome} endereco={s.url_producao} />
      <span className="flex flex-col gap-3 px-4 py-3.5">
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <Sigla texto={sigla(s.empresa)} logo={logo} />
            <span className="flex min-w-0 flex-col">
              <Link
                to="/app/sistemas/$id"
                params={{ id: s.id }}
                className="truncate font-semibold outline-none after:absolute after:inset-0 after:content-['']"
              >
                {s.nome}
              </Link>
              <span className="truncate text-[13px] text-hub-suave">{s.empresa}</span>
            </span>
          </span>
          <SeloSituacaoSistema situacao={s.situacao} />
        </span>
        <span className="grid grid-cols-3 gap-2">
          {numeros.map((n) => (
            <Numero key={n.rotulo} valor={n.valor} rotulo={n.rotulo} />
          ))}
        </span>
      </span>
      {aviso && (
        <span
          className={cn(
            "mt-auto flex items-start gap-2 border-t px-4 py-2.5 text-[13px]",
            aviso.tom === "risco"
              ? "border-[#F6D3CF] bg-sit-risco text-sit-risco-t"
              : "border-[#F5E2BC] bg-sit-atencao text-sit-atencao-t",
          )}
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {aviso.texto}
        </span>
      )}
    </article>
  );
}
