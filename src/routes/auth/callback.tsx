import { useEffect, useState } from "react";
import { caminhoInterno } from "@/lib/volta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { TelaErro } from "@/components/feedback/TelaErro";
import { supabase } from "@/lib/supabase";

const buscaCallback = z.object({
  code: z.string().optional().catch(undefined),
  token_hash: z.string().optional().catch(undefined),
  volta: caminhoInterno,
});

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: buscaCallback,
  component: Callback,
});

/**
 * Volta do link mágico.
 * - token_hash (padrão em produção): vale em qualquer navegador ou aparelho, mesmo abrindo o e-mail no celular.
 * - code (PKCE): só vale no mesmo navegador que pediu o link; mantido para o Supabase local.
 */
function Callback() {
  const { code, token_hash: tokenHash, volta } = Route.useSearch();
  const navigate = useNavigate();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function concluir() {
      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("sessão ausente");
        if (ativo) await navigate({ to: "/entrar", search: { volta }, replace: true });
      } catch {
        if (ativo) setFalhou(true);
      }
    }
    void concluir();
    return () => {
      ativo = false;
    };
  }, [code, tokenHash, volta, navigate]);

  if (falhou) {
    return (
      <TelaErro
        titulo="Este link não vale mais"
        mensagem="Links de acesso valem por 1 hora e só uma vez. Peça um novo na tela de entrada."
        aoTentarDeNovo={() => void navigate({ to: "/entrar", search: { volta } })}
      />
    );
  }
  return <TelaCarregando />;
}
