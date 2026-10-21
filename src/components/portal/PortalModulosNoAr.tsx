import { ExternalLink } from "lucide-react";

import { diaMes } from "@/lib/formatar";
import type { ModuloPortal } from "@/lib/portal";

/** "Já está no ar" (card SS-1): cada módulo publicado com a data e o que entrou na última versão. */
export function PortalModulosNoAr({ modulos }: { modulos: ModuloPortal[] }) {
  const noAr = modulos.filter((m) => m.no_ar_desde);
  if (noAr.length === 0) return null;
  return (
    <section aria-labelledby="no-ar-t" className="flex flex-col gap-3">
      <h2 id="no-ar-t" className="text-[18px] font-semibold md:text-[19px]">
        Já está no ar
      </h2>
      <ul className="flex flex-col gap-2">
        {noAr.map((m) => {
          const ultima = m.versoes[0];
          return (
            <li
              key={m.id}
              className="flex flex-col gap-1.5 rounded-2xl bg-white p-4 shadow-[0_1px_0_#E4E4DE] md:px-5"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <b className="text-[16px] font-semibold">{m.nome}</b>
                <span className="text-[13.5px] text-hub-suave">
                  No ar desde {diaMes(m.no_ar_desde ?? "")}
                  {ultima && m.versoes.length > 1
                    ? ` · última versão em ${diaMes(ultima.quando)}`
                    : ""}
                </span>
              </span>
              {ultima && (
                <p className="text-[14.5px] leading-relaxed text-[#2A2D33]">{ultima.notas}</p>
              )}
              {m.link && (
                <a
                  href={m.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14.5px] font-semibold underline underline-offset-4"
                >
                  Abrir {m.nome} <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
