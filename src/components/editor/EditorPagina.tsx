import "@puckeditor/core/puck.css";
import { Puck, type CustomField } from "@puckeditor/core";
import { useMemo, useState } from "react";
import { Copy, RotateCw } from "lucide-react";

import { AdicionarSecao } from "@/components/editor/AdicionarSecao";
import { BarraEditor } from "@/components/editor/BarraEditor";
import { larguras } from "@/components/editor/larguras";
import { BarraSecao } from "@/components/editor/BarraSecao";
import { CanvasEscalado } from "@/components/editor/CanvasEscalado";
import { ControlesCelular } from "@/components/editor/ControlesCelular";
import { EditorContexto } from "@/components/editor/contexto";
import { ptBR } from "@/components/editor/dicionario";
import { PainelCampos } from "@/components/editor/PainelCampos";
import { useRascunho } from "@/components/editor/useRascunho";
import { usePuck } from "@/components/editor/usePuck";
import { EscolherImagem } from "@/components/site/EscolherImagem";
import { GaleriaContexto } from "@/components/site/galeria";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ContextoPedido } from "@/lib/pedidos";
import {
  temMarcador,
  textosDaPagina,
  type PaginaCompleta,
  type SecaoPermitida,
} from "@/lib/paginasCliente";
import { erro, ok } from "@/lib/notify";
import { criarConfigSecoes, sobreAsSecoes, tiposDeSecao, type TipoSecao } from "@/secoes/config";

const opcoesDeLargura = larguras.map(({ largura, rotulo }) => ({
  width: largura,
  height: "auto" as const,
  label: rotulo,
}));

/** Pega a seção escolhida para o pedido de ajuste (precisa estar dentro do Puck). */
function BarraComPedido(
  props: Omit<Parameters<typeof BarraEditor>[0], "aoPedirAjuste"> & {
    nomePagina: string;
    caminho: string;
    aoPedirAjuste?: ((c: ContextoPedido) => void) | undefined;
  },
) {
  const selecionada = usePuck((s) => s.selectedItem);
  const { aoPedirAjuste, nomePagina, caminho, ...resto } = props;
  const tipo = selecionada?.type as TipoSecao | undefined;
  return (
    <BarraEditor
      {...resto}
      aoPedirAjuste={
        aoPedirAjuste &&
        (() =>
          aoPedirAjuste({
            pagina: nomePagina,
            tela: caminho,
            ...(tipo ? { secao: sobreAsSecoes[tipo].nome } : {}),
          }))
      }
    />
  );
}

/**
 * Editor de página (card PC-4): o Puck é o motor (seleção, texto editável no canvas, histórico, JSON);
 * a interface é nossa. Usado no painel do cliente e no Hub. O banco decide o que pode ir ao ar.
 */
