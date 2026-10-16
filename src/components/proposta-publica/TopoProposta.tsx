import { Simbolo } from "@/components/layout/Marca";
import { sigla } from "@/lib/formatar";

/** Cabeçalho fixo da proposta: marca, empresa do cliente e o responsável. */
export function TopoProposta({ empresa, responsavel }: { empresa: string; responsavel: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-hub-borda bg-white/95 backdrop-blur print:static">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 md:h-16 md:px-6">
        <span className="flex items-center gap-2.5">
          <Simbolo tamanho={28} />
          <span className="font-marca text-[15px] font-semibold max-sm:sr-only">Fora do Papel</span>
        </span>
        <span aria-hidden="true" className="h-6 w-px bg-hub-borda max-sm:hidden" />
        <span className="min-w-0 truncate text-[14.5px] font-medium">{empresa}</span>
        <span className="ml-auto flex items-center gap-2.5">
          <span className="flex flex-col text-right leading-tight max-sm:hidden">
            <span className="text-[12.5px] text-hub-suave">Seu responsável</span>
            <span className="text-[14px] font-semibold">{responsavel}</span>
          </span>
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-hub-tinta text-[13px] font-bold text-[#FFB020]"
          >
            {sigla(responsavel)}
          </span>
        </span>
      </div>
    </header>
  );
}
