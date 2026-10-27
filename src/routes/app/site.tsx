import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { ArtigoEditorPainel } from "@/components/site/ArtigoEditorPainel";
import { ArtigosFiltros } from "@/components/site/ArtigosFiltros";
import { ArtigosLista } from "@/components/site/ArtigosLista";
import { MidiaEnviar } from "@/components/site/MidiaEnviar";
import { MidiaGaleria } from "@/components/site/MidiaGaleria";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { classeAcaoPrincipal } from "@/lib/estilos";
import {
  categoriasDoSite,
  chavesSite,
  listarArtigos,
  listarSites,
  rotuloSituacao,
  type SituacaoSite,
} from "@/lib/site";

const busca = z.object({
  aba: z.enum(["artigos", "midia"]).optional().catch(undefined),
  site: z.string().uuid().optional().catch(undefined),
  situacao: z.enum(["publicado", "rascunho", "arquivado"]).optional().catch(undefined),
  categoria: z.string().max(60).optional().catch(undefined),
  artigo: z
    .union([z.literal("novo"), z.string().uuid()])
    .optional()
    .catch(undefined),
});

/**
 * Conteúdo do site (card CMS-2): artigos (lista, editor por blocos e prévia) e mídia.
 * Só o dono entra: a área /app já exige o papel no beforeLoad e roda só no navegador.
 */
export const Route = createFileRoute("/app/site")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Conteúdo do site · Hub Fora do Papel" }] }),
  component: ConteudoDoSite,
});

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function ConteudoDoSite() {
  const { aba = "artigos", site, situacao, categoria, artigo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qSites = useQuery({ queryKey: chavesSite.sites, queryFn: listarSites });
  const atual = qSites.data?.find((s) => s.id === site) ?? qSites.data?.[0] ?? null;
  const qArtigos = useQuery({
    queryKey: chavesSite.artigos(atual?.id ?? ""),
    queryFn: () => listarArtigos(atual?.id ?? ""),
    enabled: atual !== null,
  });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(texto);

  const painel = usePainelNaUrl(
    (id, o) => void navigate({ search: (s) => ({ ...s, artigo: id }), ...o }),
  );

  const lista = qArtigos.data;
  const categoriasUsadas = useMemo(
    () =>
      [...new Set((lista ?? []).map((a) => a.categoria))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [lista],
  );
  const categoriasEditor = useMemo(
    () => [...new Set([...categoriasDoSite, ...categoriasUsadas])],
    [categoriasUsadas],
  );

  // Filtro só de exibição (busca, situação, categoria) sobre a lista que o banco devolveu.
  const itens = useMemo(() => {
    const t = semAcento(termo.trim());
    return (lista ?? []).filter((a) => {
      if (situacao && a.situacao !== situacao) return false;
      if (categoria && a.categoria !== categoria) return false;
      return !t || semAcento(`${a.titulo} ${a.slug} ${a.categoria}`).includes(t);
    });
  }, [lista, situacao, categoria, termo]);

  const filtrar = (mudar: {
    situacao?: SituacaoSite | undefined;
    categoria?: string | undefined;
  }) => void navigate({ search: (s) => ({ ...s, ...mudar }), replace: true });

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Conteúdo do site"
        resumo={
          atual ? (
            qSites.data && qSites.data.length > 1 ? (
              <label className="flex items-center gap-2">
                <span>Site</span>
                <select
                  value={atual.id}
                  onChange={(e) =>
                    void navigate({
                      search: (s) => ({ ...s, site: e.target.value, artigo: undefined }),
                    })
                  }
                  className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base text-hub-tinta"
                >
                  {qSites.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {s.dominio}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              `${atual.nome} · ${atual.dominio}`
            )
          ) : undefined
        }
        acao={
          atual &&
          (aba === "midia" ? (
            <MidiaEnviar siteId={atual.id} />
          ) : (
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => painel.abrir("novo")}
            >
              <Plus className="size-4" aria-hidden="true" /> Novo artigo
            </button>
          ))
        }
        abas={
          <Abas
            rotulo="Conteúdo do site"
            opcoes={[
              { id: "artigos", rotulo: "Artigos", contagem: lista?.length },
              { id: "midia", rotulo: "Mídia" },
            ]}
            ativa={aba}
            aoEscolher={(a) =>
              void navigate({
                search: (s) => ({ ...s, aba: a === "artigos" ? undefined : a }),
                replace: true,
              })
            }
          />
        }
      />

      {qSites.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o site"
          aoTentarDeNovo={() => void qSites.refetch()}
        />
      ) : !qSites.data ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : !atual ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhum site cadastrado ainda.
        </p>
      ) : aba === "midia" ? (
        <MidiaGaleria siteId={atual.id} />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <ArtigosFiltros
            texto={texto}
            aoTexto={setTexto}
            situacao={situacao ?? "todas"}
            aoSituacao={(s) => filtrar({ situacao: s === "todas" ? undefined : s })}
            categoria={categoria}
            aoCategoria={(c) => filtrar({ categoria: c })}
            categorias={categoriasUsadas}
          />
          {qArtigos.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar os artigos"
              aoTentarDeNovo={() => void qArtigos.refetch()}
            />
          ) : !lista ? (
            <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          ) : (
            <>
              <h2 className="text-[17px] font-semibold">
                {situacao ? `${rotuloSituacao[situacao]}s` : "Todos os artigos"}
                <span className="font-normal text-hub-suave"> · {itens.length}</span>
              </h2>
              {itens.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                  {lista.length === 0
                    ? 'Nenhum artigo ainda. Use "Novo artigo" para escrever o primeiro.'
                    : "Nada encontrado com esses filtros."}
                </p>
              ) : (
                <ArtigosLista itens={itens} aoAbrir={(a) => painel.abrir(a.id)} />
              )}
            </>
          )}
        </div>
      )}

      {atual && (
        <ArtigoEditorPainel
          siteId={atual.id}
          dominio={atual.dominio}
          categorias={categoriasEditor}
          artigoId={artigo}
          aoFechar={painel.fechar}
        />
      )}
    </div>
  );
}
