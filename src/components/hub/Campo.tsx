import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const classeEntrada =
  "w-full min-w-0 rounded-xl border border-[#DADAD3] bg-white px-3 text-base text-hub-tinta outline-none placeholder:text-[#9A9DA3] focus:border-hub-tinta focus:ring-2 focus:ring-hub-tinta/10 disabled:text-hub-suave md:text-[15px]";

type Base = { rotulo: string; ajuda?: ReactNode; className?: string | undefined };

/** Campo de texto de uma linha (16 px no celular para não dar zoom). */
export function CampoTexto({
  rotulo,
  ajuda,
  className,
  valor,
  aoMudar,
  tipo = "text",
  ...resto
}: Base & {
  valor: string;
  aoMudar: (v: string) => void;
  tipo?: "text" | "email" | "url" | "date";
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: "text" | "email" | "url" | "numeric";
  max?: string;
  min?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={cn(classeEntrada, "h-11")}
        {...resto}
      />
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}

/** Texto de várias linhas. */
export function CampoArea({
  rotulo,
  ajuda,
  className,
  valor,
  aoMudar,
  linhas = 3,
  ...resto
}: Base & {
  valor: string;
  aoMudar: (v: string) => void;
  linhas?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-medium">
        {rotulo}
      </label>
      <textarea
        id={id}
        rows={linhas}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={cn(classeEntrada, "py-2.5 leading-relaxed")}
        {...resto}
      />
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}

/** Lista de opções nativa (boa no celular). */
export function CampoEscolha<T extends string>({
  rotulo,
  ajuda,
  className,
  valor,
  aoMudar,
  opcoes,
  vazio,
}: Base & {
  valor: T | "";
  aoMudar: (v: T) => void;
  opcoes: { id: T; rotulo: string }[];
  vazio?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-medium">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value as T)}
        className={cn(classeEntrada, "h-11 pr-8")}
      >
        {vazio !== undefined && (
          <option value="" disabled>
            {vazio}
          </option>
        )}
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}
