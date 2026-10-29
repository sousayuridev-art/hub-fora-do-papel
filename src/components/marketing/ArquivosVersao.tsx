import { useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  FolderOpen,
  TriangleAlert,
  Trash2,
  Upload,
} from "lucide-react";

import { EscolherArquivoPainel } from "@/components/marketing/EscolherArquivoPainel";
import { classeAcaoTexto } from "@/lib/estilos";
import { problemaDoArquivo, tipoDoArquivo, type Material } from "@/lib/materiais";
import {
  mimesDoPapel,
  papeisDoFormato,
  papelDoArquivo,
  papelExigido,
  proporcaoDoFormato,
  proporcaoParecida,
  rotuloPapel,
  type Midia,
  type PapelMidia,
  type Versao,
} from "@/lib/marketing";

export type AcoesArquivos = {
  enviar: (arquivos: File[]) => void;
  ligar: (material: Material, papel: PapelMidia) => void;
  remover: (id: string) => void;
  ordenar: (ids: string[]) => void;
  /** MK-6: imagens do modelo da marca (novas entram, antigas saem, tema gravado). */
  gerar?: (arquivos: File[], antigos: string[], capa: string, final: string) => Promise<boolean>;
};

/** Miniatura com a conferência da proporção do formato (medida pela própria imagem). */
function Miniatura({
  m,
  src,
  esperada,
  aoMedir,
}: {
  m: Midia;
  src: string | undefined;
  esperada: number | null;
  aoMedir: (fora: boolean) => void;
}) {
  if (m.papel === "video")
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[#0E1013] text-white">
        <Film className="size-5" aria-hidden="true" />
      </span>
    );
  if (m.papel === "documento")
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-sit-neutro">
        <FileText className="size-5" aria-hidden="true" />
      </span>
    );
  return src ? (
    <img
      src={src}
      alt=""
      className="size-14 shrink-0 rounded-lg object-cover"
      onLoad={(e) => {
        const i = e.currentTarget;
        if (esperada && i.naturalHeight > 0)
          aoMedir(!proporcaoParecida(i.naturalWidth / i.naturalHeight, esperada));
      }}
    />
  ) : (
    <span className="size-14 shrink-0 animate-pulse rounded-lg bg-[#E6E6DF]" />
  );
}

/**
 * Arquivos da versão (MK-2): enviar do computador (vai para Materiais › Conteúdo das redes),
 * escolher de Materiais, ordenar com Subir/Descer e tirar da versão. O formato visual precisa
 * do arquivo para ir à aprovação.
 */
