import { CampoContador } from "@/components/site/CampoContador";
import { limites } from "@/lib/editorArtigo";

/** "Resumo em 3 pontos": as três frases do quadro no topo do artigo. */
export function ArtigoPontos({
  pontos,
  aoMudar,
}: {
  pontos: [string, string, string];
  aoMudar: (p: [string, string, string]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {pontos.map((p, i) => (
        <CampoContador
          key={i}
          rotulo={`Ponto ${i + 1}`}
          valor={p}
          aoMudar={(v) => {
            const novos: [string, string, string] = [...pontos];
            novos[i] = v;
            aoMudar(novos);
          }}
          limite={limites.ponto}
          linhas={2}
        />
      ))}
    </div>
  );
}
