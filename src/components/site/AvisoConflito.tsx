import { RefreshCw } from "lucide-react";

/**
 * O banco recusou a gravação porque o artigo foi salvo em outro lugar depois que este editor
 * abriu (`atualizado_em`). O texto digitado continua na tela até a pessoa escolher.
 */
export function AvisoConflito({
  aoCarregar,
  carregando,
}: {
  aoCarregar: () => void;
  carregando: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl bg-sit-atencao p-4 text-[14.5px] text-sit-atencao-t"
    >
      <p>
        <strong className="font-semibold">Existe uma versão mais nova deste artigo.</strong> Ela foi
        salva em outra aba ou por outra pessoa depois que você abriu. Para não apagar essa versão,
        nada foi gravado. Copie o que precisar do seu texto, carregue a versão salva e aplique de
        novo.
      </p>
      <button
        type="button"
        onClick={aoCarregar}
        disabled={carregando}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-4 text-[15px] font-semibold text-hub-tinta hover:bg-hub-selecao disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${carregando ? "animate-spin" : ""}`} aria-hidden="true" />
        Carregar a versão salva
      </button>
    </div>
  );
}
