import { CheckCircle2, Printer } from "lucide-react";

import { FormularioAceite } from "@/components/proposta-publica/FormularioAceite";
import { TituloSecao } from "@/components/proposta-publica/TituloSecao";
import { dataPorExtenso } from "@/components/proposta-publica/util";
import { moeda } from "@/lib/formatar";
import type { DadosAceite, DocumentoPublico } from "@/lib/propostas";

type Aceite = {
  nome: string;
  razao_social: string;
  documento_tipo: "cpf" | "cnpj";
  aceita_em: string;
};

/** 07 Aceite: formulário, comprovante (aceita) ou aviso (recusada). */
export function SecaoAceite({
  doc,
  estado,
  aceite,
  previa,
  enviando,
  aoAceitar,
  aoRecusar,
}: {
  doc: DocumentoPublico;
  estado: "enviada" | "aceita" | "recusada";
  aceite: Aceite | null;
  previa: boolean;
  enviando: boolean;
  aoAceitar: (d: DadosAceite) => void;
  aoRecusar: (motivo: string) => void;
}) {
  return (
    <section id="aceite" aria-labelledby="aceite-t" className="flex flex-col gap-5">
      <TituloSecao numero={7} id="aceite">
        Aceite
      </TituloSecao>
      {estado === "aceita" && aceite ? (
        <div className="flex flex-col gap-6 rounded-3xl bg-hub-tinta p-6 text-white md:p-8">
          <CheckCircle2 className="size-12 text-[#FFB020]" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#C9CBD0]">
              Comprovante de aceite
            </span>
            <h3 className="font-titulo text-[24px] font-bold leading-tight md:text-[34px]">
              Proposta aceita. Vamos começar.
            </h3>
            <p className="text-[15px] text-[#C9CBD0]">
              {doc.responsavel} recebe o aviso agora e fala com você para combinar o início. Guarde
              este comprovante: ele fica neste mesmo link.
            </p>
          </div>
          <dl className="grid overflow-hidden rounded-2xl bg-white/5 md:grid-cols-2">
            {[
              ["Projeto", doc.tipo],
              [
                "Valor",
                `${moeda(doc.investimento.total_cents)} em ${doc.investimento.parcelas.length} partes`,
              ],
              [
                "Aceita por",
                `${aceite.nome} · ${aceite.razao_social} (${aceite.documento_tipo.toUpperCase()})`,
              ],
              ["Data", dataPorExtenso(aceite.aceita_em)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-1 border-b border-white/10 p-4 md:odd:border-r"
              >
                <dt className="text-[13px] text-[#C9CBD0]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-[15px] font-semibold text-hub-tinta print:hidden max-sm:w-full"
          >
            <Printer className="size-4" aria-hidden="true" />
            Imprimir ou salvar em PDF
          </button>
        </div>
      ) : estado === "recusada" ? (
        <p className="rounded-2xl border border-hub-borda bg-white p-6 text-[15px]">
          Você indicou que não vai seguir agora. Obrigado por avisar. Se mudar de ideia, fale com{" "}
          {doc.responsavel}: ele prepara uma versão atualizada.
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-7">
          <p className="text-[15px] text-hub-suave">
            Para aceitar, preencha os dados que vão no contrato. Depois do aceite, combinamos a
            cobrança da primeira parte ({moeda(doc.investimento.parcelas[0]?.cents ?? 0)}) e o
            trabalho começa.
          </p>
          <FormularioAceite
            nomeInicial={doc.contato}
            empresa={doc.empresa}
            previa={previa}
            enviando={enviando}
            aoAceitar={aoAceitar}
            aoRecusar={aoRecusar}
          />
        </div>
      )}
    </section>
  );
}
