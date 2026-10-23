import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesClientes, listarClientes } from "@/lib/funil";

export type ProjetoNovo = {
  clienteId: string;
  nome: string;
  valorCents: number;
  horas: number;
  lancamento: string | null;
};

/** Projeto sem proposta no Hub (cliente que já existia antes). O normal é nascer no aceite. */
export function NovoProjetoPainel({
  aberto,
  aoMudar,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoCriar: (v: ProjetoNovo) => void;
}) {
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const [cliente, setCliente] = useState("");
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [horas, setHoras] = useState<number | null>(null);
  const [lancamento, setLancamento] = useState("");

  useEffect(() => {
    if (aberto) {
      setCliente("");
      setNome("");
      setValor(null);
      setHoras(null);
      setLancamento("");
    }
  }, [aberto]);

  const valido = cliente !== "" && nome.trim().length >= 2;

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Novo projeto"
      descricao="Para cliente que fechou fora do Hub. Proposta aceita já vira projeto sozinha."
      rodape={
        <BotoesPainel
          rotulo="Criar projeto"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar({
              clienteId: cliente,
              nome: nome.trim(),
              valorCents: valor ?? 0,
              horas: horas ?? 0,
              lancamento: lancamento || null,
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
              className="min-h-11 underline"
              onClick={() => void clientes.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        )}
        <CampoTexto
          rotulo="Nome do projeto"
          valor={nome}
          aoMudar={setNome}
          maxLength={120}
          placeholder="Site com painel de edição"
        />
        <div className="grid grid-cols-2 gap-3">
          <CampoDinheiro rotulo="Valor" valor={valor} aoMudar={setValor} />
          <CampoNumero rotulo="Horas estimadas" sufixo="h" valor={horas} aoMudar={setHoras} />
        </div>
        <CampoTexto
          rotulo="Lançamento previsto (opcional)"
          tipo="date"
          valor={lancamento}
          aoMudar={setLancamento}
        />
        <p className="text-[13.5px] text-hub-suave">
          O projeto começa com as fases Design, Construção, Revisão final e Lançamento, e o
          checklist padrão de encerramento.
        </p>
      </div>
    </PainelLateral>
  );
}
