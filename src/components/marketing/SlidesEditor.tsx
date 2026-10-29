import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { classeEntrada } from "@/components/hub/Campo";
import type { Slide } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

/**
 * Slides do carrossel ou do documento: o primeiro com o problema, uma ideia por slide,
 * o último com a chamada. Avisa fora de 3 a 8 slides (skill de conteúdo).
 */
export function SlidesEditor({
  slides,
  aoMudar,
  desativado,
}: {
  slides: Slide[];
  aoMudar: (s: Slide[]) => void;
  desativado?: boolean;
}) {
  const trocar = (i: number, campo: keyof Slide, valor: string) =>
    aoMudar(slides.map((s, n) => (n === i ? { ...s, [campo]: valor } : s)));
  const mover = (i: number, passo: number) => {
    const j = i + passo;
    if (j < 0 || j >= slides.length) return;
    const n = [...slides];
    [n[i], n[j]] = [n[j] as Slide, n[i] as Slide];
    aoMudar(n);
  };
  const fora = slides.length > 0 && (slides.length < 3 || slides.length > 8);
  return (
    <div className="flex flex-col gap-2">
      {slides.map((s, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-hub-borda p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-hub-suave">
              Slide {i + 1}
              {i === 0
                ? " · gancho"
                : i === slides.length - 1 && slides.length > 1
                  ? " · chamada"
                  : ""}
            </span>
            {!desativado && (
              <span className="flex">
                <button
                  type="button"
                  aria-label={`Subir slide ${i + 1}`}
                  disabled={i === 0}
                  onClick={() => mover(i, -1)}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Descer slide ${i + 1}`}
                  disabled={i === slides.length - 1}
                  onClick={() => mover(i, 1)}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Remover slide ${i + 1}`}
                  onClick={() => aoMudar(slides.filter((_, n) => n !== i))}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
          <input
            aria-label={`Título do slide ${i + 1}`}
            className={cn(classeEntrada, "h-11 font-semibold")}
            value={s.titulo}
            maxLength={120}
            disabled={desativado}
            placeholder="Título do slide"
            onChange={(e) => trocar(i, "titulo", e.target.value)}
          />
          <textarea
            aria-label={`Texto do slide ${i + 1}`}
            className={cn(classeEntrada, "py-2.5")}
            rows={2}
            value={s.texto}
            maxLength={600}
            disabled={desativado}
            placeholder="Texto de apoio (curto)"
            onChange={(e) => trocar(i, "texto", e.target.value)}
          />
        </div>
      ))}
      {fora && (
        <p className="text-[13px] text-sit-atencao-t">
          O manual pede de 3 a 8 slides; agora são {slides.length}.
        </p>
      )}
      {!desativado && slides.length < 20 && (
        <button
          type="button"
          onClick={() => aoMudar([...slides, { titulo: "", texto: "" }])}
          className={`${classeAcaoTexto} gap-2 self-start`}
        >
          <Plus className="size-4" aria-hidden="true" /> Adicionar slide
        </button>
      )}
    </div>
  );
}
