import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAccess } from "@/hooks/useAccess";
import type { PerfilPortal } from "@/lib/acessoPortal";

export type EmpresaPortal = { empresa: string; contato: string | null; perfil: PerfilPortal };

/**
 * Empresa e perfil de quem entrou no portal (RPC portal_minha_empresa: só campos públicos
 * da própria empresa). O perfil decide as abas; a proteção de verdade está nas funções do banco (CX-0).
 */
export function useEmpresaPortal() {
  const { acesso } = useAccess();
  const clientId = acesso?.clientId ?? null;
  return useQuery({
    queryKey: ["portal", "empresa", clientId],
    enabled: Boolean(clientId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EmpresaPortal> => {
      const { data, error } = await supabase.rpc("portal_minha_empresa");
      if (error) throw error;
      const d = (data ?? {}) as Partial<EmpresaPortal>;
      return {
        empresa: d.empresa ?? "",
        contato: d.contato ?? null,
        perfil: d.perfil === "responsavel" ? "responsavel" : "equipe",
      };
    },
  });
}
