import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { erro, mensagemDeErro } from "@/lib/notify";
import { iniciais } from "@/components/layout/ContaUsuario";

/** Avatar do cliente no cabeçalho do portal, com a opção de sair. */
export function ContaPortal() {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-hub-tinta"
        aria-label="Sua conta"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[#EEF3FF] text-[13px] font-semibold text-[#1E3FA8] ring-2 ring-white ring-offset-1 ring-offset-hub-borda md:size-9 md:text-sm">
          {iniciais(nome)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-hub-suave">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11" onSelect={() => void sair()}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
