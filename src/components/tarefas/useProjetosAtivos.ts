import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { chavesProjetos, listarProjetos } from "@/lib/projetos";
import type { ProjetoOpcao } from "@/lib/tarefas";

/**
 * Projetos que recebem tarefas (em andamento e em mensalidade), para escolher ao criar
 * e para os filtros da Central. Usa as mesmas chaves de cache da tela de Projetos.
 */
export function useProjetosAtivos(): ProjetoOpcao[] {
  const andamento = useQuery({
    queryKey: chavesProjetos.lista("andamento"),
    queryFn: () => listarProjetos("andamento"),
  });
  const mensalidade = useQuery({
    queryKey: chavesProjetos.lista("mensalidade"),
    queryFn: () => listarProjetos("mensalidade"),
  });
  return useMemo(
    () =>
      [...(andamento.data?.projetos ?? []), ...(mensalidade.data?.projetos ?? [])]
        .map((p) => ({ id: p.id, nome: p.nome, clienteId: p.client_id, empresa: p.empresa }))
        .sort((a, b) => `${a.empresa} ${a.nome}`.localeCompare(`${b.empresa} ${b.nome}`, "pt-BR")),
    [andamento.data, mensalidade.data],
  );
}
