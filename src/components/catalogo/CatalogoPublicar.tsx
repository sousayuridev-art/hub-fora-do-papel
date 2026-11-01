import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import {
  chavesCatalogo,
  editorCatalogo,
  publicacoesCatalogo,
  publicarCatalogo,
} from "@/lib/catalogo";
import { classeAcaoPrincipal, classeAcaoTexto } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import { chavesSitesHub } from "@/lib/sitesHub";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/**
 * Publicar o catálogo (HUB-CG-04, no formato do site da Fora do Papel): o banco valida e grava uma
 * nova versão; o site lê a última versão publicada em poucos minutos, sem trocar arquivo.
 */
export function CatalogoPublicar({ siteId, dominio }: { siteId: string; dominio: string }) {
  const qc = useQueryClient();
  const ed = useQuery({
    queryKey: chavesCatalogo.editor(siteId),
    queryFn: () => editorCatalogo(siteId),
  });
  const hist = useQuery({
    queryKey: chavesCatalogo.publicacoes(siteId),
    queryFn: () => publicacoesCatalogo(siteId),
  });
  const publicar = useMutation({
    mutationFn: () => publicarCatalogo(siteId),
    onSuccess: (r) => {
      if (r.publicado) ok(`Versão ${r.versao} publicada. O site atualiza em até 5 minutos.`);
      else if (r.repetido) ok("Nada mudou desde a última publicação.");
      else erro("A publicação foi bloqueada. Veja o que corrigir na lista.");
    },
    onError: (e) =>
      erro(`Não foi possível publicar. ${mensagemDeErro(e)}`, {
        tentarDeNovo: () => publicar.mutate(),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chavesCatalogo.tudo(siteId) });
      void qc.invalidateQueries({ queryKey: chavesSitesHub.tudo });
    },
  });

  if (ed.isError)
    return (
      <EstadoErro
        titulo="Não foi possível ver o catálogo"
        aoTentarDeNovo={() => void ed.refetch()}
      />
    );
  const e = ed.data;
  if (!e) return <div className="h-48 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  const bloqueado = e.problemas.length > 0;

  return (
    <div className="grid max-w-5xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section
        aria-label="Publicar"
        className="flex flex-col gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5"
      >
        <h2 className="text-[15.5px] font-semibold">Publicar o catálogo</h2>
        <p className="text-[14px] text-hub-suave">
          {e.contagem.produtos} produtos · {e.contagem.categorias} categorias ·{" "}
          {e.contagem.depoimentos} depoimentos · {e.contagem.marcas} marcas ·{" "}
          {e.contagem.fotos_fixas} fotos do site
        </p>
        <p className="text-[14px]">
          {e.ultima
            ? e.mudou
              ? `Há mudanças desde a versão ${e.ultima.versao} (${diaComHora(e.ultima.publicado_em)}).`
              : `Tudo publicado: o site está na versão ${e.ultima.versao}.`
            : "O catálogo ainda não foi publicado."}
        </p>
        {bloqueado && (
          <ul className="flex flex-col gap-1.5 rounded-xl bg-sit-risco p-3 text-[14px] text-sit-risco-t">
            {e.problemas.map((p) => (
              <li key={p} className="flex gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
        )}
        {e.avisos.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-xl bg-sit-atencao p-3 text-[14px] text-sit-atencao-t">
            {e.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`${classeAcaoPrincipal} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={bloqueado || !e.mudou || publicar.isPending}
            onClick={() => publicar.mutate()}
          >
            {publicar.isPending ? "Publicando…" : "Validar e publicar"}
          </button>
          <a
            href={`https://${dominio}`}
            target="_blank"
            rel="noopener noreferrer"
            className={classeAcaoTexto}
          >
            <ExternalLink className="size-4" aria-hidden="true" /> Ver o site
          </a>
          {!bloqueado && !e.mudou && e.ultima && (
            <span className="inline-flex items-center gap-1.5 text-[14px] text-sit-ok-t">
              <CheckCircle2 className="size-4" aria-hidden="true" /> No ar
            </span>
          )}
        </div>
      </section>

      <section
        aria-label="Versões publicadas"
        className="flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-5"
      >
        <h2 className="text-[15.5px] font-semibold">Versões publicadas</h2>
        {hist.isError ? (
          <p className="text-[14px] text-sit-risco-t">Não foi possível carregar o histórico.</p>
        ) : !hist.data ? (
          <div className="h-24 animate-pulse rounded-xl bg-[#F5F7FA]" />
        ) : hist.data.length === 0 ? (
          <p className="text-[14px] text-hub-suave">Nenhuma ainda.</p>
        ) : (
          <ul className="flex flex-col">
            {hist.data.slice(0, 20).map((p) => (
              <li
                key={p.versao}
                className="flex justify-between gap-3 border-t border-[#EEF1F5] py-2 text-[14px] first:border-t-0 first:pt-0"
              >
                <span>
                  <b className="font-medium">Versão {p.versao}</b>
                  <span className="block text-[13px] text-hub-suave">
                    {p.resumo["produtos"] ?? 0} produtos{p.por ? ` · ${p.por}` : ""}
                  </span>
                </span>
                <span className="text-[13px] text-hub-suave">{diaComHora(p.publicado_em)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
