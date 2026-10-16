import { useState } from "react";
import { X } from "lucide-react";

import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import type { PropsBloco } from "@/components/propostas/tipos";
import { classeBotaoSecundario } from "@/lib/estilos";

/** O que não está incluído: item e o porquê (o cliente vê os dois). */
export function BlocoFora({ d, alterar, bloqueado }: PropsBloco) {
  const [novo, setNovo] = useState("");
  const incluir = () => {
    const t = novo.trim();
    if (!t || d.fora.length >= 20) return;
    alterar({ fora: [...d.fora, { item: t, motivo: "" }] });
    setNovo("");
  };
  return (
    <BlocoEditor
      id="fora"
      titulo="O que não está incluído"
      texto="Deixar claro agora evita surpresa depois. Se o cliente quiser, vira serviço adicional."
    >
      <ul className="flex flex-col">
        {d.fora.map((f, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] gap-2 border-b border-hub-borda py-2.5">
            <div className="flex min-w-0 flex-col">
              <span className="text-[15px] font-medium">{f.item}</span>
              <label className="sr-only" htmlFor={`fora-${i}`}>
                Por que {f.item} fica de fora
              </label>
              <input
                id={`fora-${i}`}
                value={f.motivo}
                maxLength={300}
                disabled={bloqueado}
                placeholder="Por quê (opcional): ex.: as fotos vêm da empresa"
                onChange={(e) =>
                  alterar({
                    fora: d.fora.map((x, j) => (j === i ? { ...x, motivo: e.target.value } : x)),
                  })
                }
                className="h-9 w-full rounded-lg border border-transparent bg-transparent text-[14px] text-hub-suave outline-none hover:border-[#DADAD3] focus:border-hub-tinta focus:px-2"
              />
            </div>
            {!bloqueado && (
              <button
                type="button"
                aria-label={`Remover ${f.item}`}
                onClick={() => alterar({ fora: d.fora.filter((_, j) => j !== i) })}
                className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-sit-risco hover:text-sit-risco-t"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!bloqueado && (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="fora-novo">
            Novo item fora do escopo
          </label>
          <input
            id="fora-novo"
            value={novo}
            maxLength={120}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                incluir();
              }
            }}
            placeholder="Ex.: Loja com pagamento pelo site"
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
          />
          <button type="button" className={classeBotaoSecundario} onClick={incluir}>
            Incluir
          </button>
        </div>
      )}
    </BlocoEditor>
  );
}
