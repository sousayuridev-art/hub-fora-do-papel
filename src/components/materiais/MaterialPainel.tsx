import { useState } from "react";
import { Copy, Download, ExternalLink, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { IconeMaterial } from "@/components/materiais/IconeMaterial";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import {
  abrirArquivo,
  rotuloCategoria,
  tamanhoLegivel,
  tipoLegivel,
  type Material,
} from "@/lib/materiais";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/** Painel de um material: ver, baixar ou copiar; editar; lixeira e exclusão. */
export function MaterialPainel({
  m,
  aoFechar,
  aoEditar,
  aoLixeira,
  aoExcluir,
}: {
  m: Material | null;
  aoFechar: () => void;
  aoEditar: (m: Material) => void;
  aoLixeira: (m: Material, excluir: boolean) => void;
  aoExcluir: (m: Material) => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const abrir = async (baixar: boolean) => {
    if (!m) return;
    try {
      await abrirArquivo(m, baixar);
    } catch (e) {
      erro(mensagemDeErro(e), { tentarDeNovo: () => void abrir(baixar) });
    }
  };
  const copiar = async () => {
    if (!m) return;
    try {
      await navigator.clipboard.writeText(m.texto ?? m.url ?? "");
      ok("Copiado.");
    } catch {
      erro("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };

  return (
    <PainelLateral
      aberto={m !== null}
      aoMudar={(v) => {
        if (!v) {
          setConfirmar(false);
          aoFechar();
        }
      }}
      titulo={m?.titulo ?? ""}
      descricao={m ? `${tipoLegivel(m)} · ${rotuloCategoria[m.categoria]}` : undefined}
    >
      {m && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconeMaterial m={m} />
            <div className="flex min-w-0 flex-col text-[14px] text-hub-suave">
              {m.arquivo && <span className="truncate text-hub-tinta">{m.arquivo}</span>}
              <span>
                {[tamanhoLegivel(m.tamanho), `Atualizado ${diaMes(m.atualizado_em)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {m.origem === "cliente" ? (
              <Selo tom="info">Enviado pelo cliente</Selo>
            ) : m.compartilhado ? (
              <Selo tom="ok">Compartilhado com o cliente</Selo>
            ) : (
              <Selo>Só nosso</Selo>
            )}
            {m.excluido_em && <Selo tom="risco">Na lixeira</Selo>}
          </div>

          {(m.empresa || m.projeto) && (
            <p className="text-[14.5px]">
              {m.empresa}
              {m.projeto ? ` · ${m.projeto}` : ""}
            </p>
          )}
          {m.descricao && <p className="text-[14.5px] text-hub-suave">{m.descricao}</p>}

          {m.tipo === "texto" && (
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-hub-fundo p-4 font-sans text-[14.5px] leading-relaxed">
              {m.texto}
            </pre>
          )}
          {m.tipo === "link" && (
            <p className="break-all rounded-xl bg-hub-fundo p-4 text-[14.5px]">{m.url}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {m.tipo === "arquivo" && (
              <>
                <button
                  type="button"
                  className={classeBotaoSecundario}
                  onClick={() => void abrir(false)}
                >
                  <ExternalLink className="size-4" aria-hidden="true" /> Ver
                </button>
                <button
                  type="button"
                  className={classeBotaoSecundario}
                  onClick={() => void abrir(true)}
                >
                  <Download className="size-4" aria-hidden="true" /> Baixar
                </button>
              </>
            )}
            {m.tipo === "link" && m.url && (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classeBotaoSecundario}
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Abrir link
              </a>
            )}
            {m.tipo !== "arquivo" && (
              <button type="button" className={classeBotaoSecundario} onClick={() => void copiar()}>
                <Copy className="size-4" aria-hidden="true" /> Copiar
              </button>
            )}
            {!m.excluido_em && (
              <button type="button" className={classeBotaoSecundario} onClick={() => aoEditar(m)}>
                <Pencil className="size-4" aria-hidden="true" /> Editar
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-hub-borda pt-4">
            {!m.excluido_em ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 self-start text-[14.5px] font-medium text-sit-risco-t"
                onClick={() => {
                  aoLixeira(m, true);
                  aoFechar();
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Mandar para a lixeira
              </button>
            ) : confirmar ? (
              <div className="flex flex-col gap-3 rounded-xl bg-sit-risco p-4 text-sit-risco-t">
                <p className="text-[14.5px]">
                  Excluir de vez apaga {m.tipo === "arquivo" ? "o arquivo" : "o material"} e não dá
                  para desfazer.
                  {m.compartilhado || m.origem === "cliente"
                    ? " O cliente também deixa de ver."
                    : ""}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className={classeBotaoSecundario}
                    onClick={() => setConfirmar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#9A1C12] px-4 font-semibold text-white"
                    onClick={() => {
                      aoExcluir(m);
                      setConfirmar(false);
                      aoFechar();
                    }}
                  >
                    Excluir de vez
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className={classeBotaoSecundario}
                  onClick={() => {
                    aoLixeira(m, false);
                    aoFechar();
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden="true" /> Restaurar
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 px-2 text-[14.5px] font-medium text-sit-risco-t"
                  onClick={() => setConfirmar(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Excluir de vez
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PainelLateral>
  );
}
