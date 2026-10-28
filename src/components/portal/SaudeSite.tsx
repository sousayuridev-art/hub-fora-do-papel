import { CheckCircle2, CircleDashed, Lock } from "lucide-react";

import type { SitePortal } from "@/lib/sitesCliente";

/**
 * Saúde do site (card PC-1). Enquanto não houver medição, só "No ar" e "Conexão segura".
 * Todo site da Fora do Papel é servido em https; cópia de segurança e visitas entram depois.
 */
export function SaudeSite({ site }: { site: SitePortal }) {
  return (
    <section
      aria-labelledby="saude-t"
      className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <h2 id="saude-t" className="text-[16px] font-semibold">
        Saúde do site
      </h2>
      <ul className="flex flex-col gap-2.5 text-[14.5px]">
        <li className="flex items-center gap-2.5">
          {site.no_ar ? (
            <CheckCircle2 className="size-5 text-[#145A37]" aria-hidden="true" />
          ) : (
            <CircleDashed className="size-5 text-hub-suave" aria-hidden="true" />
          )}
          {site.no_ar ? "No ar" : "Ainda não está no ar"}
        </li>
        {site.no_ar && (
          <li className="flex items-center gap-2.5">
            <Lock className="size-5 text-[#145A37]" aria-hidden="true" />
            Conexão segura
          </li>
        )}
      </ul>
    </section>
  );
}
