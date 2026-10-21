import { useEffect, useState } from "react";
import { BellRing, Check, Copy } from "lucide-react";

import { erro, ok } from "@/lib/notify";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { pixCopiaECola } from "@/lib/pix";
import type { Cobranca } from "@/lib/financeiro";

/**
 * Pagar uma cobrança pelo Pix da agência: QR e copia e cola com o valor exato.
 * "Já paguei" só avisa; quem confirma é o responsável, que registra o pagamento.
 */
export function PagarPix({
  c,
  pix,
  responsavel,
  enviando,
  aoAvisar,
}: {
  c: Cobranca;
  pix: { chave: string; nome: string; cidade: string } | null;
  responsavel: string | null;
  enviando: boolean;
  aoAvisar: () => void;
}) {
  const codigo = pix
    ? pixCopiaECola({
        chave: pix.chave,
        nome: pix.nome,
        cidade: pix.cidade,
        valorCents: c.valor_cents,
        identificador: c.id,
      })
    : null;
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    setQr(null);
    if (!codigo) return;
    void import("qrcode")
      .then((m) => m.toDataURL(codigo, { margin: 1, width: 360, errorCorrectionLevel: "M" }))
      .then((url) => vivo && setQr(url))
      .catch(() => vivo && setQr(null));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      ok("Código Pix copiado. Cole no app do seu banco.");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      erro("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  return (
    <section
      id="pagar"
      aria-labelledby="pagar-t"
      className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-hub-borda bg-white p-5 md:p-7"
    >
      <div className="flex flex-col gap-1">
        <span className="font-rotulo text-[13.5px] font-medium text-hub-suave">Pagar</span>
        <h2 id="pagar-t" className="font-titulo text-[20px] font-bold md:text-2xl">
          {c.descricao} · {moeda(c.valor_cents)}
        </h2>
        <p className="text-[14.5px] text-hub-suave">
          {c.vencimento ? `Vence em ${diaMes(dataLocal(c.vencimento))}.` : "Vencimento a combinar."}
          {c.dias_atraso > 0
            ? ` Está ${c.dias_atraso} ${c.dias_atraso === 1 ? "dia" : "dias"} atrasada; multa e juros podem ser combinados com ${responsavel ?? "o seu responsável"}.`
            : ""}
        </p>
      </div>

      {codigo ? (
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex size-44 shrink-0 items-center justify-center self-center rounded-2xl border border-hub-borda bg-white p-2 md:self-start">
            {qr ? (
              <img src={qr} alt={`QR Code Pix de ${moeda(c.valor_cents)}`} className="size-full" />
            ) : (
              <span
                className="size-full animate-pulse rounded-xl bg-hub-fundo"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[15px]">
              Abra o app do seu banco, escolha Pix e leia o código, ou copie o código abaixo. O
              valor já vem preenchido.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium">Pix copia e cola</span>
              <input
                readOnly
                value={codigo}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 w-full min-w-0 rounded-xl border border-[#DADAD3] bg-hub-fundo px-3 font-rotulo text-base md:text-[13px]"
              />
            </label>
            <button
              type="button"
              onClick={() => void copiar()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white md:w-auto md:self-start"
            >
              {copiado ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copiado ? "Copiado" : "Copiar código Pix"}
            </button>
            <p className="text-[13px] text-hub-suave">
              Quem recebe: {pix?.nome}. Chave: {pix?.chave}.
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-hub-fundo p-4 text-[15px]">
          Combine a forma de pagamento com {responsavel ?? "o seu responsável"}. Assim que o
          pagamento for registrado, o recibo aparece aqui.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-hub-borda pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[14px] text-hub-suave">
          {c.cliente_avisou_em
            ? "Você avisou que pagou. Assim que o pagamento for confirmado, o recibo aparece aqui."
            : "Já pagou? Avise para confirmarmos mais rápido."}
        </p>
        {!c.cliente_avisou_em && (
          <button
            type="button"
            disabled={enviando}
            onClick={aoAvisar}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold disabled:opacity-50 md:w-auto"
          >
            <BellRing className="size-4" aria-hidden="true" /> Já paguei
          </button>
        )}
      </div>
    </section>
  );
}
