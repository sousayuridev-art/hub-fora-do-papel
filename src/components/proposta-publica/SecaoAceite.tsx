import { Link } from "@tanstack/react-router";
import { Check, Printer } from "lucide-react";

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
  email?: string | null;
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
        <div className="capa-escura flex flex-col gap-6 overflow-hidden rounded-3xl p-6 md:p-9">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-[#F5F5F2]/10"
          >
            <Check className="size-7 text-[#FFB020]" strokeWidth={2.6} />
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium text-[#8FD3A8]">
              Proposta aceita em {dataPorExtenso(aceite.aceita_em)}
            </span>
            <h3 className="font-marca text-[30px] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[44px]">
              Combinado, {aceite.nome.split(" ")[0]}. Vamos começar.
            </h3>
            <p className="max-w-[60ch] text-[15px] text-[#C9CBD0]">
              {doc.responsavel} vai falar com você para combinar o início. Daqui em diante, tudo do
              projeto fica no seu portal. Este comprovante continua neste mesmo link.
            </p>
          </div>
          <ol className="flex flex-col overflow-hidden rounded-2xl bg-[#F5F5F2] text-hub-tinta">
            {[
              {
                feito: true,
                t: "Aceite registrado",
                d: `Por ${aceite.nome}, ${aceite.razao_social}`,
              },
              {
                feito: false,
                t: "Primeira parte do pagamento",
                d: `${moeda(doc.investimento.parcelas[0]?.cents ?? 0)}, combinada com ${doc.responsavel}`,
              },
              {
                feito: false,
                t: "Acompanhe pelo portal",
                d: "Cada etapa chega lá para você aprovar",
              },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-4 border-b border-[#E4E4DE] p-4 last:border-b-0">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                    x.feito ? "bg-sit-ok text-sit-ok-t" : i === 1 ? "bg-[#FFB020]" : "bg-[#ECECE6]"
                  }`}
                >
                  {x.feito ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className="flex flex-col text-[14.5px]">
                  <b className="font-semibold">{x.t}</b>
                  <span className="text-hub-suave">{x.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <dl className="grid overflow-hidden rounded-2xl bg-white/5 md:grid-cols-2">
            {[
              ["Projeto", doc.tipo],
              [
                "Valor",
                `${moeda(doc.investimento.total_cents)} em ${doc.investimento.parcelas.length} partes`,
              ],
              [
                "Aceita por",
                `${aceite.nome}, ${aceite.razao_social} (${aceite.documento_tipo.toUpperCase()})`,
              ],
              ["Data", dataPorExtenso(aceite.aceita_em)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-1 border-b border-white/10 p-4 md:odd:border-r"
              >
                <dt className="text-[13px] text-[#A3A6AD]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row print:hidden">
            {!previa && (
              <Link
                to="/entrar"
                search={{ volta: "/portal", email: aceite.email ?? undefined }}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F5F5F2] px-6 text-[15px] font-semibold text-hub-tinta hover:bg-white max-sm:w-full"
              >
                Abrir meu portal
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-[15px] font-semibold text-[#F5F5F2] hover:bg-white/10 max-sm:w-full"
            >
              <Printer className="size-4" aria-hidden="true" />
              Imprimir ou salvar em PDF
            </button>
          </div>
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
