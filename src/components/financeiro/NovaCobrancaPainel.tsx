import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesClientes, listarClientes } from "@/lib/funil";
import { classeLinkTexto } from "@/lib/estilos";

export type CobrancaNova = {
  clienteId: string;
  descricao: string;
  valorCents: number;
  vencimento: string | null;
};

/** Cobrança avulsa. Parcelas, diagnósticos, serviços adicionais e mensalidades nascem sozinhos. */
export function NovaCobrancaPainel({
  aberto,
  aoMudar,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoCriar: (v: CobrancaNova) => void;
}) {
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [vencimento, setVencimento] = useState("");
  useEffect(() => {
    if (aberto) {
      setCliente("");
      setDescricao("");
      setValor(null);
      setVencimento("");
    }
  }, [aberto]);
  const valido = cliente !== "" && descricao.trim().length >= 2 && (valor ?? 0) >= 1;
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova cobrança"
      descricao="Para algo combinado fora da proposta. Parcelas, diagnósticos e mensalidades já nascem sozinhos."
      rodape={
        <BotoesPainel
          rotulo="Criar cobrança"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar({
              clienteId: cliente,
              descricao: descricao.trim(),
              valorCents: valor ?? 0,
              vencimento: vencimento || null,
            });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoEscolha
          rotulo="Cliente"
          valor={cliente}
          aoMudar={setCliente}
          vazio={clientes.isPending ? "Carregando…" : "Escolha o cliente"}
          opcoes={(clientes.data ?? [])
            .filter((c) => c.situacao !== "arquivado")
            .map((c) => ({ id: c.id, rotulo: c.company_name }))}
        />
        {clientes.isError && (
          <p className="text-[13.5px] text-sit-risco-t">
            Não foi possível carregar os clientes.{" "}
            <button
              type="button"
              className={`${classeLinkTexto} min-h-11`}
              onClick={() => void clientes.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        )}
        <CampoTexto
          rotulo="O que está sendo cobrado"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={160}
          placeholder="Ex.: Renovação do domínio"
        />
        <div className="grid grid-cols-2 gap-3">
          <CampoDinheiro rotulo="Valor" valor={valor} aoMudar={setValor} />
          <CampoTexto rotulo="Vencimento" tipo="date" valor={vencimento} aoMudar={setVencimento} />
        </div>
      </div>
    </PainelLateral>
  );
}
