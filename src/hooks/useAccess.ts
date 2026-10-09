import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/hooks/useSession";
import { buscarAcesso, chavesAcesso } from "@/lib/acesso";

export type { Acesso, Papel } from "@/lib/acesso";

/** Papel do usuário logado para uso em componentes (mesma chave de cache do beforeLoad). */
export function useAccess() {
  const { carregando: carregandoSessao, session } = useSession();
  const userId = session?.user.id;

  const consulta = useQuery({
    queryKey: chavesAcesso.doUsuario(userId ?? "anonimo"),
    enabled: Boolean(userId),
    queryFn: buscarAcesso,
  });

  return {
    session,
    carregando: carregandoSessao || (Boolean(userId) && consulta.isPending),
    erro: consulta.error,
    tentarDeNovo: consulta.refetch,
    acesso: consulta.data ?? null,
  };
}
