import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { z } from "zod";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { SemSite } from "@/components/portal/site/SemSite";
import { ArtigoEditorPainel } from "@/components/site/ArtigoEditorPainel";
import { ArtigosFiltros } from "@/components/site/ArtigosFiltros";
import { ArtigosLista } from "@/components/site/ArtigosLista";
import { GaleriaContexto } from "@/components/site/galeria";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { chavesSite, listarArtigos, type SituacaoSite } from "@/lib/site";
import type { SitePortal } from "@/lib/sitesCliente";

const busca = z.object({
  artigo: z
    .union([z.literal("novo"), z.string().uuid()])
    .optional()
    .catch(undefined),
  situacao: z.enum(["publicado", "rascunho", "arquivado"]).optional().catch(undefined),
});

export const Route = createFileRoute("/portal/site/artigos")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Artigos · Painel Fora do Papel" }] }),
  component: Artigos,
});

/** Categorias de partida para o site do cliente; as que ele já usou entram junto. */
const categoriasIniciais = ["Novidades", "Dicas", "Bastidores"];
const galeria = { nome: "Fotos e arquivos" };

/**
 * Artigos do site do cliente (card PC-3): mesma lista e mesmo editor do Hub (CMS-2),
 * gravando pelas mesmas RPCs. O banco aceita só o site da empresa e com o módulo contratado.
 */
function Artigos() {
  const sites = useSitesPortal();
  const site = sites.site;
  const { artigo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const painel = usePainelNaUrl(
    (id, o) => void navigate({ search: (s) => ({ ...s, artigo: id }), ...o }),
  );
  const podeArtigos = site?.modulos.includes("artigos") ?? false;

  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Meu site"
        titulo="Artigos"
        texto="Novidades, dicas e notícias do seu negócio. Publicou, já aparece no site."
        acao={
          podeArtigos && (
            <button
              type="button"
              onClick={() => painel.abrir("novo")}
              className="botao-degrade inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-hub-tinta max-md:w-full"
            >
              <PenLine className="size-4" aria-hidden="true" /> Escrever artigo
            </button>
          )
        }
      />
      {sites.carregando ? (
        <SemSite motivo="carregando" />
      ) : sites.falhou ? (
        <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />
      ) : !site ? (
        <SemSite motivo="sem-site" />
      ) : !podeArtigos ? (
        <SemSite motivo="sem-modulo" modulo="Artigos" />
      ) : (
        <GaleriaContexto.Provider value={galeria}>
          <Lista site={site} aoAbrir={(id) => painel.abrir(id)} />
          <ArtigoEditorPainel
            artigoId={artigo}
            siteId={site.id}
            dominio={site.dominio}
            categorias={categoriasIniciais}
            aoFechar={painel.fechar}
          />
        </GaleriaContexto.Provider>
      )}
    </div>
  );
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Lista({ site, aoAbrir }: { site: SitePortal; aoAbrir: (id: string) => void }) {
  const { situacao } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: chavesSite.artigos(site.id),
    queryFn: () => listarArtigos(site.id),
  });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(texto);
  const [categoria, setCategoria] = useState<string | undefined>(undefined);
  const lista = q.data;
  const categorias = useMemo(
    () =>
      [...new Set((lista ?? []).map((a) => a.categoria))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [lista],
  );
  const itens = useMemo(() => {
    const t = semAcento(termo.trim());
    return (lista ?? []).filter(
      (a) =>
        (!situacao || a.situacao === situacao) &&
        (!categoria || a.categoria === categoria) &&
        (!t || semAcento(`${a.titulo} ${a.categoria}`).includes(t)),
    );
  }, [lista, situacao, categoria, termo]);

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os artigos"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!lista) return <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (lista.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
        Nenhum artigo ainda. Use "Escrever artigo" para publicar o primeiro.
      </p>
    );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ArtigosFiltros
        texto={texto}
        aoTexto={setTexto}
        situacao={situacao ?? "todas"}
        aoSituacao={(s) =>
          void navigate({
            search: (x) => ({ ...x, situacao: s === "todas" ? undefined : (s as SituacaoSite) }),
            replace: true,
          })
        }
        categoria={categoria}
        aoCategoria={setCategoria}
        categorias={categorias}
      />
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nada encontrado com esses filtros.
        </p>
      ) : (
        <ArtigosLista itens={itens} aoAbrir={(a) => aoAbrir(a.id)} />
      )}
    </div>
  );
}
