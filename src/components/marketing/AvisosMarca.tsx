import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";

import type { Aviso } from "@/lib/marketing";

/** Revisão da marca calculada pelo banco a cada edição (manual de comunicação). */
export function AvisosMarca({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-sit-ok px-3 py-2.5 text-[14px] text-sit-ok-t">
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        Revisão da marca sem avisos.
      </p>
    );
  return (
    <ul aria-label="Avisos da marca" className="flex flex-col gap-1.5">
      {avisos.map((a) => (
        <li
          key={a.codigo}
          className={
            a.bloqueia
              ? "flex items-start gap-2 rounded-xl bg-sit-risco px-3 py-2.5 text-[14px] text-sit-risco-t"
              : "flex items-start gap-2 rounded-xl bg-sit-atencao px-3 py-2.5 text-[14px] text-sit-atencao-t"
          }
        >
          {a.bloqueia ? (
            <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {a.texto}
            {a.bloqueia && <b className="font-semibold"> Impede a aprovação.</b>}
          </span>
        </li>
      ))}
    </ul>
  );
}
