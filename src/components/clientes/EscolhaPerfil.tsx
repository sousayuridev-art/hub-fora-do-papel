import { cn } from "@/lib/utils";
import { nomeDoPerfil, type PerfilPortal } from "@/lib/acessoPortal";

const descricao: Record<PerfilPortal, string> = {
  equipe:
    "Acompanha o projeto, pede ajustes e vê arquivos. Não vê valores, pagamentos nem serviços adicionais.",
  responsavel: "Vê tudo, decide serviços adicionais e recebe as cobranças.",
};

/** Escolha do perfil de acesso ao portal (CX-0): dois cartões de opção, com o que cada um vê. */
export function EscolhaPerfil({
  valor,
  aoMudar,
  podeAprovar,
  aoMudarAprovar,
}: {
  valor: PerfilPortal;
  aoMudar: (p: PerfilPortal) => void;
  podeAprovar: boolean;
  aoMudarAprovar: (v: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[14px] font-medium">Perfil</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["equipe", "responsavel"] as const).map((p) => (
          <label
            key={p}
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-xl border bg-white p-3 transition-colors",
              valor === p
                ? "border-2 border-hub-tinta"
                : "m-px border-[#DADAD3] hover:border-[#B9B9B1]",
            )}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="perfil-portal"
                value={p}
                checked={valor === p}
                onChange={() => aoMudar(p)}
                className="size-4 accent-hub-tinta"
              />
              <span className="text-[14.5px] font-semibold">{nomeDoPerfil[p]}</span>
            </span>
            <span className="text-[13px] leading-snug text-hub-suave">{descricao[p]}</span>
          </label>
        ))}
      </div>
      {valor === "equipe" && (
        <label className="flex min-h-11 items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={podeAprovar}
            onChange={(e) => aoMudarAprovar(e.target.checked)}
            className="size-5 accent-hub-tinta"
          />
          Pode aprovar entregas
        </label>
      )}
    </fieldset>
  );
}
