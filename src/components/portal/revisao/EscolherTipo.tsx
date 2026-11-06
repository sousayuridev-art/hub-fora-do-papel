import {
  ImageIcon,
  MessageCircle,
  Move,
  SquarePlus,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { tiposDeAjuste, type TipoAjuste } from "@/lib/revisao";

const icones: Record<TipoAjuste, LucideIcon> = {
  texto: Type,
  foto: ImageIcon,
  tirar: Trash2,
  mover: Move,
  incluir: SquarePlus,
  outro: MessageCircle,
};

/** "O que quer fazer aqui?" (card RS-2, tela 03): seis cartões que dizem o que cada opção faz. */
export function EscolherTipo({
  aberto,
  aoMudar,
  onde,
  sugestao,
  aoEscolher,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** "Você tocou no título da capa." */
  onde: string;
  /** Tocou numa foto: "Trocar foto" vem marcado. */
  sugestao: TipoAjuste | null;
  aoEscolher: (t: TipoAjuste) => void;
}) {
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="O que quer fazer aqui?"
      descricao={onde}
    >
      <div className="grid grid-cols-2 gap-2.5">
        {tiposDeAjuste.map((t) => {
          const Icone = icones[t.id];
          const marcado = sugestao === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => aoEscolher(t.id)}
              className={
                marcado
                  ? "flex min-h-24 flex-col items-start gap-1.5 rounded-2xl border-2 border-hub-tinta bg-white p-3 text-left"
                  : "flex min-h-24 flex-col items-start gap-1.5 rounded-2xl border border-hub-borda bg-white p-3 text-left hover:border-hub-tinta"
              }
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#F1F1EC] text-hub-tinta">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <b className="text-[15px] text-hub-tinta">{t.nome}</b>
              <span className="text-[13px] leading-snug text-hub-suave">{t.ajuda}</span>
            </button>
          );
        })}
      </div>
    </PainelLateral>
  );
}
