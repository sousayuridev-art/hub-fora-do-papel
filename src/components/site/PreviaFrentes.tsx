import { Check } from "lucide-react";

import { frentesFixas, type BlocoFrente } from "@/lib/paginasSite";

/** As 4 frentes como no site: a primeira larga e escura, as outras em cartões claros. */
export function PreviaFrentes({ valor, celular }: { valor: BlocoFrente[]; celular: boolean }) {
  return (
    <section className={`grid gap-4 p-5 sm:p-8 ${celular ? "grid-cols-1" : "grid-cols-3"}`}>
      {frentesFixas.map((fixa, i) => {
        const f = valor.find((x) => x.id === fixa.id);
        if (!f) return null;
        const escuro = i === 0;
        return (
          <article
            key={fixa.id}
            className={`flex min-w-0 flex-col gap-3 rounded-[20px] border p-6 ${
              escuro
                ? `border-[#0b0e14] bg-[#0b0e14] text-white ${celular ? "" : "col-span-3"}`
                : "border-[#e2e2dc] bg-white"
            }`}
          >
            <span
              className={`font-mono text-[12.5px] ${escuro ? "text-[#ffb020]" : "text-[#4a4d54]"}`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p
              className={`break-words text-[14px] ${escuro ? "text-[#c9d4ff]" : "text-[#4a4d54]"}`}
            >
              {f.situacao}
            </p>
            <p className="break-words text-[22px] font-bold leading-tight tracking-[-0.02em]">
              {f.titulo}
            </p>
            <p
              className={`break-words ${escuro ? "text-[18px] text-[#dfe5ff]" : "text-[16px] text-[#2a2d33]"}`}
            >
              {f.frase}
            </p>
            <ul className="flex flex-col gap-2">
              {f.topicos.map((t, j) => (
                <li key={j} className="flex gap-2 break-words text-[15px]">
                  <Check
                    className={`mt-0.5 size-[18px] shrink-0 ${escuro ? "text-[#ffb020]" : "text-[#2448c9]"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
            </ul>
            <span className={`font-semibold ${escuro ? "text-[#ffb020]" : "text-[#2448c9]"}`}>
              Quero algo assim →
            </span>
          </article>
        );
      })}
    </section>
  );
}
