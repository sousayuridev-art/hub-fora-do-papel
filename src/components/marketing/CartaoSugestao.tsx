import { Check, Sparkles, X } from "lucide-react";

import { marcaOpcao } from "@/components/marketing/useSugestoesIA";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import {
  rotuloCampoSugestao,
  rotuloChamada,
  type CampoSugestao,
  type Sugestao,
} from "@/lib/marketing";

const titulo = { versao: "Versão sugerida", ganchos: "Cinco ganchos", revisao: "Revisão pela voz" };
const CAMPOS: CampoSugestao[] = ["gancho", "texto", "roteiro", "slides", "chamada", "hashtags"];

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Ideia central + briefing + manual de voz de 27/10/2026" (regra 6: toda sugestão diz de onde veio). */
function origem(s: Sugestao) {
  const manual = s.base.instrucoes?.split("·")[1]?.trim();
  return [...(s.base.usou ?? []), manual].filter(Boolean).join(" + ");
}

function Valor({ campo, s }: { campo: CampoSugestao; s: Sugestao }) {
  const c = s.conteudo;
  if (campo === "roteiro")
    return (
      <ol className="flex flex-col gap-1">
        {(c.roteiro ?? []).map((x, i) => (
          <li key={i}>
            <span className="tabular-nums text-hub-suave">{x.tempo}</span> {x.fala}
            {x.na_tela && <span className="text-hub-suave"> · na tela: {x.na_tela}</span>}
          </li>
        ))}
      </ol>
    );
  if (campo === "slides")
    return (
      <ol className="flex flex-col gap-1">
        {(c.slides ?? []).map((x, i) => (
          <li key={i}>
            <b className="font-semibold">
              {i + 1}. {x.titulo}
            </b>{" "}
            {x.texto}
          </li>
        ))}
      </ol>
    );
  if (campo === "chamada") return <>{c.chamada ? rotuloChamada[c.chamada] : ""}</>;
  return <span className="whitespace-pre-line">{c[campo] ?? ""}</span>;
}

/** Uma sugestão da IA. Nada entra na peça sem a pessoa clicar em "Usar". */
export function CartaoSugestao({
  s,
  desativado,
  aoUsar,
  aoDescartar,
}: {
  s: Sugestao;
  desativado: boolean;
  aoUsar: (campos: CampoSugestao[] | null, opcao: number | null) => void;
  aoDescartar: () => void;
}) {
  const usados = new Set(s.campos_usados ?? []);
  const campos = CAMPOS.filter((k) => {
    const v = s.conteudo[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#E4E4DD] bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles className="size-4 shrink-0 text-[#D48A00]" aria-hidden="true" />
            {titulo[s.tipo]}
          </h4>
          <p className="text-[12.5px] text-hub-suave">
            {quando(s.created_at)} · Base: {origem(s) || "briefing"}
          </p>
        </div>
        <button
          type="button"
          onClick={aoDescartar}
          disabled={desativado}
          aria-label="Descartar sugestão"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t md:size-9"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      {s.tipo === "versao" && (
        <>
          <dl className="flex flex-col gap-3">
            {campos.map((k) => (
              <div key={k} className="flex flex-col gap-1.5 rounded-xl bg-hub-fundo p-3">
                <dt className="flex items-center justify-between gap-2 text-[13px] font-medium">
                  {rotuloCampoSugestao[k]}
                  {usados.has(k) ? (
                    <span className="flex min-h-9 items-center gap-1 text-sit-ok-t">
                      <Check className="size-4" aria-hidden="true" /> Usado
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={desativado}
                      onClick={() => aoUsar([k], null)}
                      className={classeAcaoTexto}
                      aria-label={`Usar ${rotuloCampoSugestao[k].toLowerCase()}`}
                    >
                      Usar
                    </button>
                  )}
                </dt>
                <dd className="text-[14px] leading-relaxed">
                  <Valor campo={k} s={s} />
                </dd>
              </div>
            ))}
          </dl>
          {s.conteudo.observacao && (
            <p className="text-[13.5px] text-hub-suave">{s.conteudo.observacao}</p>
          )}
          {campos.some((k) => !usados.has(k)) && (
            <button
              type="button"
              disabled={desativado}
              onClick={() =>
                aoUsar(
                  campos.filter((k) => !usados.has(k)),
                  null,
                )
              }
              className={`${classeBotaoSecundario} w-full sm:w-auto sm:self-start`}
            >
              Usar tudo
            </button>
          )}
        </>
      )}

      {s.tipo === "ganchos" && (
        <ul className="flex flex-col gap-2">
          {(s.conteudo.ganchos ?? []).map((g, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl bg-hub-fundo p-3"
            >
              <span className="text-[14px]">{g}</span>
              {usados.has(marcaOpcao(s, i)) ? (
                <span className="flex min-h-9 shrink-0 items-center gap-1 text-[13px] text-sit-ok-t">
                  <Check className="size-4" aria-hidden="true" /> Usado
                </span>
              ) : (
                <button
                  type="button"
                  disabled={desativado}
                  onClick={() => aoUsar(null, i)}
                  className={`${classeAcaoTexto} shrink-0`}
                  aria-label={`Usar o gancho ${i + 1}`}
                >
                  Usar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {s.tipo === "revisao" &&
        ((s.conteudo.itens ?? []).length === 0 ? (
          <p className="rounded-xl bg-sit-ok px-3 py-2.5 text-[14px] text-sit-ok-t">
            Nada a trocar pela voz da marca. {s.conteudo.resumo}
          </p>
        ) : (
          <>
            {s.conteudo.resumo && <p className="text-[14px]">{s.conteudo.resumo}</p>}
            <ul className="flex flex-col gap-2">
              {(s.conteudo.itens ?? []).map((x, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-1.5 rounded-xl bg-hub-fundo p-3 text-[14px]"
                >
                  <p>
                    <s className="text-sit-risco-t">{x.trecho}</s> →{" "}
                    <b className="font-semibold">{x.troca || "(tirar)"}</b>
                  </p>
                  <p className="text-[13px] text-hub-suave">
                    {x.campo === "gancho" ? "No gancho" : "No texto"}: {x.problema}
                  </p>
                  {usados.has(marcaOpcao(s, i)) ? (
                    <span className="flex min-h-9 items-center gap-1 text-[13px] text-sit-ok-t">
                      <Check className="size-4" aria-hidden="true" /> Trocado
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={desativado}
                      onClick={() => aoUsar(null, i)}
                      className={`${classeAcaoTexto} self-start`}
                    >
                      Trocar no texto
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        ))}

      {(s.base.descartados ?? []).length > 0 && (
        <p className="text-[12.5px] text-hub-suave">
          Ficou de fora por não seguir o manual: {(s.base.descartados ?? []).join(", ")}.
        </p>
      )}
    </article>
  );
}
