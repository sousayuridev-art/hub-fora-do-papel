import { useId } from "react";

import { cn } from "@/lib/utils";

const classeCampo =
  "w-full rounded-xl border border-[#DADAD3] bg-white px-3 text-base outline-none focus:border-hub-tinta focus:ring-2 focus:ring-hub-tinta/10 disabled:bg-hub-fundo disabled:text-hub-suave md:text-[15px]";

/** Campo de texto (uma linha ou várias) com rótulo e contador opcional. */
export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  linhas = 1,
  max,
  placeholder,
  ajuda,
  bloqueado,
  rotuloOculto,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  linhas?: number;
  max: number;
  placeholder?: string;
  ajuda?: string;
  bloqueado?: boolean;
  rotuloOculto?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn("text-[14px] font-medium", rotuloOculto && "sr-only")}>
        {rotulo}
      </label>
      {linhas > 1 ? (
        <textarea
          id={id}
          rows={linhas}
          maxLength={max}
          value={valor}
          disabled={bloqueado}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          className={cn(classeCampo, "py-2.5")}
        />
      ) : (
        <input
          id={id}
          maxLength={max}
          value={valor}
          disabled={bloqueado}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          className={cn(classeCampo, "h-11")}
        />
      )}
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}
