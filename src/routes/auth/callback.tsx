import { useEffect, useState } from "react";
import { caminhoInterno, entradaPara } from "@/lib/volta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { TelaErro } from "@/components/feedback/TelaErro";
import { supabase } from "@/lib/supabase";

const buscaCallback = z.object({
  code: z.string().optional().catch(undefined),
  token_hash: z.string().optional().catch(undefined),
  /** Tipo do token: "email" (link do e-mail) ou o do link de primeiro acesso gerado no Hub (SEG-2). */
  type: z.enum(["email", "magiclink", "invite", "signup"]).optional().catch(undefined),
  volta: caminhoInterno,
});

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: buscaCallback,
  component: Callback,
});

/**
 * Volta dos links (e-mail para criar ou trocar a senha, e primeiro acesso gerado no Hub: SEG-2).
 * - token_hash (padrão em produção): vale em qualquer navegador ou aparelho, mesmo abrindo o e-mail no celular.
 * - code (PKCE): só vale no mesmo navegador que pediu o link; mantido para o Supabase local.
 */
function Callback() {
  const { code, token_hash: tokenHash, type, volta } = Route.useSearch();
  const navigate = useNavigate();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function concluir() {
      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type ?? "email",
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("sessão ausente");
        if (!ativo) return;
        // Criar a senha não depende de a pessoa já estar ligada a uma empresa
        if (volta && /^\/entrar\/senha(\?|$)/.test(volta))
          await navigate({ href: volta, replace: true });
        else await navigate({ to: "/entrar", search: { volta }, replace: true });
      } catch {
        if (ativo) setFalhou(true);
      }
    }
    void concluir();
    return () => {
      ativo = false;
    };
  }, [code, tokenHash, type, volta, navigate]);

  if (falhou) {
    return (
      <TelaErro
        titulo="Este link não vale mais"
        mensagem="O link já foi usado ou venceu. Peça outro na tela de entrada."
        aoTentarDeNovo={() => void navigate({ to: entradaPara(volta), search: { volta } })}
      />
    );
  }
  return <TelaCarregando />;
}
