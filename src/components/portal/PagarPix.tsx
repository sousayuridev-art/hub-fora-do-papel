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

  const vence = c.vencimento ? diaMes(dataLocal(c.vencimento)) : null;
  return (
    <section
      id="pagar"
      aria-labelledby="pagar-t"
      className="capa-escura flex scroll-mt-24 flex-col gap-5 rounded-3xl p-4 md:p-7"
    >
      {/* Recibo de papel (card CX-6): o valor em destaque e uma ação principal */}
      <div className="bilhete flex flex-col rounded-t-xl bg-[#F5F5F2] px-5 pb-8 pt-5 text-hub-tinta md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] text-[#2A2D33]">{c.descricao}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${
              c.dias_atraso > 0
                ? "bg-sit-risco text-sit-risco-t"
                : "bg-sit-atencao text-sit-atencao-t"
            }`}
          >
            {c.dias_atraso > 0 ? `Venceu em ${vence}` : vence ? `Vence em ${vence}` : "A combinar"}
          </span>
        </div>
        <h2
          id="pagar-t"
          className="mt-3 font-marca text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular-nums md:text-[56px]"
        >
          {moeda(c.valor_cents)}
        </h2>
        {c.dias_atraso > 0 && (
          <p className="mt-2 text-[14px] text-hub-suave">
            Multa e juros podem ser combinados com {responsavel ?? "o seu responsável"}.
          </p>
        )}
        <i aria-hidden="true" className="my-5 border-t-[1.5px] border-dashed border-[#C9C9C2]" />

        {codigo ? (
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex justify-between gap-4 py-1 text-[14px]">
                <span className="text-hub-suave">Recebedor</span>
                <b className="truncate font-semibold">{pix?.nome}</b>
              </span>
              <span className="flex justify-between gap-4 py-1 text-[14px]">
                <span className="text-hub-suave">Forma</span>
                <b className="font-semibold">Pix, valor já preenchido</b>
              </span>
              <button
                type="button"
                onClick={() => void copiar()}
                className="mt-4 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB020] px-5 text-[16px] font-semibold text-hub-tinta hover:brightness-95"
              >
                {copiado ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copiado ? "Copiado" : "Copiar código Pix"}
              </button>
              <details className="group mt-1 md:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center text-[14px] font-semibold underline underline-offset-4">
                  <span className="group-open:hidden">Mostrar QR Code</span>
                  <span className="hidden group-open:inline">Esconder QR Code</span>
                </summary>
                <QrPix qr={qr} valor={c.valor_cents} />
              </details>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-[13px] text-hub-suave">Pix copia e cola</span>
                <input
                  readOnly
                  value={codigo}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 w-full min-w-0 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[13px]"
                />
              </label>
            </div>
            <div className="hidden md:block">
              <QrPix qr={qr} valor={c.valor_cents} />
              <p className="mt-2 max-w-44 text-center text-[13px] text-hub-suave">
                No computador, aponte a câmera do celular para o código.
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-white p-4 text-[15px]">
            Combine a forma de pagamento com {responsavel ?? "o seu responsável"}. Assim que o
            pagamento for registrado, o recibo aparece aqui.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-[14px] text-[#C9CBD0]">
          {c.cliente_avisou_em
            ? "Você avisou que pagou. Assim que o pagamento for confirmado, o recibo aparece aqui."
            : "Já pagou? Avise para confirmarmos mais rápido."}
        </p>
        {!c.cliente_avisou_em && (
          <button
            type="button"
            disabled={enviando}
            onClick={aoAvisar}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-[15px] font-semibold text-[#F5F5F2] hover:bg-white/10 disabled:opacity-50 md:w-auto"
          >
            <BellRing className="size-4" aria-hidden="true" /> Já paguei
          </button>
        )}
      </div>
    </section>
  );
}

function QrPix({ qr, valor }: { qr: string | null; valor: number }) {
  return (
    <div className="mx-auto flex size-44 shrink-0 items-center justify-center rounded-2xl border border-hub-borda bg-white p-2">
      {qr ? (
        <img src={qr} alt={`QR Code Pix de ${moeda(valor)}`} className="size-full" />
      ) : (
        <span className="size-full animate-pulse rounded-xl bg-hub-fundo" aria-hidden="true" />
      )}
    </div>
  );
}
