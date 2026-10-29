import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { moeda } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { cancelarProjeto, chavesProjetos, previaCancelamento } from "@/lib/projetos";
import { classeLinkTexto } from "@/lib/estilos";

/** Cancelar projeto (REV-3): mostra antes tudo o que será cancelado junto. Não dá para desfazer. */
export function CancelarProjetoPainel({
  projetoId,
  aberto,
  aoMudar,
}: {
  projetoId: string;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  useEffect(() => {
    if (aberto) setMotivo("");
  }, [aberto]);
  const previa = useQuery({
    queryKey: [...chavesProjetos.detalhe(projetoId), "previa-cancelar"],
    queryFn: () => previaCancelamento(projetoId),
    enabled: aberto,
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarProjeto(projetoId, motivo.trim()),
    onSuccess: () => ok("Projeto cancelado."),
    onError: (e) =>
      erro(
        /motivo_obrigatorio/.test(String((e as { message?: string }).message))
          ? "Escreva o motivo (pelo menos 5 letras)."
          : mensagemDeErro(e),
        { tentarDeNovo: () => cancelar.mutate() },
      ),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chavesProjetos.tudo });
      void qc.invalidateQueries({ queryKey: ["financeiro"] });
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });

  const p = previa.data;
  const linhas = p
    ? [
        p.cobrancas > 0 &&
          `${p.cobrancas} ${p.cobrancas === 1 ? "cobrança aberta" : "cobranças abertas"} (${moeda(p.cobrancas_cents)}) ${p.cobrancas === 1 ? "é cancelada" : "são canceladas"}`,
        p.mensalidade && "A mensalidade é encerrada",
        p.aprovacoes > 0 &&
          `${p.aprovacoes} ${p.aprovacoes === 1 ? "aprovação aguardando é cancelada" : "aprovações aguardando são canceladas"}`,
        p.pendencias > 0 &&
          `${p.pendencias} ${p.pendencias === 1 ? "pendência do cliente sai" : "pendências do cliente saem"} do portal`,
        p.pedidos > 0 &&
          `${p.pedidos} ${p.pedidos === 1 ? "pedido aberto é recusado" : "pedidos abertos são recusados"} com o motivo`,
      ].filter((x): x is string => typeof x === "string")
    : [];

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Cancelar projeto"
      descricao="Para quando o cliente desiste ou o projeto foi criado por engano. Não dá para desfazer."
      rodape={
        <BotoesPainel
          rotulo="Cancelar projeto"
          perigo
          desabilitado={motivo.trim().length < 5 || !p || cancelar.isPending}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            cancelar.mutate();
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {previa.isError ? (
          <p className="text-[14.5px] text-sit-risco-t">
            Não foi possível conferir o que está aberto.{" "}
            <button
              type="button"
              className={`${classeLinkTexto} min-h-11`}
              onClick={() => void previa.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        ) : !p ? (
          <div className="h-24 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
        ) : (
          <div className="flex flex-col gap-2 rounded-xl bg-sit-risco p-4 text-[14.5px] text-sit-risco-t">
            <p className="font-semibold">O que acontece junto:</p>
            {linhas.length === 0 ? (
              <p>Nada mais está aberto neste projeto.</p>
            ) : (
              <ul className="list-disc pl-5">
                {linhas.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            {p.pagas_cents > 0 && (
              <p>
                Já pago: {moeda(p.pagas_cents)}. Isso fica registrado; combine com o cliente se há
                crédito ou devolução.
              </p>
            )}
          </div>
        )}
        <CampoArea
          rotulo="Motivo"
          valor={motivo}
          aoMudar={setMotivo}
          linhas={3}
          maxLength={300}
          placeholder="Ex.: Cliente desistiu do projeto"
        />
      </div>
    </PainelLateral>
  );
}
