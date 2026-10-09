import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type EstadoSessao = { carregando: boolean; session: Session | null };

/** Sessão atual do Supabase, atualizada a cada login, logout ou renovação de token. */
export function useSession(): EstadoSessao {
  const [estado, setEstado] = useState<EstadoSessao>({ carregando: true, session: null });

  useEffect(() => {
    let ativo = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (ativo) setEstado({ carregando: false, session: data.session });
      })
      .catch(() => {
        if (ativo) setEstado({ carregando: false, session: null });
      });

    const { data } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (ativo) setEstado({ carregando: false, session });
    });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return estado;
}
