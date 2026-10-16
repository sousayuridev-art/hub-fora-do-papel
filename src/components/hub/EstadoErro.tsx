import { TriangleAlert } from "lucide-react";

/** Erro de carregamento dentro da página, com "Tentar de novo". */
export function EstadoErro({
  titulo,
  mensagem = "Confira sua internet e tente de novo. Se continuar, avise o suporte.",
  aoTentarDeNovo,
}: {
  titulo: string;
  mensagem?: string;
  aoTentarDeNovo: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-[#F4C7C2] bg-sit-risco p-6 text-sit-risco-t"
    >
      <TriangleAlert className="size-5" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="text-[16px] font-semibold">{titulo}</h2>
        <p className="text-[14.5px]">{mensagem}</p>
      </div>
      <button
        type="button"
        onClick={aoTentarDeNovo}
        className="min-h-11 rounded-xl bg-white px-4 text-[15px] font-semibold text-hub-tinta hover:bg-hub-selecao"
      >
        Tentar de novo
      </button>
    </div>
  );
}
