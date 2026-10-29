import { type FocusEvent } from "react";
import { Copy, Trash2 } from "lucide-react";

import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { AvisosMarca } from "@/components/marketing/AvisosMarca";
import { PreviaVersao } from "@/components/marketing/PreviaVersao";
import { PublicacaoVersao } from "@/components/marketing/PublicacaoVersao";
import { RoteiroEditor } from "@/components/marketing/RoteiroEditor";
import { SlidesEditor } from "@/components/marketing/SlidesEditor";
import { useRascunho } from "@/components/marketing/useRascunho";
import {
  ehSlides,
  ehVideo,
  formatosDe,
  guiaFormato,
  rotuloChamada,
  rotuloFormato,
  type CamposVersao,
  type Cena,
  type Chamada,
  type Etapa,
  type Formato,
  type Resultados,
  type Slide,
  type Versao,
} from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

/** Forma única de roteiro e slides para comparar com o banco (que reordena as chaves). */
const roteiroEmTexto = (c: Cena[]) => JSON.stringify(c.map((x) => [x.tempo, x.fala, x.na_tela]));
const slidesEmTexto = (s: Slide[]) => JSON.stringify(s.map((x) => [x.titulo, x.texto]));
const roteiroDoTexto = (t: string): Cena[] =>
  (JSON.parse(t) as [string, string, string][]).map(([tempo, fala, na_tela]) => ({
    tempo,
    fala,
    na_tela,
  }));
const slidesDoTexto = (t: string): Slide[] =>
  (JSON.parse(t) as [string, string][]).map(([titulo, texto]) => ({ titulo, texto }));

/** Sai do grupo (e não só de um campo dentro dele). */
const saiuDoGrupo = (e: FocusEvent<HTMLElement>) =>
  !e.currentTarget.contains(e.relatedTarget as Node | null);

/**
 * Uma versão por canal (MK-1): formato, gancho, texto com contador do canal, roteiro ou slides,
 * chamada do manual, hashtags, revisão da marca, prévia e publicação. Salva ao sair do campo.
 */
