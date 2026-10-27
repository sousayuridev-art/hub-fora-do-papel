import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { ArtigoEditor } from "@/components/site/ArtigoEditor";
import { buscarArtigo, chavesSite } from "@/lib/site";

type Props = {
  siteId: string;
  dominio: string;
  categorias: string[];
  aoFechar: () => void;
};

/** Artigo existente: busca a versão do banco a cada abertura (sem usar cópia velha do cache). */
function ArtigoExistente({ id, ...p }: Props & { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: chavesSite.artigo(id),
    queryFn: () => buscarArtigo(id),
    refetchOnMount: "always",
    // O editor guarda a própria cópia; não recarrega por baixo enquanto a pessoa escreve.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const recarregar = (x: string) =>
    qc.fetchQuery({ queryKey: chavesSite.artigo(x), queryFn: () => buscarArtigo(x), staleTime: 0 });

  if (q.data && q.isFetchedAfterMount)
    return <ArtigoEditor {...p} artigo={q.data} aoRecarregar={recarregar} />;
  return (
    <PainelLateral aberto aoMudar={(v) => !v && p.aoFechar()} largo titulo="Editar artigo">
      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível abrir o artigo"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-11 animate-pulse rounded-xl bg-hub-fundo" />
          <div className="h-11 animate-pulse rounded-xl bg-hub-fundo" />
          <div className="h-40 animate-pulse rounded-xl bg-hub-fundo" />
        </div>
      )}
    </PainelLateral>
  );
}

/**
 * Abre o editor: "novo" já começa vazio; um artigo existente é buscado com o corpo antes.
 * O editor só monta com os dados prontos (o formulário nasce deles, sem efeitos).
 */
export function ArtigoEditorPainel({
  artigoId,
  ...p
}: Props & {
  /** "novo", o id do artigo ou nada (fechado). */
  artigoId: string | undefined;
}) {
  if (!artigoId) return null;
  if (artigoId === "novo")
    return <ArtigoEditor key="novo" {...p} artigo={null} aoRecarregar={(id) => buscarArtigo(id)} />;
  return <ArtigoExistente key={artigoId} id={artigoId} {...p} />;
}
