import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { Opcoes } from "@/components/propostas/Opcoes";
import type { PropsBloco } from "@/components/propostas/tipos";
import type { Propriedade } from "@/lib/propostas";

const opcoes: { id: Propriedade; rotulo: string }[] = [
  { id: "cliente", rotulo: "Tudo fica com o cliente" },
  { id: "licenca", rotulo: "Código licenciado" },
];

/** "O que fica com o cliente" (card S10): sem escolha, a proposta não é enviada. */
export function CampoPropriedade({ d, alterar, bloqueado }: PropsBloco) {
  return (
    <div className="flex flex-col gap-3 border-t border-hub-borda pt-4">
      <Opcoes<Propriedade | "">
        rotulo="O que fica com o cliente"
        opcoes={opcoes}
        valor={d.propriedade ?? ""}
        bloqueado={bloqueado}
        aoEscolher={(v) => alterar({ propriedade: v === "" ? null : v })}
      />
      {d.propriedade === null && (
        <p className="text-[13.5px] text-hub-suave">
          Escolha antes de enviar. Sites e lojas: tudo fica com o cliente. Sistemas sob medida:
          código licenciado.
        </p>
      )}
      {d.propriedade === "licenca" && (
        <CampoDinheiro
          className="sm:max-w-[280px]"
          rotulo="Valor da compra do código"
          bloqueado={bloqueado}
          placeholder="Ex.: 15.000,00"
          valor={d.compra_codigo_cents}
          aoMudar={(n) => alterar({ compra_codigo_cents: n })}
          ajuda="Em branco, a proposta diz que a compra tem orçamento sob pedido. A licença vale enquanto a mensalidade estiver ativa."
        />
      )}
    </div>
  );
}
