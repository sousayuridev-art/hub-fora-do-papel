import { X } from "lucide-react";

import { CampoEscolha } from "@/components/hub/Campo";
import {
  rotuloObjetivo,
  rotuloPilar,
  type BuscaMarketing,
  type Campanha,
  type Canal,
  type Objetivo,
  type Pilar,
} from "@/lib/marketing";
import { classeAcaoTexto } from "@/lib/estilos";

/** Filtros da produção (campanha, canal, pilar e objetivo), todos no endereço. */
export function FiltrosMarketing({
  busca,
  canais,
  campanhas,
  aoMudar,
}: {
  busca: BuscaMarketing;
  canais: Canal[];
  campanhas: Campanha[];
  aoMudar: (b: Partial<BuscaMarketing>) => void;
}) {
  const algum = !!(busca.campanha || busca.canal || busca.pilar || busca.objetivo);
  return (
    <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-end">
      <CampoEscolha
        rotulo="Campanha"
        className="md:w-56"
        valor={busca.campanha ?? ""}
        aoMudar={(v) => aoMudar({ campanha: v || undefined })}
        opcoes={[
          { id: "", rotulo: "Todas" },
          ...campanhas.map((c) => ({ id: c.id, rotulo: c.name })),
        ]}
      />
      <CampoEscolha
        rotulo="Canal"
        className="md:w-44"
        valor={busca.canal ?? ""}
        aoMudar={(v) => aoMudar({ canal: v || undefined })}
        opcoes={[
          { id: "", rotulo: "Todos" },
          ...canais.map((c) => ({ id: c.slug, rotulo: c.nome })),
        ]}
      />
      <CampoEscolha<Pilar | "">
        rotulo="Pilar"
        className="md:w-56"
        valor={busca.pilar ?? ""}
        aoMudar={(v) => aoMudar({ pilar: v || undefined })}
        opcoes={[
          { id: "", rotulo: "Todos" },
          ...(Object.keys(rotuloPilar) as Pilar[]).map((p) => ({ id: p, rotulo: rotuloPilar[p] })),
        ]}
      />
      <CampoEscolha<Objetivo | "">
        rotulo="Objetivo"
        className="md:w-44"
        valor={busca.objetivo ?? ""}
        aoMudar={(v) => aoMudar({ objetivo: v || undefined })}
        opcoes={[
          { id: "", rotulo: "Todos" },
          ...(Object.keys(rotuloObjetivo) as Objetivo[]).map((o) => ({
            id: o,
            rotulo: rotuloObjetivo[o],
          })),
        ]}
      />
      {algum && (
        <button
          type="button"
          onClick={() =>
            aoMudar({
              campanha: undefined,
              canal: undefined,
              pilar: undefined,
              objetivo: undefined,
            })
          }
          className={`${classeAcaoTexto} col-span-2 gap-1.5 self-end`}
        >
          <X className="size-4" aria-hidden="true" /> Limpar filtros
        </button>
      )}
    </div>
  );
}
