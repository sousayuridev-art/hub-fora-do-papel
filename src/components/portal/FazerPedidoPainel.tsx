import { useEffect, useId, useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";

import { CampoArea, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import { tamanhoLegivel } from "@/lib/materiais";
import type { ContextoPedido } from "@/lib/pedidos";
import { anexosDoPedido, problemaDoAnexo, type NovoPedido } from "@/lib/portal";

/** Junta a página digitada ao contexto que veio da tela. */
function comPagina(base: ContextoPedido | null | undefined, pagina: string): ContextoPedido {
  const { pagina: _antiga, ...resto } = base ?? {};
  const p = pagina.trim();
  return p ? { ...resto, pagina: p } : resto;
}

/** De onde o pedido nasce: o editor de páginas (PC-4) já manda o site e a página. */
export type OrigemDoPedidoNoPainel = {
  siteId?: string | null;
  contexto?: ContextoPedido | null;
};

/**
 * Pedido feito pelo cliente (cards S3 e PC-2), com página e anexos.
 * Painel de baixo no celular. Só fecha quando o pedido entra; se falhar, o texto continua aqui.
 */
export function FazerPedidoPainel({
  aberto,
  aoMudar,
  aoEnviar,
  origem,
  paginas = [],
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoEnviar: (v: NovoPedido) => Promise<unknown>;
  origem?: OrigemDoPedidoNoPainel | undefined;
  /** Nomes das páginas do site, como sugestão para "Em qual página?" */
  paginas?: string[];
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pagina, setPagina] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const limpar = useRef(true);
  const seletor = useRef<HTMLInputElement>(null);
  const idLista = useId();

  // Começa limpo depois de um pedido enviado; depois de uma falha, mantém o que foi digitado
  useEffect(() => {
    if (!aberto) return;
    if (limpar.current) {
      setTitulo("");
      setDescricao("");
      setArquivos([]);
      limpar.current = false;
    }
    setPagina(origem?.contexto?.pagina ?? "");
    setAviso(null);
  }, [aberto, origem]);

  function anexar(lista: FileList | null) {
    const novos = Array.from(lista ?? []);
    const problema = novos.map(problemaDoAnexo).find(Boolean);
    if (problema) {
      setAviso(problema);
      return;
    }
    const juntos = [...arquivos, ...novos];
    setAviso(
      juntos.length > anexosDoPedido.maximo
        ? `Anexe no máximo ${anexosDoPedido.maximo} arquivos.`
        : null,
    );
    setArquivos(juntos.slice(0, anexosDoPedido.maximo));
  }

  async function enviar() {
    setEnviando(true);
    try {
      await aoEnviar({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        siteId: origem?.siteId ?? null,
        contexto: comPagina(origem?.contexto, pagina),
        arquivos,
      });
      limpar.current = true;
      aoMudar(false);
    } catch {
      // o aviso com "Tentar de novo" vem da mutação; o texto fica no painel
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Pedir um ajuste"
      descricao="Conte o que você quer mudar. Respondemos dizendo se está no combinado ou se tem custo."
      rodape={
        <>
          <Button variant="outline" className="h-12 max-sm:w-full" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button
            className="h-12 bg-hub-tinta text-white hover:bg-[#2A2E35] max-sm:w-full"
            disabled={titulo.trim().length < 2 || enviando}
            onClick={() => void enviar()}
          >
            {enviando ? "Enviando…" : "Enviar pedido"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="O que você precisa"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          autoComplete="off"
          placeholder="Ex.: trocar a foto da recepção"
        />
        <CampoTexto
          rotulo="Em qual página? (opcional)"
          valor={pagina}
          aoMudar={setPagina}
          maxLength={80}
          autoComplete="off"
          placeholder="Ex.: Página inicial"
          {...(paginas.length > 0 ? { list: idLista } : {})}
        />
        {paginas.length > 0 && (
          <datalist id={idLista}>
            {paginas.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        )}
        <CampoArea
          rotulo="Detalhes (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={2000}
          linhas={4}
          placeholder="O que deve entrar no lugar e até quando precisa"
        />

        <div className="flex flex-col gap-2">
          <input
            ref={seletor}
            type="file"
            multiple
            accept={anexosDoPedido.aceitar}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              anexar(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start"
            disabled={arquivos.length >= anexosDoPedido.maximo || enviando}
            onClick={() => seletor.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden="true" /> Anexar print ou arquivo
          </Button>
          <p className="text-[13px] text-hub-suave">
            Até {anexosDoPedido.maximo} arquivos: foto (JPG, PNG ou WebP) ou PDF, até 5 MB cada.
          </p>
          {aviso && (
            <p role="alert" className="rounded-xl bg-sit-risco p-3 text-[14px] text-sit-risco-t">
              {aviso}
            </p>
          )}
          {arquivos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {arquivos.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-hub-borda bg-white px-3"
                >
                  {f.type === "application/pdf" ? (
                    <FileText className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14px]">{f.name}</span>
                  <span className="text-[13px] text-hub-suave tabular-nums">
                    {tamanhoLegivel(f.size)}
                  </span>
                  <button
                    type="button"
                    className="-mr-2 flex size-11 items-center justify-center rounded-lg text-hub-suave hover:text-hub-tinta"
                    aria-label={`Tirar ${f.name}`}
                    disabled={enviando}
                    onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[13.5px] text-hub-suave">
          Algo maior? Mandamos um orçamento de serviço adicional para você aprovar antes de começar.
        </p>
      </div>
    </PainelLateral>
  );
}
