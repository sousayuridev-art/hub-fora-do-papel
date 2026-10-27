import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesClientes, listarClientes } from "@/lib/funil";
import type { OrigemDoHub } from "@/lib/pedidos";

export type PedidoNovo = {
  clienteId: string;
  titulo: string;
  descricao: string;
  origem: OrigemDoHub;
  projetoId: string | null;
};

/** Pedido que chegou por WhatsApp ou reunião. O do portal entra sozinho. */
export function RegistrarPedidoPainel({
  aberto,
  aoMudar,
  aoRegistrar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoRegistrar: (v: PedidoNovo) => void;
}) {
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const [cliente, setCliente] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState<OrigemDoHub>("whatsapp");
  useEffect(() => {
    if (aberto) {
      setCliente("");
      setTitulo("");
      setDescricao("");
      setOrigem("whatsapp");
    }
  }, [aberto]);
  const valido = cliente !== "" && titulo.trim().length >= 2;
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Registrar pedido"
      descricao="Entra como novo. Em seguida, classifique."
      rodape={
        <BotoesPainel
          rotulo="Registrar"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoRegistrar({
              clienteId: cliente,
              titulo: titulo.trim(),
              descricao: descricao.trim(),
              origem,
              projetoId: null,
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
            .filter((c) => c.situacao === "cliente")
            .map((c) => ({ id: c.id, rotulo: c.company_name }))}
          ajuda="Só clientes com contrato fechado. O pedido entra no projeto mais recente dele."
        />
        {clientes.isError && (
          <p className="text-[13.5px] text-sit-risco-t">
            Não foi possível carregar os clientes.{" "}
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => void clientes.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        )}
        <CampoEscolha<OrigemDoHub>
          rotulo="Chegou por"
          valor={origem}
          aoMudar={setOrigem}
          opcoes={[
            { id: "whatsapp", rotulo: "WhatsApp" },
            { id: "reuniao", rotulo: "Reunião" },
            { id: "hub", rotulo: "Outro" },
          ]}
        />
        <CampoTexto
          rotulo="O que o cliente pediu"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          placeholder="Página de convênios"
        />
        <CampoArea
          rotulo="Detalhe (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={2000}
          linhas={3}
        />
      </div>
    </PainelLateral>
  );
}
