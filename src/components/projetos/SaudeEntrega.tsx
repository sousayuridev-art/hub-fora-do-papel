import { AlertTriangle, CircleAlert } from "lucide-react";

import type { Saude } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/** Motivos de atenção ou risco da entrega (calculados no banco). Some quando está tudo ok. */
export function SaudeEntrega({ saude, className }: { saude: Saude; className?: string }) {
  if (saude.nivel === "ok") return null;
  const risco = saude.nivel === "risco";
  const Icone = risco ? AlertTriangle : CircleAlert;
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-xl p-3.5 text-[14px]",
        risco ? "bg-sit-risco text-sit-risco-t" : "bg-sit-atencao text-sit-atencao-t",
        className,
      )}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className="font-semibold">{risco ? "Entrega em risco" : "Pede atenção"}</strong>
        <ul className="flex flex-col">
          {saude.motivos.map((m) => (
            <li key={m.chave + m.texto}>{m.texto}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
