import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesSistemas,
  clientesParaSistema,
  enderecoValido,
  mensagemDoSistema,
  normalizarEndereco,
  projetosDoCliente,
  rotuloSituacaoSistema,
  salvarSistema,
  type DadosSistema,
  type SistemaResumo,
  type SituacaoSistema,
} from "@/lib/sistemas";

const vazio: DadosSistema = {
  client_id: "",
  project_id: null,
  nome: "",
  descricao: "",
  situacao: "construcao",
  url_producao: "",
  url_teste: "",
};

const SEM_PROJETO = "sem";

/** Novo sistema ou edição dos dados (SIS-1). Painel lateral; no celular, painel de baixo. */
export function SistemaPainel({
  aberto,
  sistema,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  sistema: SistemaResumo | null;
  aoFechar: () => void;
  aoCriar?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [d, setD] = useState<DadosSistema>(vazio);
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setTentou(false);
    setD(
      sistema
        ? {
            id: sistema.id,
            client_id: sistema.client_id,
            project_id: sistema.project_id,
            nome: sistema.nome,
            descricao: sistema.descricao ?? "",
            situacao: sistema.situacao,
            url_producao: sistema.url_producao ?? "",
            url_teste: sistema.url_teste ?? "",
          }
        : vazio,
    );
  }, [aberto, sistema]);

  const clientes = useQuery({
    queryKey: chavesSistemas.clientes,
    queryFn: clientesParaSistema,
    enabled: aberto,
  });
  const projetos = useQuery({
    queryKey: chavesSistemas.projetos(d.client_id),
    queryFn: () => projetosDoCliente(d.client_id),
    enabled: aberto && Boolean(d.client_id),
  });

  const mudar = (m: Partial<DadosSistema>) => setD((x) => ({ ...x, ...m }));
  const producao = normalizarEndereco(d.url_producao);
  const teste = normalizarEndereco(d.url_teste);
  const erros = {
    cliente: d.client_id ? null : "Escolha o cliente.",
    nome: d.nome.trim().length >= 2 ? null : "Dê um nome com pelo menos 2 letras.",
    producao: enderecoValido(producao) ? null : "Confira o endereço.",
    teste: enderecoValido(teste) ? null : "Confira o endereço.",
  };
  const valido = Object.values(erros).every((e) => e === null);

  const salvar = useMutation({
    mutationFn: () => salvarSistema(d),
    onSuccess: (s) => {
      ok(sistema ? "Sistema salvo." : "Sistema criado.");
      void qc.invalidateQueries({ queryKey: chavesSistemas.resumo });
      aoFechar();
      if (!sistema) aoCriar?.(s.id);
    },
    onError: (e) =>
      erro(mensagemDoSistema(e) ?? mensagemDeErro(e), { tentarDeNovo: () => salvar.mutate() }),
  });

  const Erro = ({ t }: { t: string | null }) =>
    tentou && t ? (
      <p role="alert" className="text-[13px] text-sit-risco-t">
        {t}
      </p>
    ) : null;

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo={sistema ? "Dados do sistema" : "Novo sistema"}
      descricao="O que entregamos e onde ele roda."
      rodape={
        <Button
          type="button"
          className="h-11 w-full bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F] sm:w-auto"
          disabled={salvar.isPending}
          onClick={() => {
            setTentou(true);
            if (valido && !salvar.isPending) salvar.mutate();
          }}
        >
          {salvar.isPending ? "Salvando…" : sistema ? "Salvar" : "Criar sistema"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CampoEscolha
            rotulo="Cliente"
            valor={d.client_id}
            aoMudar={(v) => mudar({ client_id: v, project_id: null })}
            opcoes={(clientes.data ?? []).map((c) => ({ id: c.id, rotulo: c.nome }))}
            vazio={clientes.isPending ? "Carregando…" : "Escolha"}
          />
          <Erro t={erros.cliente} />
        </div>
        <CampoEscolha
          rotulo="Projeto"
          valor={d.project_id ?? SEM_PROJETO}
          aoMudar={(v) => mudar({ project_id: v === SEM_PROJETO ? null : v })}
          opcoes={[
            { id: SEM_PROJETO, rotulo: "Sem projeto ligado" },
            ...(projetos.data ?? []).map((p) => ({ id: p.id, rotulo: p.nome })),
          ]}
          ajuda="Ligado ao projeto, o sistema mostra a fase atual e os pedidos de ajuste dele."
        />
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Nome"
            valor={d.nome}
            aoMudar={(v) => mudar({ nome: v })}
            maxLength={80}
            placeholder="Ex.: Sistema de agendamento"
          />
          <Erro t={erros.nome} />
        </div>
        <CampoEscolha<SituacaoSistema>
          rotulo="Situação"
          valor={d.situacao}
          aoMudar={(v) => mudar({ situacao: v })}
          opcoes={(Object.keys(rotuloSituacaoSistema) as SituacaoSistema[]).map((s) => ({
            id: s,
            rotulo: rotuloSituacaoSistema[s],
          }))}
        />
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Endereço de produção"
            tipo="url"
            valor={d.url_producao}
            aoMudar={(v) => mudar({ url_producao: v })}
            maxLength={300}
            placeholder="https://app.cliente.com.br"
          />
          <Erro t={erros.producao} />
        </div>
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Endereço de teste"
            tipo="url"
            valor={d.url_teste}
            aoMudar={(v) => mudar({ url_teste: v })}
            maxLength={300}
            placeholder="https://teste.cliente.com.br"
            ajuda="Opcional. Onde o cliente testa antes de ir ao ar."
          />
          <Erro t={erros.teste} />
        </div>
        <CampoArea
          rotulo="Para que serve"
          valor={d.descricao}
          aoMudar={(v) => mudar({ descricao: v })}
          maxLength={600}
          placeholder="Em uma ou duas frases, o problema que o sistema resolve."
        />
      </div>
    </PainelLateral>
  );
}
