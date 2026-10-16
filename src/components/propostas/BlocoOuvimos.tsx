import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import { CampoTexto } from "@/components/propostas/CampoTexto";
import type { PropsBloco } from "@/components/propostas/tipos";

/** "O que ouvimos de você": até 3 frases do cliente e a conclusão que guiou a proposta. */
export function BlocoOuvimos({ d, alterar, bloqueado }: PropsBloco) {
  return (
    <BlocoEditor
      id="ouvimos"
      titulo="O que ouvimos"
      texto="Frases do próprio cliente, como ele falou. Deixe em branco o que não tiver."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {d.ouvimos.map((f, i) => (
          <CampoTexto
            key={i}
            rotulo={`Frase ${i + 1}`}
            valor={f}
            max={240}
            linhas={3}
            bloqueado={bloqueado}
            aoMudar={(v) => {
              const novas = d.ouvimos.map((x, j) => (j === i ? v : x));
              alterar({ ouvimos: novas });
            }}
          />
        ))}
      </div>
      <CampoTexto
        rotulo="Por isso…"
        valor={d.ouvimos_conclusao}
        max={600}
        linhas={2}
        bloqueado={bloqueado}
        placeholder="Ex.: o centro do projeto é marcar consulta pelo site e um painel simples para a equipe."
        aoMudar={(v) => alterar({ ouvimos_conclusao: v })}
      />
    </BlocoEditor>
  );
}
