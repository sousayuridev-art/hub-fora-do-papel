import { Simbolo } from "@/components/layout/Marca";
import { sigla } from "@/lib/formatar";

/**
 * Cabeçalho fixo da proposta, sobre a capa escura (card CX-3): marca, empresa do cliente e o
 * responsável. Fundo sólido, sem desfoque (regra M15).
 */
export function TopoProposta({ empresa, responsavel }: { empresa: string; responsavel: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-hub-tinta text-[#F5F5F2] print:static print:border-hub-borda print:bg-white print:text-hub-tinta">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 md:h-16 md:px-6">
        <span className="flex items-center gap-2.5">
          <Simbolo tamanho={28} />
          <span className="font-marca text-[15px] font-bold max-sm:sr-only">Fora do Papel</span>
        </span>
        <span aria-hidden="true" className="h-6 w-px bg-white/15 max-sm:hidden" />
        <span className="min-w-0 truncate text-[14.5px] font-medium text-[#D5D7DC]">{empresa}</span>
        <span className="ml-auto flex items-center gap-2.5">
          <span className="flex flex-col text-right leading-tight max-sm:hidden">
            <span className="text-[12.5px] text-[#A3A6AD]">Seu responsável</span>
            <span className="text-[14px] font-semibold">{responsavel}</span>
          </span>
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-[#F5F5F2] text-[13px] font-bold text-hub-tinta"
          >
            {sigla(responsavel)}
          </span>
        </span>
      </div>
    </header>
  );
}
