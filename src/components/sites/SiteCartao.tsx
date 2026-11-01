import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Sigla } from "@/components/hub/Selo";
import { CapaDoSite } from "@/components/sites/CapaDoSite";
import { sigla } from "@/lib/formatar";
import {
  haQuanto,
  rotuloSituacaoSite,
  textoDoAviso,
  type SiteResumo,
  type SituacaoDoSite,
} from "@/lib/sitesHub";
import { cn } from "@/lib/utils";

const corSituacao: Record<SituacaoDoSite, string> = {
  no_ar: "bg-sit-ok text-sit-ok-t",
  construcao: "bg-sit-info text-sit-info-t",
  fora: "bg-[#F1F1EC] text-[#2A2D33]",
};

function Numero({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 text-[12.5px] text-hub-suave">
      <b className="truncate text-[15.5px] font-semibold text-hub-tinta">{valor}</b>
      {rotulo}
    </span>
  );
}

/** Cartão de um site na central (RD2-8): primeira seção, situação, 3 números e o aviso principal. */
export function SiteCartao({ s, logo }: { s: SiteResumo; logo: string | undefined }) {
  const aviso = textoDoAviso(s);
  const nosso = s.client_id === null;
  const numeros: { valor: string | number; rotulo: string }[] =
    s.situacao === "construcao" && s.projeto
      ? [
          {
            valor:
              s.projeto.fase_posicao && s.projeto.fases_total
                ? `Fase ${s.projeto.fase_posicao} de ${s.projeto.fases_total}`
                : "Em andamento",
            rotulo: s.projeto.fase_nome ?? "projeto",
          },
          { valor: s.contatos_mes, rotulo: "contatos no mês" },
          { valor: s.pessoas > 0 ? haQuanto(s.ultimo_acesso) : "—", rotulo: "cliente entrou" },
        ]
      : nosso
        ? [
            { valor: s.artigos, rotulo: "artigos publicados" },
            { valor: s.contatos_mes, rotulo: "contatos no mês" },
            { valor: haQuanto(s.ultima_publicacao), rotulo: "última publicação" },
          ]
        : [
            { valor: s.publicacoes_cliente_30d, rotulo: "publicações do cliente" },
            { valor: s.contatos_mes, rotulo: "contatos no mês" },
            { valor: s.pessoas > 0 ? haQuanto(s.ultimo_acesso) : "—", rotulo: "cliente entrou" },
          ];

  return (
    // Cartão com link esticado: a capa traz links do próprio site, que não podem ficar dentro de outro link
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white transition-shadow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-hub-tinta hover:shadow-[0_8px_20px_-10px_rgba(14,16,19,0.25)]">
      <CapaDoSite capa={s.capa} />
      <span className="flex flex-col gap-3 px-4 py-3.5">
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            {!nosso && <Sigla texto={sigla(s.empresa ?? s.nome)} logo={logo} />}
            <span className="flex min-w-0 flex-col">
              <Link
                to="/app/sites/$id"
                params={{ id: s.id }}
                className="truncate font-semibold outline-none after:absolute after:inset-0 after:content-['']"
              >
                {nosso ? s.nome : (s.empresa ?? s.nome)}
              </Link>
              <span className="truncate text-[13px] text-hub-suave">
                {s.dominio}
                {nosso ? " · nosso site" : ""}
              </span>
            </span>
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium",
              corSituacao[s.situacao],
            )}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {rotuloSituacaoSite[s.situacao]}
          </span>
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
