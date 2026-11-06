import { useEffect, useId, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ImagePlus } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { GravadorAudio } from "@/components/portal/revisao/GravadorAudio";
import { erro, mensagemDeErro } from "@/lib/notify";
import {
  enviarArquivoDoAjuste,
  fotosAceitas,
  mensagemDaRevisao,
  nomeDoTipo,
  problemaDaFoto,
  tiposDeAjuste,
  type NovoAjuste,
  type Posicao,
  type TipoAjuste,
} from "@/lib/revisao";
import { cn } from "@/lib/utils";

/** De onde o ajuste nasce: o toque na prévia, um ajuste da lista ou o modo lista (site sem editor). */
export type InicioDoAjuste = {
  id?: string;
  tipo: TipoAjuste;
  pagina: string;
  pagina_id?: string | null;
  secao?: string | null;
  secao_id?: string | null;
  posicao?: Posicao | null;
  antes?: string | null;
  depois?: string | null;
  observacao?: string | null;
  /** Foto que está no site hoje (endereço) ou a foto nova já enviada. */
  fotoAtual?: string | null;
  foto_id?: string | null;
  audio_id?: string | null;
};

const partesSemEditor = ["Topo", "Meio da página", "Contato", "Rodapé", "Outra parte"];

const perguntaDoTipo: Record<TipoAjuste, string> = {
  texto: "Como deve ficar",
  foto: "Quer explicar algo? (opcional)",
  tirar: "Algum detalhe? (opcional)",
  mover: "Para onde?",
  incluir: "O que incluir aqui?",
  outro: "Conte o que quer mudar",
};

const campo =
  "w-full rounded-xl border border-[#C9C9C2] bg-white px-3.5 py-3 text-base leading-snug text-hub-tinta outline-none focus:border-hub-tinta";

function Rotulo({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-semibold text-hub-tinta">
      {children}
    </label>
  );
}

/**
 * Painel do ajuste (card RS-2, telas 04 e 02b): abre por cima do site, sem sair dele.
 * Foto nova e áudio vão primeiro para Arquivos (S8) e o ajuste guarda só o id.
 */
