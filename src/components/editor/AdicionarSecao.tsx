import { PainelLateral } from "@/components/hub/PainelLateral";
import { iconeDaSecao } from "@/components/editor/icones";
import { usePuck } from "@/components/editor/usePuck";
import { sobreAsSecoes, type TipoSecao } from "@/secoes/config";

/** "Adicionar seção": só as seções liberadas para este site (as fixas não entram). */
export function AdicionarSecao({
  em,
  tipos,
  aoFechar,
}: {
  em: number | null;
  tipos: TipoSecao[];
  aoFechar: () => void;
}) {
  const dispatch = usePuck((s) => s.dispatch);
  const inserir = (tipo: TipoSecao) => {
    if (em === null) return;
    dispatch({
      type: "insert",
      componentType: tipo,
      destinationIndex: em,
      destinationZone: "root:default-zone",
    });
    dispatch({ type: "setUi", ui: { itemSelector: { index: em, zone: "root:default-zone" } } });
    aoFechar();
  };
  return (
    <PainelLateral
      aberto={em !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Adicionar seção"
      descricao="A seção entra com textos de exemplo entre colchetes. Troque por textos seus antes de publicar."
    >
      {tipos.length === 0 ? (
        <p className="text-[15px] text-hub-suave">
          Nenhuma seção nova liberada para o seu site. Peça à Fora do Papel se precisar de outra.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-1">
          {tipos.map((t) => {
            const Icone = iconeDaSecao[t];
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => inserir(t)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-hub-fundo"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-hub-fundo">
                    <Icone className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium">{sobreAsSecoes[t].nome}</span>
                    <span className="text-[13.5px] text-hub-suave">{sobreAsSecoes[t].ajuda}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PainelLateral>
  );
}
