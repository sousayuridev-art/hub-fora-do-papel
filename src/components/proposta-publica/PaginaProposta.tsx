import { Eye } from "lucide-react";

import { BarraAceite } from "@/components/proposta-publica/BarraAceite";
import { HeroProposta } from "@/components/proposta-publica/HeroProposta";
import { SecaoAceite } from "@/components/proposta-publica/SecaoAceite";
import {
  SecaoFazer,
  SecaoFora,
  SecaoOuvimos,
  SecaoTrabalhar,
} from "@/components/proposta-publica/SecoesConteudo";
import { SecaoDepois, SecaoInvestimento } from "@/components/proposta-publica/SecoesValores";
import { TopoProposta } from "@/components/proposta-publica/TopoProposta";
import { secoes } from "@/components/proposta-publica/util";
import type { DadosAceite, PropostaPublica } from "@/lib/propostas";

type Aberta = Extract<PropostaPublica, { documento: unknown }>;

/** A proposta que o cliente lê (link público ou prévia do Yuri). */
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
    <div className="min-h-dvh bg-[#F7F6F2] text-hub-tinta">
      {previa && (
        <p className="flex items-center justify-center gap-2 bg-sit-info px-4 py-2.5 text-center text-[14px] font-medium text-sit-info-t print:hidden">
          <Eye className="size-4" aria-hidden="true" />
          Prévia: é assim que {doc.contato} vê. O aceite fica desativado aqui.
        </p>
      )}
      <TopoProposta empresa={doc.empresa} responsavel={doc.responsavel} />
      <main className="mx-auto max-w-[1120px] px-4 pb-32 md:px-6 md:pb-20">
        <HeroProposta doc={doc} aceitaEm={aceitaEm} aceitaPor={dados.aceite?.nome ?? null} />
        <div className="grid gap-10 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12">
          <nav aria-label="Nesta proposta" className="max-md:hidden print:hidden">
            <div className="sticky top-24 flex flex-col gap-1">
              <span className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-hub-suave">
                Nesta proposta
              </span>
              {secoes.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-[14px] text-hub-suave hover:bg-white hover:text-hub-tinta"
                >
                  <span className="text-[12.5px] font-semibold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.rotulo}
                </a>
              ))}
            </div>
          </nav>
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