export function AjusteFolha({
  aberto,
  aoMudar,
  inicio,
  semEditor,
  paginas,
  linkEditor,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  inicio: InicioDoAjuste | null;
  /** Site feito fora do editor do Hub: a pessoa diz a página e a parte por nome. */
  semEditor: boolean;
  paginas: string[];
  /** Página do editor (PC-4) para "Mudar você mesmo"; null sem o módulo de páginas. */
  linkEditor: string | null;
  aoSalvar: (a: NovoAjuste) => Promise<unknown>;
}) {
  const ids = useId();
  const [tipo, setTipo] = useState<TipoAjuste>("texto");
  const [pagina, setPagina] = useState("");
  const [parte, setParte] = useState<string | null>(null);
  const [depois, setDepois] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioSalvo, setAudioSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto || !inicio) return;
    setTipo(inicio.tipo);
    setPagina(inicio.pagina);
    setParte(inicio.secao ?? (semEditor ? "Topo" : null));
    setDepois(inicio.depois ?? inicio.observacao ?? "");
    setFoto(null);
    setAudio(null);
    setAudioSalvo(Boolean(inicio.audio_id));
  }, [aberto, inicio, semEditor]);

  useEffect(() => {
    if (!foto) {
      setFotoUrl(null);
      return;
    }
    const u = URL.createObjectURL(foto);
    setFotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  if (!inicio) return null;
  const editando = Boolean(inicio.id);
  const usaObservacao = tipo === "foto" || tipo === "tirar";
  const temFotoSalva = Boolean(inicio.foto_id) && !foto;
  const vazio =
    tipo !== "tirar" && !depois.trim() && !foto && !temFotoSalva && !audio && !audioSalvo;

  async function salvar() {
    if (!inicio || vazio || enviando) return;
    setEnviando(true);
    let fotoId: string | null;
    let audioId: string | null;
    try {
      fotoId = foto
        ? await enviarArquivoDoAjuste(foto, "Ajuste do site: foto nova")
        : tipo === "foto"
          ? (inicio.foto_id ?? null)
          : null;
      audioId = audio
        ? await enviarArquivoDoAjuste(audio, "Ajuste do site: áudio")
        : audioSalvo
          ? (inicio.audio_id ?? null)
          : null;
    } catch (e) {
      erro(mensagemDaRevisao(e) ?? mensagemDeErro(e));
      setEnviando(false);
      return;
    }
    const texto = depois.trim();
    try {
      await aoSalvar({
        ...(inicio.id ? { id: inicio.id } : {}),
        tipo,
        pagina_id: semEditor ? null : (inicio.pagina_id ?? null),
        pagina: (semEditor ? pagina : inicio.pagina).trim() || "Página inicial",
        secao_id: semEditor ? null : (inicio.secao_id ?? null),
        secao: semEditor ? parte : (inicio.secao ?? null),
        posicao: semEditor ? null : (inicio.posicao ?? null),
        antes: inicio.antes ?? (tipo === "foto" ? (inicio.fotoAtual ?? null) : null),
        depois: usaObservacao ? null : texto || null,
        observacao: usaObservacao ? texto || null : null,
        foto_id: fotoId,
        audio_id: audioId,
      });
      aoMudar(false);
    } catch {
      // o aviso com "Tentar de novo" vem da mutação; o texto fica no painel
    } finally {
      setEnviando(false);
    }
  }

  function escolherFoto(f: File | undefined) {
    if (!f) return;
    const problema = problemaDaFoto(f);
    if (problema) {
      erro(problema);
      return;
    }
    setFoto(f);
  }

  const onde = semEditor
    ? null
    : [inicio.secao, inicio.pagina].filter(Boolean).join(" · ") || inicio.pagina;

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={semEditor ? "Marcar um ajuste" : nomeDoTipo(tipo)}
      descricao={
        semEditor
          ? "Neste site não dá para tocar direto na página. Diga onde fica o ajuste."
          : (onde ?? undefined)
      }
      rodape={
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={vazio || enviando}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFB020] px-5 text-base font-semibold text-hub-tinta shadow-[0_8px_20px_-12px_rgba(255,176,32,0.9)] disabled:opacity-50"
          >
            <Check className="size-5" aria-hidden="true" />
            {enviando ? "Salvando…" : editando ? "Salvar o ajuste" : "Pôr na lista"}
          </button>
          {linkEditor && !semEditor && !editando && (
            <p className="text-center text-[14px] text-hub-suave">
              Quer mudar você mesmo agora?{" "}
              <Link
                to="/portal/site/paginas/$id"
                params={{ id: linkEditor }}
                className="font-semibold text-hub-tinta underline underline-offset-4"
              >
                Abrir o editor
              </Link>
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {semEditor && (
          <>
            <div>
              <Rotulo htmlFor={`${ids}-pagina`}>Em qual página?</Rotulo>
              <input
                id={`${ids}-pagina`}
                list={`${ids}-paginas`}
                value={pagina}
                onChange={(e) => setPagina(e.target.value)}
                autoComplete="off"
                inputMode="text"
                maxLength={80}
                className={campo}
              />
              <datalist id={`${ids}-paginas`}>
                {paginas.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-[14px] font-semibold">Em qual parte?</legend>
              <div className="flex flex-wrap gap-2">
                {partesSemEditor.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={parte === p}
                    onClick={() => setParte(p)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3.5 text-[15px] font-medium",
                      parte === p
                        ? "border-hub-tinta bg-hub-tinta text-white"
                        : "border-[#C9C9C2] bg-white text-hub-tinta",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[14px] font-semibold">O que mudar?</legend>
              <div className="flex flex-wrap gap-2">
                {tiposDeAjuste.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tipo === t.id}
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3.5 text-[15px] font-medium",
                      tipo === t.id
                        ? "border-hub-tinta bg-hub-tinta text-white"
                        : "border-[#C9C9C2] bg-white text-hub-tinta",
                    )}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {inicio.antes && tipo !== "foto" && (
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold">Hoje está assim</span>
            <p className="rounded-xl bg-[#F1F1EC] px-3.5 py-3 text-base leading-snug text-hub-suave">
              {inicio.antes}
            </p>
          </div>
        )}

        {tipo === "foto" && (
          <div className="grid grid-cols-2 gap-3">
            <figure className="flex flex-col gap-1.5">
              <figcaption className="text-[14px] font-semibold">Hoje</figcaption>
              {inicio.fotoAtual ? (
                <img
                  src={inicio.fotoAtual}
                  alt="Foto que está no site hoje"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ) : (
                <span className="grid aspect-square place-items-center rounded-xl bg-[#F1F1EC] text-[13px] text-hub-suave">
                  Sem foto
                </span>
              )}
            </figure>
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold">A nova</span>
              <label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-[#B9B9B2] bg-white text-center text-[14px] text-hub-tinta hover:border-hub-tinta">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto nova escolhida" className="size-full object-cover" />
                ) : temFotoSalva ? (
                  <span className="px-2">Foto nova já enviada. Toque para trocar.</span>
                ) : (
                  <span className="flex flex-col items-center gap-1 px-2">
                    <ImagePlus className="size-6" aria-hidden="true" /> Escolher a foto
                  </span>
                )}
                <input
                  type="file"
                  accept={fotosAceitas.join(",")}
                  className="sr-only"
                  onChange={(e) => escolherFoto(e.target.files?.[0])}
                />
              </label>
              <span className="text-[13px] text-hub-suave">JPG, PNG ou WebP, até 5 MB</span>
            </div>
          </div>
        )}

        <div>
          <Rotulo htmlFor={`${ids}-texto`}>{perguntaDoTipo[tipo]}</Rotulo>
          <textarea
            id={`${ids}-texto`}
            value={depois}
            onChange={(e) => setDepois(e.target.value)}
            rows={3}
            maxLength={usaObservacao ? 400 : 1500}
            className={cn(campo, "resize-none border-[1.5px] border-hub-tinta")}
          />
        </div>

        <GravadorAudio
          arquivo={audio}
          temAudioSalvo={audioSalvo}
          aoMudar={(f, apagou) => {
            setAudio(f);
            if (apagou) setAudioSalvo(false);
          }}
        />
      </div>
    </PainelLateral>
  );
}