export function EditorPagina({
  pagina,
  site,
  secoes,
  aoVoltar,
  aoRecarregar,
  aoPedirAjuste,
}: {
  pagina: PaginaCompleta;
  site: { id: string; dominio: string };
  /** "todas" para o dono (Hub): todas as seções, nenhuma travada. */
  secoes: SecaoPermitida[] | "todas";
  aoVoltar: () => void;
  aoRecarregar: () => void;
  aoPedirAjuste?: ((c: ContextoPedido) => void) | undefined;
}) {
  // Na primeira renderização o hook ainda não mediu a tela; a largura da janela já diz
  const celular = useIsMobile() || (typeof window !== "undefined" && window.innerWidth < 768);
  const r = useRascunho(pagina);
  const [adicionarEm, setAdicionarEm] = useState<number | null>(null);

  const travadas = useMemo(
    () => (secoes === "todas" ? [] : secoes.filter((s) => s.travada).map((s) => s.tipo)),
    [secoes],
  );
  const adicionaveis = useMemo(
    () =>
      secoes === "todas"
        ? tiposDeSecao
        : tiposDeSecao.filter((t) => secoes.some((s) => s.tipo === t && !s.travada)),
    [secoes],
  );
  const config = useMemo(() => {
    const campoFoto: CustomField<string> = {
      type: "custom",
      label: "Foto",
      render: ({ value, onChange }) => (
        <div className="px-4 py-3">
          <EscolherImagem
            siteId={site.id}
            rotulo="Foto"
            valor={value || null}
            aoMudar={(url) => onChange(url ?? "")}
          />
        </div>
      ),
    };
    return criarConfigSecoes({ campoFoto, travadas });
  }, [site.id, travadas]);
  const contexto = useMemo(() => ({ adicionarEm: setAdicionarEm }), []);

  async function publicar() {
    if (temMarcador(r.textoAtual())) {
      erro(
        "Ainda há textos de exemplo entre colchetes, como [TÍTULO]. Troque pelo texto final antes de publicar.",
      );
      return;
    }
    if (await r.publicar())
      ok("Página publicada no site.", {
        acao: {
          rotulo: "Ver no site",
          aoClicar: () =>
            window.open(`https://${site.dominio}${pagina.caminho}`, "_blank", "noopener"),
        },
      });
  }

  return (
    <GaleriaContexto.Provider value={{ nome: "Fotos e arquivos" }}>
      <EditorContexto.Provider value={contexto}>
        <div className="editor-pagina fixed inset-0 z-50 flex flex-col bg-hub-fundo pt-[env(safe-area-inset-top)]">
          <Puck
            config={config}
            data={pagina.rascunho}
            onChange={r.mudou}
            viewports={opcoesDeLargura}
            ui={{
              viewports: {
                current: { width: celular ? 390 : 1280, height: "auto" },
                controlsVisible: false,
                options: opcoesDeLargura,
              },
            }}
            dictionary={ptBR}
            iframe={{ enabled: true, waitForStyles: true }}
            overrides={{ actionBar: BarraSecao }}
          >
            <BarraComPedido
              nome={pagina.nome}
              nomePagina={pagina.nome}
              caminho={pagina.caminho}
              estado={r.estado}
              temRascunho={r.temRascunho}
              publicando={r.publicando}
              aoVoltar={() => {
                void r.garantir();
                aoVoltar();
              }}
              aoPublicar={() => void publicar()}
              aoPedirAjuste={aoPedirAjuste}
            />
            {r.estado === "conflito" && (
              <Conflito texto={textosDaPagina(r.textoAtual())} aoRecarregar={aoRecarregar} />
            )}
            <div className="flex min-h-0 flex-1">
              <div className="relative min-w-0 flex-1 bg-[radial-gradient(circle_at_1px_1px,rgb(14_16_19/0.07)_1px,transparent_0)] [background-size:18px_18px] p-2 pb-24 sm:p-4 lg:pb-4">
                <CanvasEscalado>
                  <Puck.Preview />
                </CanvasEscalado>
              </div>
              <PainelCampos travadas={travadas} />
            </div>
            {celular && <ControlesCelular podeAdicionar={adicionaveis.length > 0} />}
            <AdicionarSecao
              em={adicionarEm}
              tipos={adicionaveis}
              aoFechar={() => setAdicionarEm(null)}
            />
          </Puck>
        </div>
      </EditorContexto.Provider>
    </GaleriaContexto.Provider>
  );
}

/** Outra pessoa salvou depois: nada mais é gravado; o texto da pessoa fica para copiar. */
function Conflito({ texto, aoRecarregar }: { texto: string; aoRecarregar: () => void }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      ok("Seu texto foi copiado.");
    } catch {
      erro("Não deu para copiar sozinho. Selecione o texto e copie.");
    }
  }
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 border-b border-sit-risco-t/20 bg-sit-risco px-4 py-3 text-sit-risco-t md:flex-row md:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[14.5px] font-semibold">Esta página foi alterada por outra pessoa.</p>
        <p className="text-[14px]">
          Para não apagar a versão mais nova, nada mais foi salvo. Copie o seu texto e recarregue a
          página.
        </p>
        <textarea
          readOnly
          value={texto}
          aria-label="Seu texto"
          className="h-24 w-full rounded-lg border border-sit-risco-t/30 bg-white p-2 text-[14px] text-hub-tinta"
        />
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => void copiar()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-sit-risco-t/30 bg-white px-4 text-[14.5px] font-medium text-hub-tinta"
        >
          <Copy className="size-4" aria-hidden="true" /> Copiar meu texto
        </button>
        <button
          type="button"
          onClick={aoRecarregar}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-hub-tinta px-4 text-[14.5px] font-semibold text-white"
        >
          <RotateCw className="size-4" aria-hidden="true" /> Recarregar
        </button>
      </div>
    </div>
  );
}
