import { Eye } from "lucide-react";

import { BarraAceite } from "@/components/proposta-publica/BarraAceite";
import { HeroProposta } from "@/components/proposta-publica/HeroProposta";
import { IndiceProposta } from "@/components/proposta-publica/IndiceProposta";
import { SecaoAceite } from "@/components/proposta-publica/SecaoAceite";
import {
  SecaoFazer,
  SecaoFora,
  SecaoOuvimos,
  SecaoTrabalhar,
} from "@/components/proposta-publica/SecoesConteudo";
import { SecaoDepois, SecaoInvestimento } from "@/components/proposta-publica/SecoesValores";
import { TopoProposta } from "@/components/proposta-publica/TopoProposta";
import type { DadosAceite, PropostaPublica } from "@/lib/propostas";

type Aberta = Extract<PropostaPublica, { documento: unknown }>;

/**
 * A proposta que o cliente lê (link público ou prévia do Yuri). Direção A (card CX-3):
 * capa escura com a promessa e o investimento; o conteúdo numa folha clara que sobe por cima.
 */
export function PaginaProposta({
  dados,
  previa = false,
  enviando = false,
  aoAceitar,
  aoRecusar,
}: {
  dados: Aberta;
  previa?: boolean;
  enviando?: boolean;
  aoAceitar: (d: DadosAceite) => void;
  aoRecusar: (motivo: string) => void;
}) {
  const doc = dados.documento;
  const aceitaEm = dados.estado === "aceita" ? (dados.aceite?.aceita_em ?? null) : null;
  return (
    <div className="min-h-dvh bg-[#F5F5F2] text-hub-tinta">
      {previa && (
        <p className="flex items-center justify-center gap-2 bg-sit-info px-4 py-2.5 text-center text-[14px] font-medium text-sit-info-t print:hidden">
          <Eye className="size-4" aria-hidden="true" />
          Prévia: é assim que {doc.contato} vê. O aceite fica desativado aqui.
        </p>
      )}
      <TopoProposta empresa={doc.empresa} responsavel={doc.responsavel} />
      <div className="capa-escura">
        <HeroProposta doc={doc} aceitaEm={aceitaEm} aceitaPor={dados.aceite?.nome ?? null} />
      </div>
      <main className="relative -mt-8 rounded-t-[28px] bg-[#F5F5F2] shadow-[0_-20px_50px_-20px_rgba(14,16,19,0.35)] md:-mt-10 md:rounded-t-[36px] print:mt-0 print:shadow-none">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-4 pb-32 pt-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12 md:px-6 md:pb-20 md:pt-14">
          <IndiceProposta />
          <div className="flex min-w-0 flex-col gap-14 md:gap-20">
            <SecaoOuvimos doc={doc} />
            <SecaoFazer doc={doc} />
            <SecaoFora doc={doc} />
            <SecaoTrabalhar doc={doc} />
            <SecaoInvestimento doc={doc} />
            <SecaoDepois doc={doc} />
            <SecaoAceite
              doc={doc}
              estado={dados.estado}
              aceite={dados.aceite}
              previa={previa}
              enviando={enviando}
              aoAceitar={aoAceitar}
              aoRecusar={aoRecusar}
            />
          </div>
        </div>
      </main>
      {dados.estado !== "recusada" && <BarraAceite doc={doc} aceita={aceitaEm} />}
    </div>
  );
}