export function ArquivosVersao({
  v,
  clienteDaPeca,
  clienteAutorizou,
  links,
  acoes,
  enviando,
  ocupado,
  extra,
}: {
  v: Versao;
  clienteDaPeca: string | null;
  clienteAutorizou: boolean;
  links: Record<string, string>;
  acoes: AcoesArquivos;
  enviando: boolean;
  ocupado: boolean;
  /** Ação a mais ao lado de enviar e escolher (MK-6: gerar com o modelo da marca). */
  extra?: ReactNode;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [escolher, setEscolher] = useState(false);
  const [recusados, setRecusados] = useState<string[]>([]);
  const [foraDaProporcao, setForaDaProporcao] = useState<Record<string, boolean>>({});
  const publicada = !!v.published_at;
  const midias = v.midias ?? [];
  const exigido = papelExigido(v.format);
  const proporcao = proporcaoDoFormato(v.format);
  const aceitos = [...new Set(papeisDoFormato(v.format).flatMap((p) => mimesDoPapel[p]))];
  const faltando =
    exigido &&
    !midias.some((m) => m.papel === exigido || (v.format === "documento" && m.papel === "slide"));
  const qtdFora = midias.filter((m) => foraDaProporcao[m.id]).length;
  const naLixeira = !publicada && midias.some((m) => m.na_lixeira);
  // Número do slide conta só os slides (a capa não entra na conta).
  const numeroSlide = (id: string) =>
    midias.filter((m) => m.papel === "slide").findIndex((m) => m.id === id) + 1;

  const mover = (i: number, passo: number) => {
    const j = i + passo;
    if (j < 0 || j >= midias.length) return;
    const ids = midias.map((m) => m.id);
    [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    acoes.ordenar(ids);
  };

  function aoEscolherArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const bons: File[] = [];
    const ruins: string[] = [];
    for (const f of Array.from(lista)) {
      const problema = problemaDoArquivo(f);
      if (problema) ruins.push(problema);
      else if (!papelDoArquivo(v.format, tipoDoArquivo(f)))
        ruins.push(
          `${f.name}: esse tipo não serve em ${v.format === "documento" ? "documento" : "neste formato"}.`,
        );
      else bons.push(f);
    }
    setRecusados(ruins);
    if (bons.length > 0) acoes.enviar(bons);
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {faltando && (
        <p className="flex items-start gap-2 rounded-xl bg-sit-atencao px-3 py-2.5 text-[14px] text-sit-atencao-t">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Para ir à aprovação, este formato precisa de {rotuloPapel[exigido].toLowerCase()}
          {exigido === "slide" ? "s" : ""}.
        </p>
      )}

      {naLixeira && (
        <p className="flex items-start gap-2 rounded-xl bg-sit-risco px-3 py-2.5 text-[14px] text-sit-risco-t">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Um arquivo desta versão está na lixeira de Materiais. Restaure ou troque antes de aprovar
          e publicar.
        </p>
      )}
      {midias.length > 0 && (
        <ol aria-label="Arquivos da versão" className="flex flex-col gap-2">
          {midias.map((m, i) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-hub-borda bg-white p-2"
            >
              <Miniatura
                m={m}
                src={m.caminho ? links[m.caminho] : undefined}
                esperada={proporcao?.valor ?? null}
                aoMedir={(fora) => setForaDaProporcao((x) => ({ ...x, [m.id]: fora }))}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <b className="truncate text-[14px] font-semibold">{m.titulo}</b>
                <span className="text-[12.5px] text-hub-suave">
                  {rotuloPapel[m.papel]}
                  {m.papel === "slide" ? ` ${numeroSlide(m.id)}` : ""}
                  {m.origem === "cliente" ? " · enviado pelo cliente" : ""}
                  {m.na_lixeira && <b className="text-sit-risco-t"> · na lixeira</b>}
                  {foraDaProporcao[m.id] && proporcao && (
                    <span className="text-sit-atencao-t"> · fora de {proporcao.rotulo}</span>
                  )}
                </span>
              </div>
              {!publicada && (
                <span className="flex shrink-0">
                  <button
                    type="button"
                    aria-label={`Subir ${m.titulo}`}
                    disabled={i === 0 || ocupado}
                    onClick={() => mover(i, -1)}
                    className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${m.titulo}`}
                    disabled={i === midias.length - 1 || ocupado}
                    onClick={() => mover(i, 1)}
                    className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Tirar ${m.titulo} da versão`}
                    disabled={ocupado}
                    onClick={() => acoes.remover(m.id)}
                    className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {qtdFora > 0 && proporcao && (
        <p className="text-[13px] text-sit-atencao-t">
          {qtdFora === 1 ? "Uma imagem não está" : `${qtdFora} imagens não estão`} em{" "}
          {proporcao.rotulo}: a rede pode cortar as bordas.
        </p>
      )}
      {recusados.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] text-sit-risco-t" role="alert">
          {recusados.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {!publicada && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={entrada}
            type="file"
            multiple
            accept={aceitos.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => aoEscolherArquivos(e.target.files)}
          />
          <button
            type="button"
            className={`${classeAcaoTexto} gap-2`}
            disabled={enviando || ocupado}
            onClick={() => entrada.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {enviando ? "Enviando…" : "Enviar do computador"}
          </button>
          <button
            type="button"
            className={`${classeAcaoTexto} gap-2`}
            disabled={ocupado}
            onClick={() => setEscolher(true)}
          >
            <FolderOpen className="size-4" aria-hidden="true" /> Escolher de Materiais ›
          </button>
          {extra}
        </div>
      )}
      <p className="text-[12.5px] text-hub-suave">
        Até 25 MB por arquivo. O que você envia daqui fica em Materiais › Conteúdo das redes.
      </p>

      <EscolherArquivoPainel
        aberto={escolher}
        aoMudar={setEscolher}
        formato={v.format}
        clienteDaPeca={clienteAutorizou ? clienteDaPeca : null}
        jaLigados={midias.map((m) => m.material_id)}
        aoEscolher={(m, papel) => acoes.ligar(m, papel)}
      />
    </div>
  );
}
