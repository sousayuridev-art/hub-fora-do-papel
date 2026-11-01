import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2 } from "lucide-react";

import { chavesCatalogo, mensagemDoCatalogo } from "@/lib/catalogo";
import { extrairCatalogo, type CatalogoCg } from "@/lib/catalogoCg";
import {
  baixarArquivo,
  gerarArquivoDoSite,
  importarDoSite,
  lerBase,
  resumoDoArquivo,
  salvarBase,
} from "@/lib/catalogoSite";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import { chavesSitesHub } from "@/lib/sitesHub";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Lido = { html: string; nome: string; data: CatalogoCg };

/** Escolhe um .html do computador e lê o contrato (sem gravar nada ainda). */
function useArquivoHtml(aoLer: (l: Lido) => void) {
  const entrada = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={entrada}
      type="file"
      accept=".html,text/html"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        try {
          const html = await f.text();
          aoLer({ html, nome: f.name, data: extrairCatalogo(html).data });
        } catch (err) {
          erro(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
        }
      }}
    />
  );
  return { input, escolher: () => entrada.current?.click() };
}

/**
 * Arquivo do site da CG (HUB-CG, contrato em docs/integracoes/catalogo-cg/):
 * importação inicial do HTML em produção, HTML base ("motor" do site) e download do arquivo
 * com a reserva embutida atualizada e o site já apontado para o banco do Hub.
 */
export function CatalogoArquivo({
  siteId,
  dominio,
  temCatalogo,
  ultimaVersao,
}: {
  siteId: string;
  dominio: string;
  temCatalogo: boolean;
  ultimaVersao: number | null;
}) {
  const qc = useQueryClient();
  const base = useQuery({
    queryKey: [...chavesCatalogo.tudo(siteId), "base"],
    queryFn: () => lerBase(siteId),
  });
  const [lido, setLido] = useState<Lido | null>(null);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  const importar = useMutation({
    mutationFn: (l: Lido) =>
      importarDoSite(siteId, l.html, l.nome, (feitas, total) => setProgresso({ feitas, total })),
    onSuccess: () => {
      ok("Catálogo importado. Confira os produtos e publique.");
      setLido(null);
      setConfirmar(false);
    },
    onError: (e, l) =>
      erro(
        mensagemDoCatalogo(e) ??
          `A importação parou no meio e nada foi trocado no catálogo. ${mensagemDeErro(e)}`,
        {
          tentarDeNovo: () => importar.mutate(l),
        },
      ),
    onSettled: () => {
      setProgresso(null);
      void qc.invalidateQueries({ queryKey: chavesCatalogo.tudo(siteId) });
      void qc.invalidateQueries({ queryKey: chavesSitesHub.tudo });
    },
  });
  const trocarBase = useMutation({
    mutationFn: (l: Lido) => salvarBase(siteId, l.html, l.nome),
    onSuccess: () => ok("HTML base trocado. Os próximos arquivos saem com esse design."),
    onError: (e, l) =>
      erro(mensagemDoCatalogo(e) ?? `Não foi possível guardar o HTML. ${mensagemDeErro(e)}`, {
        tentarDeNovo: () => trocarBase.mutate(l),
      }),
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: [...chavesCatalogo.tudo(siteId), "base"] }),
  });
  const gerar = useMutation({
    mutationFn: () => gerarArquivoDoSite(siteId, dominio),
    onSuccess: (html) => {
      baixarArquivo(html, "index.html");
      ok("Arquivo gerado. Troque o arquivo do site no Lovable por este.");
    },
    onError: (e) =>
      erro(
        mensagemDoCatalogo(e) ??
          `Não foi possível gerar o arquivo. ${e instanceof Error ? e.message : mensagemDeErro(e)}`,
      ),
  });

  const paraImportar = useArquivoHtml((l) => {
    setLido(l);
    setConfirmar(false);
  });
  const paraBase = useArquivoHtml((l) => trocarBase.mutate(l));
  const r = lido ? resumoDoArquivo(lido.data) : null;

  return (
    <section
      aria-label="Arquivo do site"
      className="flex flex-col gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5"
    >
      <h2 className="text-[15.5px] font-semibold">Arquivo do site</h2>
      <p className="text-[14px] text-hub-suave">
        O site da loja é um arquivo único. Com o arquivo gerado aqui no ar, ele busca o catálogo
        publicado no Hub a cada visita (as próximas publicações aparecem sem trocar o arquivo) e usa
        os dados embutidos se o Hub não responder.
      </p>

      {paraImportar.input}
      {paraBase.input}

      {lido && r ? (
        <div className="flex flex-col gap-3 rounded-xl bg-[#F5F7FA] p-4 text-[14px]">
          <b className="font-semibold">{lido.nome}</b>
          <span>
            {r.produtos} produtos · {r.categorias} categorias · {r.depoimentos} depoimentos ·{" "}
            {r.marcas} marcas · {r.fotos} fotos
          </span>
          {r.erros.length > 0 && (
            <ul className="list-disc pl-5 text-sit-atencao-t">
              {r.erros.slice(0, 5).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          {progresso ? (
            <span className="inline-flex items-center gap-2" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Enviando fotos{" "}
              {progresso.feitas} de {progresso.total}…
            </span>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className={classeBotaoSecundario} onClick={() => setLido(null)}>
                Cancelar
              </button>
              {temCatalogo && !confirmar ? (
                <button
                  type="button"
                  className={classeBotaoSecundario}
                  onClick={() => setConfirmar(true)}
                >
                  Importar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={importar.isPending}
                  onClick={() => importar.mutate(lido)}
                  className={cn(
                    classeBotaoSecundario,
                    temCatalogo && "border-[#F6D3CF] text-sit-risco-t",
                  )}
                >
                  {temCatalogo ? "Confirmar: substituir o catálogo do Hub" : "Importar"}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className={classeBotaoSecundario} onClick={paraImportar.escolher}>
            <FileUp className="size-4" aria-hidden="true" /> Importar do site em produção
          </button>
          <button
            type="button"
            className={classeBotaoSecundario}
            disabled={!ultimaVersao || !base.data || gerar.isPending}
            onClick={() => gerar.mutate()}
          >
            {gerar.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Baixar o arquivo do site{ultimaVersao ? ` (versão ${ultimaVersao})` : ""}
          </button>
        </div>
      )}

      <p className="text-[13px] text-hub-suave">
        HTML base:{" "}
        {base.isPending
          ? "…"
          : base.data
            ? `${base.data.nome_arquivo ?? "arquivo"} · ${Math.round(base.data.tamanho / 1024)} KB · ${diaComHora(base.data.atualizado_em)}`
            : "ainda não enviado (vem junto com a importação)"}{" "}
        <button
          type="button"
          className="min-h-11 font-semibold text-hub-tinta"
          onClick={paraBase.escolher}
        >
          {base.data ? "Trocar (novo design)" : "Enviar"}
        </button>
      </p>
    </section>
  );
}
