import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { CampoArea } from "@/components/hub/Campo";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import { Button } from "@/components/ui/button";
import { diaComHora, moeda } from "@/lib/formatar";
import {
  rotuloClassificacao,
  rotuloOrigem,
  rotuloSituacaoPedido,
  tomSituacaoPedido,
  type Classificacao,
  type PedidoLinha,
} from "@/lib/pedidos";
import { cn } from "@/lib/utils";

export type AcoesPedido = {
  aoClassificar: (p: PedidoLinha, c: Classificacao, horas: number, nota: string) => void;
  aoEnviar: (p: PedidoLinha) => void;
  aoIniciar: (p: PedidoLinha) => void;
  aoConcluir: (p: PedidoLinha) => void;
  aoRecusar: (p: PedidoLinha, motivo: string) => void;
};

const amarelo = "h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]";

/** Painel do pedido: classificar, estimar, enviar ao cliente, iniciar, concluir ou recusar. */
export function PedidoPainel({
  p,
  horaCents,
  aoFechar,
  ...a
}: { p: PedidoLinha | null; horaCents: number; aoFechar: () => void } & AcoesPedido) {
  const [classe, setClasse] = useState<Classificacao | null>(null);
  const [horas, setHoras] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setClasse(p?.classification ?? null);
    setHoras(p?.hours_estimated ?? null);
    setNota(p?.owner_note ?? "");
    setRecusando(false);
    setMotivo("");
  }, [p]);

  const podeClassificar =
    p !== null &&
    (p.status === "recebido" || (p.status === "em_analise" && p.client_decision === null));
  const previa =
    classe === "adicional" && horas && horas > 0
      ? Math.round(Math.max(horas, 1) * horaCents)
      : null;
  const classValida = classe !== null && (classe !== "adicional" || (horas ?? 0) > 0);
  const mudouClasse =
    p !== null &&
    (classe !== p.classification ||
      (horas ?? null) !== (p.hours_estimated ?? null) ||
      nota !== (p.owner_note ?? ""));

  const fechar = (f: () => void) => () => {
    f();
    aoFechar();
  };

  let acao: React.ReactNode = null;
  if (p) {
    if (recusando) {
      acao = (
        <>
          <Button variant="outline" className="h-11" onClick={() => setRecusando(false)}>
            Voltar
          </Button>
          <Button
            className="h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]"
            disabled={motivo.trim().length < 5}
            onClick={fechar(() => a.aoRecusar(p, motivo.trim()))}
          >
            Recusar pedido
          </Button>
        </>
      );
    } else if (podeClassificar && (mudouClasse || p.status === "recebido")) {
      acao = (
        <Button
          className={amarelo}
          disabled={!classValida}
          onClick={fechar(() => classe && a.aoClassificar(p, classe, horas ?? 0, nota.trim()))}
        >
          {classe === "adicional" ? "Salvar estimativa" : "Classificar e começar"}
        </Button>
      );
    } else if (
      p.status === "em_analise" &&
      p.classification === "adicional" &&
      p.client_decision !== "aprovado"
    ) {
      acao = (
        <Button className={amarelo} onClick={fechar(() => a.aoEnviar(p))}>
          Enviar ao cliente ({moeda(p.value_cents)})
        </Button>
      );
    } else if (p.status === "em_analise") {
      acao = (
        <Button className={amarelo} onClick={fechar(() => a.aoIniciar(p))}>
          Iniciar
        </Button>
      );
    } else if (p.status === "fazendo") {
      acao = (
        <Button className={amarelo} onClick={fechar(() => a.aoConcluir(p))}>
          Marcar como pronto
        </Button>
      );
    }
  }
  const podeRecusar = p !== null && !recusando && !["pronto", "recusado"].includes(p.status);

  return (
    <PainelLateral
      aberto={p !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo={p ? `${p.code} · ${p.title}` : "Pedido"}
      descricao={p ? `${p.company_name}${p.project_name ? ` · ${p.project_name}` : ""}` : undefined}
      rodape={
        acao || podeRecusar ? (
          <>
            {podeRecusar && (
              <Button
                variant="outline"
                className="h-11 sm:mr-auto"
                onClick={() => setRecusando(true)}
              >
                Recusar
              </Button>
            )}
            {acao}
          </>
        ) : undefined
      }
    >
      {p && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Selo tom={tomSituacaoPedido[p.status]}>{rotuloSituacaoPedido[p.status]}</Selo>
            <span className="text-[13.5px] text-hub-suave">
              {rotuloOrigem[p.origin]} · {diaComHora(p.created_at)}
            </span>
          </div>
          {p.description && <p className="whitespace-pre-line text-[15px]">{p.description}</p>}
          {p.project_id && (
            <Link
              to="/app/projetos/$id"
              params={{ id: p.project_id }}
              className="inline-flex min-h-11 items-center self-start text-[14.5px] font-medium text-[#1E3FA8] underline"
            >
              Abrir o projeto
            </Link>
          )}

          {p.client_decision && (
            <p
              className={cn(
                "rounded-xl p-4 text-[14.5px]",
                p.client_decision === "aprovado"
                  ? "bg-sit-ok text-sit-ok-t"
                  : "bg-sit-risco text-sit-risco-t",
              )}
            >
              Cliente {p.client_decision === "aprovado" ? "aprovou" : "recusou"} o serviço adicional
              {p.decided_at ? ` em ${diaComHora(p.decided_at)}` : ""}.
              {p.decision_note ? ` "${p.decision_note}"` : ""}
            </p>
          )}
          {p.status === "aguardando_cliente" && (
            <p className="rounded-xl bg-sit-info p-4 text-[14.5px] text-sit-info-t">
              Enviado ao cliente: {p.hours_estimated?.toLocaleString("pt-BR")} h ·{" "}
              {moeda(p.value_cents)}. Ele decide no portal; nada começa antes da resposta.
            </p>
          )}
          {p.status === "recusado" && p.owner_note && (
            <p className="rounded-xl bg-sit-risco p-4 text-[14.5px] text-sit-risco-t">
              Motivo: {p.owner_note}
            </p>
          )}

          {recusando ? (
            <CampoArea
              rotulo="Motivo (o cliente vê no portal)"
              valor={motivo}
              aoMudar={setMotivo}
              maxLength={1000}
              linhas={3}
            />
          ) : podeClassificar ? (
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-[14px] font-medium">1. Classificar</legend>
                {(["escopo", "mensalidade", "adicional"] as const).map((c) => (
                  <label
                    key={c}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5",
                      classe === c ? "border-hub-tinta bg-hub-fundo" : "border-hub-borda",
                    )}
                  >
                    <input
                      type="radio"
                      name="classificacao"
                      checked={classe === c}
                      onChange={() => setClasse(c)}
                      className="size-4 accent-[#0E1013]"
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">{rotuloClassificacao[c]}</span>
                      <span className="text-[13px] text-hub-suave">
                        {c === "escopo"
                          ? "Estava na proposta: começa já."
                          : c === "mensalidade"
                            ? "Usa as horas do plano: começa já."
                            : "Fora do combinado: o cliente aprova o valor antes."}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <CampoNumero
                rotulo={classe === "adicional" ? "2. Estimar horas" : "Horas estimadas (opcional)"}
                valor={horas}
                aoMudar={setHoras}
                sufixo="h"
                ajuda={
                  previa !== null
                    ? `Valor: ${moeda(previa)} (${moeda(horaCents)} por hora, mínimo 1 h). O banco confirma ao salvar.`
                    : undefined
                }
              />
              <CampoArea
                rotulo="Nota para o cliente (opcional)"
                valor={nota}
                aoMudar={setNota}
                maxLength={1000}
                linhas={2}
              />
            </div>
          ) : (
            p.classification && (
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-hub-fundo p-4 text-[14.5px]">
                <div>
                  <dt className="text-hub-suave">Classificação</dt>
                  <dd className="font-medium">{rotuloClassificacao[p.classification]}</dd>
                </div>
                <div>
                  <dt className="text-hub-suave">Horas · valor</dt>
                  <dd className="font-medium tabular-nums">
                    {p.hours_estimated?.toLocaleString("pt-BR") ?? "—"} h
                    {p.value_cents ? ` · ${moeda(p.value_cents)}` : ""}
                  </dd>
                </div>
              </dl>
            )
          )}
        </div>
      )}
    </PainelLateral>
  );
}
