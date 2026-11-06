import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Hand, List, Plus, Send } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { AjusteFolha, type InicioDoAjuste } from "@/components/portal/revisao/AjusteFolha";
import { EnviarRevisao } from "@/components/portal/revisao/EnviarRevisao";
import { EscolherTipo } from "@/components/portal/revisao/EscolherTipo";
import { ItemDaLista } from "@/components/portal/revisao/ItemDaLista";
import { PreviaPagina, type Pino, type Toque } from "@/components/portal/revisao/PreviaPagina";
import { useMutacoesRevisao } from "@/components/portal/revisao/useRevisao";
import { useEmpresaPortal } from "@/hooks/useEmpresaPortal";
import { useIsMobile } from "@/hooks/use-mobile";
import { buscarPagina, chavesPaginas, paginasDoSite } from "@/lib/paginasCliente";
import type { AjusteRascunho, Revisao, TipoAjuste } from "@/lib/revisao";
import { cn } from "@/lib/utils";

/**
 * Marcar ajustes e enviar (card RS-2, telas 02 a 06 e 10). Com o módulo de páginas, o site é
 * desenhado aqui e o toque marca o lugar; sem ele (site feito fora do editor), a pessoa diz a
 * página e a parte por nome.
 */
export function MarcarRevisao({ r, aoSair }: { r: Revisao; aoSair: () => void }) {
  const celular = useIsMobile();
  const empresa = useEmpresaPortal();
  const responsavel = empresa.data?.perfil === "responsavel";
  const m = useMutacoesRevisao(r.site.id);
  const comEditor = r.site.modulos.includes("paginas");

  const paginas = useQuery({
    queryKey: chavesPaginas.doSite(r.site.id),
    queryFn: () => paginasDoSite(r.site.id),
    enabled: comEditor,
  });
  const [paginaId, setPaginaId] = useState<string | null>(null);
  const atual = paginaId ?? paginas.data?.[0]?.id ?? null;
  const pagina = useQuery({
    queryKey: chavesPaginas.pagina(atual ?? "nenhuma"),
    queryFn: () => buscarPagina(atual as string),
    enabled: Boolean(atual),
  });
  const semEditor = !comEditor || (paginas.isSuccess && paginas.data.length === 0);

  const itens = useMemo(() => r.rascunho?.itens ?? [], [r.rascunho]);
  const numero = r.rascunho?.numero ?? r.proxima;
  const [toque, setToque] = useState<Toque | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [inicio, setInicio] = useState<InicioDoAjuste | null>(null);
  const [folha, setFolha] = useState(false);
  const [vendoLista, setVendoLista] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const pinos = useMemo<Pino[]>(() => {
    const lista: Pino[] = itens
      .map((a, i) => ({ a, numero: i + 1 }))
      .filter(({ a }) => a.pagina_id === atual && a.secao_id && a.posicao)
      .map(({ a, numero }) => ({
        numero,
        secaoId: a.secao_id as string,
        posicao: a.posicao as { x: number; y: number },
      }));
    if (toque && (escolhendo || folha) && !inicio?.id)
      lista.push({
        numero: itens.length + 1,
        secaoId: toque.secaoId,
        posicao: toque.posicao,
        novo: true,
      });
    return lista;
  }, [itens, atual, toque, escolhendo, folha, inicio]);

  const nomePagina = paginas.data?.find((p) => p.id === atual)?.nome ?? "Página inicial";

  function tocou(t: Toque) {
    setToque(t);
    setInicio(null);
    setEscolhendo(true);
  }

  function escolheu(tipo: TipoAjuste) {
    if (!toque) return;
    setEscolhendo(false);
    setInicio({
      tipo,
      pagina: nomePagina,
      pagina_id: atual,
      secao: toque.secao,
      secao_id: toque.secaoId,
      posicao: toque.posicao,
      antes: tipo === "foto" ? toque.foto : toque.antes,
      fotoAtual: toque.foto,
    });
    setFolha(true);
  }

  function marcarSemEditor() {
    setToque(null);
    setInicio({ tipo: "texto", pagina: "Página inicial" });
    setFolha(true);
  }

  function editar(a: AjusteRascunho) {
    setVendoLista(false);
    setToque(null);
    setInicio({
      id: a.id,
      tipo: a.tipo,
      pagina: a.pagina,
      pagina_id: a.pagina_id,
      secao: a.secao,
      secao_id: a.secao_id,
      posicao: a.posicao,
      antes: a.antes,
      depois: a.depois,
      observacao: a.observacao,
      fotoAtual: a.tipo === "foto" ? a.antes : null,
      foto_id: a.foto_id,
      audio_id: a.audio_id,
    });
    setFolha(true);
  }

  function enviar() {
    if (!r.rascunho || r.rascunho.id === "novo") return;
    m.enviar.mutate(r.rascunho.id, {
      onSuccess: () => {
        setEnviando(false);
        setVendoLista(false);
        aoSair();
      },
    });
  }

  const lista = (
    <div className="flex flex-col gap-2.5">
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-4 text-[15px] text-hub-suave">
          {semEditor
            ? 'Nenhum ajuste ainda. Toque em "Marcar um ajuste" para começar.'
            : "Nenhum ajuste ainda. Toque no site, no que você quer mudar."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((a, i) => (
            <ItemDaLista
              key={a.id}
              numero={i + 1}
              ajuste={a}
              podeMexer={a.meu || responsavel}
              aoEditar={() => editar(a)}
              aoTirar={() => m.tirar.mutate(a)}
            />
          ))}
        </ul>
      )}
      {semEditor && (
        <button
          type="button"
          onClick={marcarSemEditor}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-[#B9B9B2] bg-white text-[15px] font-semibold text-hub-tinta"
        >
          <Plus className="size-4" aria-hidden="true" /> Marcar {itens.length ? "outro" : "um"}{" "}
          ajuste
        </button>
      )}
    </div>
  );

  const botaoEnviar = (
    <button
      type="button"
      disabled={itens.length === 0 || m.enviar.isPending}
      onClick={() => setEnviando(true)}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFB020] text-base font-semibold text-hub-tinta shadow-[0_8px_20px_-12px_rgba(255,176,32,0.9)] disabled:opacity-50"
    >
      <Send className="size-4" aria-hidden="true" />
      Enviar {itens.length} {itens.length === 1 ? "ajuste" : "ajustes"}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 max-md:pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <button
            type="button"
            onClick={aoSair}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-hub-suave hover:text-hub-tinta"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
          </button>
          <span className="text-[13.5px] font-medium text-hub-suave">
            Meu site · revisão {numero} de {Math.max(r.incluidas, numero)}
          </span>
          <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[40px]">
            {semEditor ? "O que você quer mudar?" : "Toque no que quer mudar"}
          </h1>
        </div>
        {!semEditor && (paginas.data?.length ?? 0) > 1 && (
          <label className="flex flex-col gap-1 text-[14px] font-semibold max-md:w-full">
            Página
            <select
              value={atual ?? ""}
              onChange={(e) => setPaginaId(e.target.value)}
              className="h-12 rounded-xl border border-[#C9C9C2] bg-white px-3 text-base font-normal"
            >
              {paginas.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
        <section aria-label="Prévia do site" className="flex min-w-0 flex-col gap-3">
          {semEditor ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5">
              <p className="flex gap-2.5 rounded-xl bg-sit-info p-3 text-[14.5px] text-sit-info-t">
                Neste site não dá para tocar direto na página. Abra o site em outra aba, veja com
                calma e diga aqui onde fica cada ajuste.
              </p>
              <a
                href={`https://${r.site.dominio}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold text-hub-tinta md:self-start"
              >
                Abrir {r.site.dominio} <ExternalLink className="size-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={marcarSemEditor}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white md:self-start"
              >
                <Plus className="size-4" aria-hidden="true" /> Marcar um ajuste
              </button>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-2.5 rounded-2xl border border-hub-borda bg-white px-3.5 py-3 text-[14.5px]">
                <Hand className="size-5 shrink-0" aria-hidden="true" /> Toque em qualquer parte do
                site que você quer mudar.
              </p>
              <div className="overflow-hidden rounded-[20px] border border-hub-borda bg-white shadow-[0_10px_30px_-18px_rgba(14,16,19,0.35)]">
                {pagina.isError ? (
                  <p className="p-6 text-[15px] text-sit-risco-t">
                    Não conseguimos abrir a página.{" "}
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() => void pagina.refetch()}
                    >
                      Tentar de novo
                    </button>
                  </p>
                ) : !pagina.data ? (
                  <div className="h-[60vh] animate-pulse bg-[#F1F1EC]" aria-busy="true" />
                ) : (
                  <PreviaPagina dados={pagina.data.rascunho} pinos={pinos} aoTocar={tocou} />
                )}
              </div>
            </>
          )}
        </section>

        {!celular && (
          <aside aria-label="Sua lista" className="sticky top-6 flex flex-col gap-3">
            <div className="rounded-2xl border border-hub-borda bg-white p-4">
              <h2 className="text-[20px] font-bold">Sua lista</h2>
              <p className="mt-1 text-[14px] text-hub-suave">
                Nada chega até nós enquanto você não envia.
              </p>
            </div>
            {lista}
            <div className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-4">
              <p className="text-[14px] text-hub-suave">
                Se algum ajuste for além do combinado, mandamos o valor antes.
              </p>
              {botaoEnviar}
            </div>
          </aside>
        )}
      </div>

      {celular && (
        <div className="barra-fixa fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-hub-borda bg-white px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(14,16,19,0.25)]">
          <div className="min-w-0 flex-1">
            <b className="block text-base tabular-nums">
              {itens.length} {itens.length === 1 ? "ajuste" : "ajustes"}
            </b>
            <span className="text-[13px] text-hub-suave">na sua lista</span>
          </div>
          <button
            type="button"
            onClick={() => setVendoLista(true)}
            className={cn(
              "inline-flex h-12 items-center gap-2 rounded-xl px-5 text-[15px] font-semibold",
              itens.length
                ? "bg-[#FFB020] text-hub-tinta"
                : "border border-[#DADAD3] bg-white text-hub-tinta",
            )}
          >
            <List className="size-4" aria-hidden="true" /> Ver a lista
          </button>
        </div>
      )}

      <PainelLateral
        aberto={vendoLista}
        aoMudar={setVendoLista}
        titulo="Sua lista"
        descricao="Confira antes de enviar. Nada chega até nós enquanto você não envia."
        rodape={botaoEnviar}
      >
        {lista}
      </PainelLateral>

      <EscolherTipo
        aberto={escolhendo}
        aoMudar={(v) => {
          setEscolhendo(v);
          if (!v && !folha) setToque(null);
        }}
        onde={toque ? `Você tocou em: ${toque.secao}.` : ""}
        sugestao={toque?.foto ? "foto" : toque?.antes ? "texto" : null}
        aoEscolher={escolheu}
      />

      <AjusteFolha
        aberto={folha}
        aoMudar={(v) => {
          setFolha(v);
          if (!v) setToque(null);
        }}
        inicio={inicio}
        semEditor={semEditor}
        paginas={paginas.data?.map((p) => p.nome) ?? []}
        linkEditor={comEditor ? atual : null}
        aoSalvar={(a) => m.salvar.mutateAsync(a)}
      />

      <EnviarRevisao
        aberto={enviando}
        aoMudar={setEnviando}
        total={itens.length}
        numero={numero}
        incluidas={r.incluidas}
        enviando={m.enviar.isPending}
        aoEnviar={enviar}
      />
    </div>
  );
}
