import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Eye, Plus } from "lucide-react";
import { z } from "zod";

import { ClienteSite } from "@/components/clientes/ClienteSite";
import { SitePaginasHub } from "@/components/clientes/SitePaginasHub";
import { useLogos } from "@/components/clientes/useLogos";
import { Abas } from "@/components/hub/Abas";
import { Sigla } from "@/components/hub/Selo";
import { CatalogoCategorias } from "@/components/catalogo/CatalogoCategorias";
import { CatalogoDepoimentos } from "@/components/catalogo/CatalogoDepoimentos";
import { CatalogoLoja } from "@/components/catalogo/CatalogoLoja";
import { CatalogoProdutos } from "@/components/catalogo/CatalogoProdutos";
import { CatalogoPublicar } from "@/components/catalogo/CatalogoPublicar";
import { SiteContatos } from "@/components/sites/SiteContatos";
import { SiteVisaoGeral } from "@/components/sites/SiteVisaoGeral";
import { useEspelho } from "@/components/sites/useEspelho";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { ArtigoEditorPainel } from "@/components/site/ArtigoEditorPainel";
import { ArtigosFiltros } from "@/components/site/ArtigosFiltros";
import { ArtigosLista } from "@/components/site/ArtigosLista";
import { MidiaEnviar } from "@/components/site/MidiaEnviar";
import { MidiaGaleria } from "@/components/site/MidiaGaleria";
import { PaginaEditor } from "@/components/site/PaginaEditor";
import { PaginasLista } from "@/components/site/PaginasLista";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { classeAcaoPrincipal, classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { sigla } from "@/lib/formatar";
import { chavesSitesHub, rotuloSituacaoSite, sitesResumo } from "@/lib/sitesHub";
import { cn } from "@/lib/utils";
import { chavesBlocos, type ChaveBloco } from "@/lib/paginasSite";
import {
  categoriasDoSite,
  chavesSite,
  listarArtigos,
  listarBlocos,
  rotuloSituacao,
  type SituacaoSite,
} from "@/lib/site";

const busca = z.object({
  aba: z
    .enum([
      "visao",
      "produtos",
      "categorias",
      "depoimentos",
      "loja",
      "publicar",
      "paginas",
      "artigos",
      "midia",
      "contatos",
      "edicao",
    ])
    .optional()
    .catch(undefined),
  situacao: z.enum(["publicado", "rascunho", "arquivado"]).optional().catch(undefined),
  categoria: z.string().max(60).optional().catch(undefined),
  artigo: z
    .union([z.literal("novo"), z.string().uuid()])
    .optional()
    .catch(undefined),
  /** Parte da página aberta no editor (aba Páginas, card CMS-4). */
  pagina: z
    .enum(chavesBlocos as [ChaveBloco, ...ChaveBloco[]])
    .optional()
    .catch(undefined),
});

/**
 * Página do site (card RD2-8): visão geral, páginas, artigos, fotos, contatos e o que o cliente
 * pode editar. Os editores são os do CMS-2/CMS-4 (site da Fora do Papel) e do PC-4 (sites de clientes).
 * Só o dono entra: a área /app já exige o papel no beforeLoad e roda só no navegador.
 */
export const Route = createFileRoute("/app/sites/$id")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Site · Hub Fora do Papel" }] }),
  component: PaginaDoSite,
});

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function PaginaDoSite() {
  const { id } = Route.useParams();
  const { aba = "visao", situacao, categoria, artigo, pagina } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qSites = useQuery({ queryKey: chavesSitesHub.resumo, queryFn: sitesResumo });
  const resumo = qSites.data?.itens.find((s) => s.id === id) ?? null;
  const atual = resumo ? { id: resumo.id, nome: resumo.nome, dominio: resumo.dominio } : null;
  const nosso = resumo?.client_id === null;
  const catalogo = resumo?.modulos.includes("catalogo") ?? false;
  const logos = useLogos([resumo?.logo_path]);
  const espelho = useEspelho();
  const qArtigos = useQuery({
    queryKey: chavesSite.artigos(atual?.id ?? ""),
    queryFn: () => listarArtigos(atual?.id ?? ""),
    enabled: atual !== null,
  });
  const qBlocos = useQuery({
    queryKey: chavesSite.blocos(atual?.id ?? ""),
    queryFn: () => listarBlocos(atual?.id ?? ""),
    enabled: atual !== null && (aba === "paginas" || pagina !== undefined),
  });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(texto);

  const painel = usePainelNaUrl(
    (id, o) => void navigate({ search: (s) => ({ ...s, artigo: id }), ...o }),
  );
  const painelPagina = usePainelNaUrl(
    (chave, o) =>
      void navigate({
        search: (s) => ({ ...s, pagina: chavesBlocos.find((c) => c === chave) }),
        ...o,
      }),
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
        voltarPara="/app/sites"
        migalha={
          <nav aria-label="Trilha">
            <Link to="/app/sites" className="hover:text-hub-tinta">
              Sites
            </Link>
            <span aria-hidden="true"> › </span>
            <span className="text-hub-tinta">{resumo?.empresa ?? resumo?.nome ?? "Site"}</span>
          </nav>
        }
        titulo={
          <span className="flex min-w-0 items-center gap-3">
            {resumo && !nosso && (
              <span className="[&>*]:size-11 [&>*]:rounded-xl [&>*]:text-[15px]">
                <Sigla
                  texto={sigla(resumo.empresa ?? resumo.nome)}
                  logo={resumo.logo_path ? logos[resumo.logo_path] : undefined}
                />
              </span>
            )}
            <span className="min-w-0 break-all">{resumo?.dominio ?? "Site"}</span>
          </span>
        }
        selo={
          resumo && (
            <span
              className={
                resumo.situacao === "no_ar"
                  ? "inline-flex rounded-full bg-sit-ok px-2.5 py-0.5 text-[12.5px] font-medium text-sit-ok-t"
                  : resumo.situacao === "construcao"
                    ? "inline-flex rounded-full bg-sit-info px-2.5 py-0.5 text-[12.5px] font-medium text-sit-info-t"
                    : "inline-flex rounded-full bg-[#F1F1EC] px-2.5 py-0.5 text-[12.5px] font-medium text-[#2A2D33]"
              }
            >
              {rotuloSituacaoSite[resumo.situacao]}
            </span>
          )
        }
        resumo={
          resumo ? (
            nosso ? (
              "Nosso site"
            ) : (
              <>
                Site da{" "}
                <Link
                  to="/app/clientes/$id"
                  params={{ id: resumo.client_id ?? "" }}
                  className="font-semibold text-hub-tinta"
                >
                  {resumo.empresa}
                </Link>
              </>
            )
          ) : undefined
        }
        acao={
          resumo && (
            <>
              <a
                href={`https://${resumo.dominio}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(classeBotaoSecundario, "flex-1 sm:flex-none")}
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Abrir o site
              </a>
              {aba === "midia" && atual ? (
                <MidiaEnviar siteId={atual.id} />
              ) : aba === "artigos" ? (
                <button
                  type="button"
                  className={classeAcaoPrincipal}
                  onClick={() => painel.abrir("novo")}
                >
                  <Plus className="size-4" aria-hidden="true" /> Novo artigo
                </button>
              ) : !nosso && resumo.client_id ? (
                <button
                  type="button"
                  className={classeAcaoPrincipal}
                  disabled={espelho.isPending}
                  onClick={() =>
                    espelho.mutate({ clienteId: resumo.client_id ?? "", siteId: resumo.id })
                  }
                >
                  <Eye className="size-4" aria-hidden="true" /> Ver como o cliente
                </button>
              ) : null}
            </>
          )
        }
        abas={
          <Abas
            rotulo="Partes do site"
            opcoes={[
              { id: "visao" as const, rotulo: "Visão geral" },
              // Catálogo de loja (HUB-CG-01 a 04)
              ...(catalogo
                ? [
                    { id: "produtos" as const, rotulo: "Produtos" },
                    { id: "categorias" as const, rotulo: "Categorias" },
                    { id: "depoimentos" as const, rotulo: "Depoimentos" },
                    { id: "loja" as const, rotulo: "Ajustes da loja" },
                    { id: "publicar" as const, rotulo: "Publicar" },
                  ]
                : []),
              ...(nosso || resumo?.modulos.includes("paginas")
                ? [{ id: "paginas" as const, rotulo: "Páginas" }]
                : []),
              ...(nosso || resumo?.modulos.includes("artigos")
                ? [{ id: "artigos" as const, rotulo: "Artigos", contagem: lista?.length }]
                : []),
              { id: "midia" as const, rotulo: "Fotos" },
              ...(nosso || resumo?.modulos.includes("contatos")
                ? [
                    {
                      id: "contatos" as const,
                      rotulo: "Contatos",
                      contagem: resumo?.sem_resposta || undefined,
                    },
                  ]
                : []),
              ...(!nosso ? [{ id: "edicao" as const, rotulo: "O que o cliente pode editar" }] : []),
            ]}
            ativa={aba}
            aoEscolher={(a) =>
              void navigate({
                search: (s) => ({ ...s, aba: a === "visao" ? undefined : a }),
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
      ) : !atual || !resumo ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-hub-suave">Site não encontrado. Ele pode ter sido removido.</p>
          <Link to="/app/sites" className={classeAcaoTexto}>
            Voltar para Sites ›
          </Link>
        </div>
      ) : catalogo && aba === "produtos" ? (
        <CatalogoProdutos siteId={atual.id} />
      ) : catalogo && aba === "categorias" ? (
        <CatalogoCategorias siteId={atual.id} />
      ) : catalogo && aba === "depoimentos" ? (
        <CatalogoDepoimentos siteId={atual.id} />
      ) : catalogo && aba === "loja" ? (
        <CatalogoLoja siteId={atual.id} />
      ) : catalogo && aba === "publicar" ? (
        <CatalogoPublicar siteId={atual.id} dominio={atual.dominio} />
      ) : aba === "visao" ? (
        <SiteVisaoGeral
          s={resumo}
          aoIr={(a) => void navigate({ search: (x) => ({ ...x, aba: a }), replace: true })}
        />
      ) : aba === "contatos" ? (
        nosso ? (
          <p className="max-w-2xl rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
            Os contatos do nosso site entram direto em Vendas, como oportunidade.{" "}
            <Link to="/app/pipeline" className="font-semibold text-hub-tinta">
              Abrir Vendas ›
            </Link>
          </p>
        ) : (
          <SiteContatos siteId={atual.id} empresa={resumo.empresa ?? resumo.nome} />
        )
      ) : aba === "edicao" ? (
        resumo.client_id ? (
          <div className="max-w-2xl">
            <ClienteSite clienteId={resumo.client_id} />
          </div>
        ) : null
      ) : aba === "paginas" && !nosso ? (
        <div className="max-w-3xl">
          <SitePaginasHub siteId={atual.id} />
        </div>
      ) : aba === "midia" ? (
        <MidiaGaleria siteId={atual.id} />
      ) : aba === "paginas" ? (
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-[14.5px] text-hub-suave">
            Textos da página inicial e da página de perguntas. Botões e destinos dos links ficam
            fixos. O que não estiver publicado aparece com o texto do código.
          </p>
          {qBlocos.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar as páginas"
              aoTentarDeNovo={() => void qBlocos.refetch()}
            />
          ) : !qBlocos.data ? (
            <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          ) : (
            <PaginasLista blocos={qBlocos.data} aoAbrir={(c) => painelPagina.abrir(c)} />
          )}
        </div>
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

      {atual && pagina && qBlocos.data && (
        <PaginaEditor
          key={pagina}
          siteId={atual.id}
          dominio={atual.dominio}
          chave={pagina}
          bloco={qBlocos.data.find((b) => b.chave === pagina)}
          aoFechar={painelPagina.fechar}
        />
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
