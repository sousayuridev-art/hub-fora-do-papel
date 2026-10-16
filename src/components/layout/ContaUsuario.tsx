import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { erro, mensagemDeErro } from "@/lib/notify";

export function iniciais(texto: string) {
  const partes = texto
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Usuário logado + botão de sair. `escuro`: versão para o menu escuro do Hub. */
export function ContaUsuario({ escuro = false }: { escuro?: boolean }) {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const email = session?.user.email ?? "";
  const nome = (session?.user.user_metadata?.["full_name"] as string | undefined) ?? email;

  async function sair() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await navigate({ to: "/entrar" });
    } catch (e) {
      erro(mensagemDeErro(e), { tentarDeNovo: () => void sair() });
    }
  }

  return (
    <div className="flex min-h-12 items-center gap-3 px-3">
      <span
        className={
          escuro
            ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2A2D33] text-[13px] font-semibold text-white"
            : "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[13px] font-semibold text-[#1E3FA8]"
        }
      >
        {iniciais(nome)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight" title={email}>
        <span
          className={`truncate text-[14px] font-medium ${escuro ? "text-white" : "text-hub-tinta"}`}
        >
          {nome}
        </span>
        {escuro && <span className="font-rotulo text-[12.5px] text-menu-rotulo">Operador</span>}
      </span>
      <button
        type="button"
        onClick={() => void sair()}
        className={
          escuro
            ? "flex size-10 items-center justify-center rounded-lg text-menu-rotulo hover:bg-menu-ativo hover:text-white"
            : "flex size-10 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-selecao hover:text-hub-tinta"
        }
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}
