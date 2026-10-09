import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { TelaErro } from "@/components/feedback/TelaErro";
import { supabase } from "@/lib/supabase";

const buscaCallback = z.object({
  code: z.string().optional().catch(undefined),
  volta: z.string().startsWith("/").optional().catch(undefined),
});

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: buscaCallback,
  component: Callback,
});

/** Volta do link mágico: troca o código pela sessão e segue para a área certa. */
function Callback() {
  const { code, volta } = Route.useSearch();
  const navigate = useNavigate();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function concluir() {
      try {
        if (code) {
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
  }, [code, volta, navigate]);

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
