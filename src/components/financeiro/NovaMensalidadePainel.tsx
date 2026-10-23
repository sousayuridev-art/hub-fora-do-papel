import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { isoDoDia } from "@/lib/formatar";
import { chavesClientes, listarClientes } from "@/lib/funil";
import { chavesPrecos, lerPrecos } from "@/lib/precos";

export type MensalidadeNova = {
  clienteId: string;
  plano: string;
  valorCents: number;
  inicio: string;
  dia: number;
  minimo: number;
};

/** Mensalidade de cliente que já existia antes do Hub. A do projeto lançado nasce sozinha. */
export function NovaMensalidadePainel({
  aberto,
  aoMudar,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoCriar: (v: MensalidadeNova) => void;
}) {
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const precos = useQuery({ queryKey: chavesPrecos.tudo, queryFn: lerPrecos, enabled: aberto });
  const [cliente, setCliente] = useState("");
  const [plano, setPlano] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [inicio, setInicio] = useState(isoDoDia(new Date()));
  const [dia, setDia] = useState<number | null>(10);
  const [minimo, setMinimo] = useState<number | null>(6);
  useEffect(() => {
    if (aberto) {
      setCliente("");
      setPlano("");
      setValor(null);
      setInicio(isoDoDia(new Date()));
      setDia(10);
      setMinimo(6);
    }
  }, [aberto]);
  const planos = precos.data?.planos ?? [];
  const valido = cliente !== "" && plano.trim().length >= 2 && (valor ?? 0) >= 1 && inicio !== "";
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova mensalidade"
      descricao="Para cliente antigo. Quando um projeto com plano é lançado, a mensalidade nasce sozinha."
      rodape={
        <BotoesPainel
          rotulo="Criar mensalidade"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar({
              clienteId: cliente,
              plano: plano.trim(),
              valorCents: valor ?? 0,
              inicio,
              dia: dia ?? 10,
              minimo: minimo ?? 6,
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
        {planos.length > 0 && (
          <CampoEscolha
            rotulo="Plano de Configurações"
            valor={planos.some((p) => p.name === plano) ? plano : ""}
            vazio="Escolha ou digite abaixo"
            aoMudar={(nome) => {
              const p = planos.find((x) => x.name === nome);
              setPlano(nome);
              if (p) {
                setValor(p.price_cents);
                setMinimo(p.min_months);
              }
            }}
            opcoes={planos.map((p) => ({ id: p.name, rotulo: p.name }))}
          />
        )}
        <CampoTexto rotulo="Nome do plano" valor={plano} aoMudar={setPlano} maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <CampoDinheiro rotulo="Valor por mês" valor={valor} aoMudar={setValor} />
          <CampoTexto rotulo="Começa no mês de" tipo="date" valor={inicio} aoMudar={setInicio} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero
            rotulo="Dia do vencimento"
            valor={dia}
            aoMudar={setDia}
            casas={0}
            ajuda="De 1 a 28"
          />
          <CampoNumero rotulo="Mínimo de meses" valor={minimo} aoMudar={setMinimo} casas={0} />
        </div>
      </div>
    </PainelLateral>
  );
}
