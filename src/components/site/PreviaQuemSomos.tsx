import { TituloPrevia } from "@/components/site/TituloPrevia";
import type { BlocoQuemSomos } from "@/lib/paginasSite";

/** Quem somos: título com degradê e texto, ao lado da foto (fixa no site). */
export function PreviaQuemSomos({ valor, celular }: { valor: BlocoQuemSomos; celular: boolean }) {
  return (
    <section className={`grid gap-6 bg-white p-5 sm:p-8 ${celular ? "" : "grid-cols-[200px_1fr]"}`}>
      <div
        className="aspect-[4/4.4] max-w-[200px] rounded-[20px] bg-[#e2e2dc]"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-4">
        <h2
          className={`break-words leading-[1.05] tracking-[-0.03em] ${celular ? "text-[32px]" : "text-[42px]"}`}
        >
          <TituloPrevia texto={valor.titulo || "Título"} />
        </h2>
        <p className="break-words text-[17px] text-[#2a2d33]">{valor.texto}</p>
      </div>
    </section>
  );
}
