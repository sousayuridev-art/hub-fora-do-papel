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

/** Usuário logado + botão de sair. `cartao`: versão em cartão para o rodapé do menu do Hub. */
export function ContaUsuario({ cartao = false }: { cartao?: boolean }) {
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
    <div
      className={
        cartao
          ? "flex min-h-14 items-center gap-3 rounded-xl bg-hub-fundo py-2 pl-3 pr-1"
          : "flex min-h-12 items-center gap-3 px-3"
      }
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E5EDFF] text-[13px] font-semibold text-[#1E3FA8]">
        {iniciais(nome)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight" title={email}>
        <span className="truncate text-[14px] font-semibold text-hub-tinta">{nome}</span>
        {cartao && <span className="truncate text-[12.5px] text-menu-rotulo">Operador</span>}
      </span>
      <button
        type="button"
        onClick={() => void sair()}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-white hover:text-hub-tinta"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}