export function VersaoEditor({
  v,
  etapa,
  unica,
  aoSalvar,
  aoDuplicar,
  aoRemover,
  aoAgendar,
  aoPublicar,
  aoRegistrar,
  ocupado,
}: {
  v: Versao;
  etapa: Etapa;
  unica: boolean;
  aoSalvar: (c: CamposVersao) => void;
  aoDuplicar: () => void;
  aoRemover: () => void;
  aoAgendar: (quando: string | null) => void;
  aoPublicar: (link: string, quando: string | null) => void;
  aoRegistrar: (r: Resultados) => void;
  ocupado: boolean;
}) {
  const publicada = !!v.published_at;
  // Rascunhos: seguem o banco, mas guardam o que foi digitado se a gravação falhar.
  const [gancho, setGancho, marcarGancho] = useRascunho(v.hook ?? "");
  const [texto, setTexto, marcarTexto] = useRascunho(v.body ?? "");
  const [hashtags, setHashtags, marcarHashtags] = useRascunho(v.hashtags ?? "");
  const roteiroSalvo = roteiroEmTexto(v.script);
  const slidesSalvos = slidesEmTexto(v.slides);
  const [roteiroT, setRoteiroT, marcarRoteiro] = useRascunho(roteiroSalvo);
  const [slidesT, setSlidesT, marcarSlides] = useRascunho(slidesSalvos);
  const roteiro = roteiroDoTexto(roteiroT);
  const slides = slidesDoTexto(slidesT);

  const sairGancho = () => {
    const n = gancho.trim();
    if (n === (v.hook ?? "")) return;
    marcarGancho(n);
    aoSalvar({ gancho: n || null });
  };
  const sairTexto = () => {
    if (texto === (v.body ?? "")) return;
    marcarTexto(texto);
    aoSalvar({ texto: texto || null });
  };
  const sairHashtags = () => {
    const n = hashtags.trim();
    if (n === (v.hashtags ?? "")) return;
    marcarHashtags(n);
    aoSalvar({ hashtags: n || null });
  };

  const limite = v.limite_texto ?? 2200;
  const passou = texto.length > limite;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <fieldset disabled={publicada} className="min-w-56 flex-1">
            <CampoEscolha<Formato>
              rotulo="Formato"
              valor={v.format}
              aoMudar={(f) => aoSalvar({ formato: f })}
              opcoes={formatosDe(v.channel).map((f) => ({ id: f, rotulo: rotuloFormato[f] }))}
            />
          </fieldset>
          {!publicada && (
            <span className="flex gap-1">
              <button
                type="button"
                onClick={aoDuplicar}
                disabled={ocupado}
                className={`${classeAcaoTexto} gap-2`}
              >
                <Copy className="size-4" aria-hidden="true" /> Usar como base
              </button>
              {!unica && (
                <button
                  type="button"
                  onClick={aoRemover}
                  disabled={ocupado}
                  aria-label={`Remover a versão do ${v.canal_nome ?? v.channel}`}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </span>
          )}
        </div>
        {guiaFormato[v.format] && (
          <p className="rounded-xl bg-sit-info px-3 py-2.5 text-[13.5px] text-sit-info-t">
            {guiaFormato[v.format]}
          </p>
        )}

        <fieldset disabled={publicada} className="flex flex-col gap-5">
          <div onBlur={sairGancho}>
            <CampoTexto
              rotulo="Gancho"
              valor={gancho}
              aoMudar={setGancho}
              maxLength={200}
              placeholder="O problema em uma frase que a pessoa reconhece"
              ajuda="Começa pelo problema. Sem curiosidade vazia nem urgência falsa."
            />
          </div>
          <div onBlur={sairTexto}>
            <CampoArea
              rotulo={v.channel === "youtube" ? "Descrição" : "Texto do post"}
              valor={texto}
              aoMudar={setTexto}
              linhas={7}
              maxLength={20000}
              ajuda={
                <span className={cn("tabular-nums", passou && "font-semibold text-sit-risco-t")}>
                  {texto.length.toLocaleString("pt-BR")} de {limite.toLocaleString("pt-BR")}{" "}
                  caracteres no {v.canal_nome ?? v.channel}
                </span>
              }
            />
          </div>

          {ehVideo(v.format) && (
            <section
              aria-label="Roteiro"
              className="flex flex-col gap-2"
              onBlur={(e) => {
                if (!saiuDoGrupo(e) || roteiroT === roteiroSalvo) return;
                marcarRoteiro(roteiroT);
                aoSalvar({ roteiro });
              }}
            >
              <h3 className="text-[14px] font-medium">Roteiro</h3>
              <RoteiroEditor
                cenas={roteiro}
                aoMudar={(c) => setRoteiroT(roteiroEmTexto(c))}
                desativado={publicada}
              />
            </section>
          )}
          {ehSlides(v.format) && (
            <section
              aria-label="Slides"
              className="flex flex-col gap-2"
              onBlur={(e) => {
                if (!saiuDoGrupo(e) || slidesT === slidesSalvos) return;
                marcarSlides(slidesT);
                aoSalvar({ slides });
              }}
            >
              <h3 className="text-[14px] font-medium">Slides</h3>
              <SlidesEditor
                slides={slides}
                aoMudar={(x) => setSlidesT(slidesEmTexto(x))}
                desativado={publicada}
              />
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEscolha<Chamada | "">
              rotulo="Chamada"
              valor={v.cta ?? ""}
              aoMudar={(c) => aoSalvar({ chamada: c || null })}
              opcoes={[
                { id: "", rotulo: "Sem chamada" },
                ...(Object.keys(rotuloChamada) as Chamada[]).map((c) => ({
                  id: c,
                  rotulo: rotuloChamada[c],
                })),
              ]}
              ajuda="Uma chamada por peça, sempre com estas palavras."
            />
            <div onBlur={sairHashtags}>
              <CampoTexto
                rotulo="Hashtags"
                valor={hashtags}
                aoMudar={setHashtags}
                maxLength={300}
                placeholder="#sistemas #aracaju"
                ajuda={
                  v.channel === "linkedin" ? "No máximo 3 no LinkedIn." : "De 3 a 5, específicas."
                }
              />
            </div>
          </div>
        </fieldset>

        <section aria-label="Revisão da marca" className="flex flex-col gap-2">
          <h3 className="text-[14px] font-medium">Revisão da marca</h3>
          <AvisosMarca avisos={v.warnings} />
        </section>

        <section aria-label="Agenda e publicação" className="flex flex-col gap-2">
          <h3 className="text-[14px] font-medium">Agenda e publicação</h3>
          <PublicacaoVersao
            key={`${v.id}-${v.published_at ?? ""}-${v.scheduled_at ?? ""}`}
            v={v}
            etapa={etapa}
            aoAgendar={aoAgendar}
            aoPublicar={aoPublicar}
            aoRegistrar={aoRegistrar}
            ocupado={ocupado}
          />
        </section>
      </div>
      <aside aria-label="Prévia" className="flex flex-col gap-2 lg:sticky lg:top-0 lg:self-start">
        <h3 className="text-[14px] font-medium">Prévia</h3>
        <PreviaVersao v={{ ...v, hook: gancho, body: texto, script: roteiro, slides }} />
      </aside>
    </div>
  );
}
