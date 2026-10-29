import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { CampoEscolha } from "@/components/hub/Campo";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { chavesClientes, listarClientes } from "@/lib/funil";
import { chavesProjetos, projetosDoCliente } from "@/lib/projetos";
import type { ReuniaoAberta } from "@/lib/reunioes";
import { useVincularReuniao } from "@/components/reunioes/useVincularReuniao";

/** Cliente, oportunidade e projeto da reunião (card RE-1). */
export function VinculoReuniao({ r }: { r: ReuniaoAberta }) {
  const [cliente, setCliente] = useState(r.cliente?.id ?? "");
  const [projeto, setProjeto] = useState(r.projeto?.id ?? "");
  const [comOportunidade, setComOportunidade] = useState(r.deal_id !== null || r.cliente === null);
  const vincular = useVincularReuniao();

  const clientes = useQuery({ queryKey: chavesClientes.lista, queryFn: listarClientes });
  const projetos = useQuery({
    queryKey: chavesProjetos.doCliente(cliente || "nenhum"),
    queryFn: () => projetosDoCliente(cliente),
    enabled: Boolean(cliente),
  });

  const escolhido = clientes.data?.find((c) => c.id === cliente) ?? null;
  const projetoEscolhido = projetos.data?.find((p) => p.id === projeto) ?? null;
  const deal = escolhido?.deal_id && comOportunidade ? escolhido.deal_id : null;
  const mudou =
    cliente !== (r.cliente?.id ?? "") || projeto !== (r.projeto?.id ?? "") || deal !== r.deal_id;

  function salvar() {
    vincular.mutate({
      id: r.id,
      cliente: escolhido ? { id: escolhido.id, nome: escolhido.company_name } : null,
      deal,
      projeto: projetoEscolhido ? { id: projetoEscolhido.id, nome: projetoEscolhido.name } : null,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <CampoEscolha
        rotulo="Cliente"
        valor={cliente}
        vazio={clientes.isPending ? "Carregando…" : "Escolha o cliente"}
        opcoes={(clientes.data ?? []).map((c) => ({ id: c.id, rotulo: c.company_name }))}
        aoMudar={(v) => {
          setCliente(v);
          setProjeto("");
          setComOportunidade(true);
        }}
      />
      {escolhido?.deal_id && (
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input
            type="checkbox"
            className="size-5 accent-hub-tinta"
            checked={comOportunidade}
            onChange={(e) => setComOportunidade(e.target.checked)}
          />
          Ligar também à oportunidade do funil
        </label>
      )}
      {cliente && (projetos.data?.length ?? 0) > 0 && (
        <CampoEscolha
          rotulo="Projeto"
          valor={projeto}
          opcoes={[
            { id: "", rotulo: "Nenhum projeto" },
            ...(projetos.data ?? []).map((p) => ({ id: p.id, rotulo: p.name })),
          ]}
          aoMudar={setProjeto}
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={classeBotaoSecundario}
          disabled={!cliente || !mudou || vincular.isPending}
          onClick={salvar}
        >
          Salvar vínculo
        </button>
        {r.cliente && (
          <button
            type="button"
            className={`${classeAcaoTexto}`}
            disabled={vincular.isPending}
            onClick={() => {
              setCliente("");
              setProjeto("");
              vincular.mutate({ id: r.id, cliente: null, deal: null, projeto: null });
            }}
          >
            Tirar o cliente
          </button>
        )}
      </div>
    </div>
  );
}
