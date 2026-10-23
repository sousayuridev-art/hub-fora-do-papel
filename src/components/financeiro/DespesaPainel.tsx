import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { isoDoDia } from "@/lib/formatar";
import { rotuloCategoria, type CategoriaDespesa, type Despesa } from "@/lib/financeiro";

export type DespesaNova = {
  id: string | null;
  descricao: string;
  categoria: CategoriaDespesa;
  valorCents: number;
  tipo: "fixa" | "avulsa";
  data: string;
  fim: string | null;
  nota: string;
};

/** Incluir ou editar uma despesa fixa (todo mês) ou avulsa (uma vez). */
export function DespesaPainel({
  aberto,
  despesa,
  aoMudar,
  aoSalvar,
}: {
  aberto: boolean;
  despesa: Despesa | null;
  aoMudar: (v: boolean) => void;
  aoSalvar: (v: DespesaNova) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("ferramentas");
  const [valor, setValor] = useState<number | null>(null);
  const [tipo, setTipo] = useState<"fixa" | "avulsa">("fixa");
  const [data, setData] = useState(isoDoDia(new Date()));
  const [fim, setFim] = useState("");
  const [nota, setNota] = useState("");
  useEffect(() => {
    if (!aberto) return;
    setDescricao(despesa?.descricao ?? "");
    setCategoria(despesa?.categoria ?? "ferramentas");
    setValor(despesa?.valor_cents ?? null);
    setTipo(despesa?.tipo ?? "fixa");
    setData(despesa?.data ?? despesa?.inicio ?? isoDoDia(new Date()));
    setFim(despesa?.fim ?? "");
    setNota(despesa?.nota ?? "");
  }, [aberto, despesa]);
  const valido = descricao.trim().length >= 2 && (valor ?? 0) >= 1 && data !== "";
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={despesa ? "Editar despesa" : "Nova despesa"}
      descricao="Entra no fluxo de caixa. Anúncios já vêm do Tráfego pago."
      rodape={
        <BotoesPainel
          rotulo={despesa ? "Salvar" : "Incluir despesa"}
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoSalvar({
              id: despesa?.id ?? null,
              descricao: descricao.trim(),
              categoria,
              valorCents: valor ?? 0,
              tipo,
              data,
              fim: tipo === "fixa" && fim ? fim : null,
              nota: nota.trim(),
            });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex gap-2">
          <legend className="mb-1.5 text-[14px] font-medium">Tipo</legend>
          {(["fixa", "avulsa"] as const).map((t) => (
            <label
              key={t}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-hub-borda px-3 has-[:checked]:border-hub-tinta has-[:checked]:bg-hub-fundo"
            >
              <input
                type="radio"
                name="tipo-despesa"
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="size-4 accent-[#0E1013]"
              />
              {t === "fixa" ? "Todo mês" : "Uma vez"}
            </label>
          ))}
        </fieldset>
        <CampoTexto
          rotulo="Descrição"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={120}
          placeholder="Ex.: Contador"
        />
        <div className="grid grid-cols-2 gap-3">
          <CampoDinheiro rotulo="Valor" valor={valor} aoMudar={setValor} />
          <CampoEscolha<CategoriaDespesa>
            rotulo="Categoria"
            valor={categoria}
            aoMudar={setCategoria}
            opcoes={(Object.keys(rotuloCategoria) as CategoriaDespesa[]).map((c) => ({
              id: c,
              rotulo: rotuloCategoria[c],
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            rotulo={tipo === "fixa" ? "A partir do mês de" : "Data"}
            tipo="date"
            valor={data}
            aoMudar={setData}
          />
          {tipo === "fixa" && (
            <CampoTexto rotulo="Até (opcional)" tipo="date" valor={fim} aoMudar={setFim} />
          )}
        </div>
        <CampoArea
          rotulo="Observação (opcional)"
          valor={nota}
          aoMudar={setNota}
          maxLength={300}
          linhas={2}
        />
      </div>
    </PainelLateral>
  );
}
