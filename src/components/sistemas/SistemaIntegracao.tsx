import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plug, Unplug } from "lucide-react";

import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { haQuanto } from "@/lib/sitesHub";
import {
  chavesPedidoSistema,
  enderecoDaFuncao,
  gerarChave,
  integracaoDoSistema,
  mensagemDoPedidoSistema,
  revogarChave,
} from "@/lib/pedidosSistema";

function Copiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <button
      type="button"
      className={`${classeAcaoTexto} shrink-0 gap-1.5`}
      onClick={() =>
        void navigator.clipboard
          ?.writeText(valor)
          .then(() => ok(`${rotulo} copiado.`))
          .catch(() => erro("Não foi possível copiar. Selecione o texto e copie."))
      }
    >
      <Copy className="size-4" aria-hidden="true" /> Copiar
    </button>
  );
}

/**
 * Integração do sistema com o Hub (card SIS-2): a chave que o sistema do cliente usa para mandar
 * os pedidos de ajuste para cá. A chave aparece uma vez só; o Hub guarda só a impressão digital.
 */
export function SistemaIntegracao({
  sistemaId,
  clienteId,
}: {
  sistemaId: string;
  clienteId: string;
}) {
  const qc = useQueryClient();
  const chave = chavesPedidoSistema.integracao(sistemaId);
  const q = useQuery({ queryKey: chave, queryFn: () => integracaoDoSistema(sistemaId) });
  const [nova, setNova] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"trocar" | "desligar" | null>(null);
  const endereco = enderecoDaFuncao();

  const gerar = useMutation({
    mutationFn: () => gerarChave(sistemaId),
    onSuccess: (r) => {
      setNova(r.chave);
      setConfirmar(null);
      ok("Chave gerada. Copie agora: ela não aparece de novo.");
    },
    onError: (e) => erro(mensagemDoPedidoSistema(e) ?? mensagemDeErro(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });
  const desligar = useMutation({
    mutationFn: () => revogarChave(sistemaId),
    onSuccess: () => {
      setNova(null);
      setConfirmar(null);
      ok("Integração desligada. O sistema não manda mais pedidos para o Hub.");
    },
    onError: (e) => erro(mensagemDoPedidoSistema(e) ?? mensagemDeErro(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  const i = q.data;

  return (
    <section aria-labelledby="integracao-t" className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="integracao-t" className="font-titulo text-lg font-bold">
          Pedidos de ajuste pelo sistema
        </h2>
        <p className="text-[14.5px] text-hub-suave">
          Com a integração ligada, quem usa o sistema abre o pedido lá mesmo, na tela de
          Solicitações, e ele chega aqui em Pedidos de ajuste. Você responde no Hub, e a resposta e
          a situação aparecem para a equipe do cliente no sistema.
        </p>
      </div>

      {q.isError ? (
        <p className="text-[14px] text-sit-risco-t">
          Não foi possível carregar a integração.{" "}
          <button type="button" className="min-h-11 underline" onClick={() => void q.refetch()}>
            Tentar de novo
          </button>
        </p>
      ) : !i ? (
        <div className="h-28 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                i.ligada
                  ? "inline-flex items-center gap-1.5 rounded-full bg-sit-ok px-2.5 py-0.5 text-[13px] font-medium text-sit-ok-t"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#F1F1EC] px-2.5 py-0.5 text-[13px] font-medium text-[#2A2D33]"
              }
            >
              {i.ligada ? (
                <Plug className="size-3.5" aria-hidden="true" />
              ) : (
                <Unplug className="size-3.5" aria-hidden="true" />
              )}
              {i.ligada ? "Ligada" : "Desligada"}
            </span>
            {i.ligada && (
              <span className="text-[13.5px] text-hub-suave">
                Chave {i.prefixo}… · criada em {i.criada_em ? diaComHora(i.criada_em) : "—"} ·
                último uso {i.ultimo_uso_em ? haQuanto(i.ultimo_uso_em).toLowerCase() : "ainda não"}
              </span>
            )}
          </div>

          {i.pedidos > 0 && (
            <Link
              to="/app/pedidos"
              search={{ cliente: clienteId }}
              className={`${classeAcaoTexto} self-start`}
            >
              {i.pedidos} {i.pedidos === 1 ? "pedido veio" : "pedidos vieram"} do sistema ·{" "}
              {i.abertos} {i.abertos === 1 ? "aberto" : "abertos"} ›
            </Link>
          )}

          {nova && (
            <div className="flex flex-col gap-3 rounded-xl bg-sit-atencao p-4 text-sit-atencao-t">
              <p className="text-[14px] font-semibold">
                Copie a chave agora. Ela não aparece de novo.
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-white/70 p-2">
                <code className="min-w-0 flex-1 break-all text-[13px] text-hub-tinta">{nova}</code>
                <Copiar valor={nova} rotulo="Chave" />
              </div>
              <p className="text-[13.5px]">
                Guarde nos segredos do projeto do sistema (no Lovable, em Cloud › Secrets), com o
                nome <b>HUB_CHAVE_SISTEMA</b>. Nunca no código, no chat ou no WhatsApp.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] text-hub-suave">
              Endereço do Hub (segredo <b>HUB_PEDIDOS_URL</b> no sistema)
            </span>
            <div className="flex items-center gap-2 rounded-lg bg-hub-fundo p-2">
              <code className="min-w-0 flex-1 break-all text-[13px]">{endereco}</code>
              <Copiar valor={endereco} rotulo="Endereço" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!i.ligada ? (
              <button
                type="button"
                className={classeBotaoSecundario}
                disabled={gerar.isPending}
                onClick={() => gerar.mutate()}
              >
                <KeyRound className="size-4" aria-hidden="true" />
                {gerar.isPending ? "Gerando…" : "Gerar chave e ligar"}
              </button>
            ) : confirmar === "trocar" ? (
              <button
                type="button"
                className="min-h-11 rounded-lg bg-hub-tinta px-3 text-[14px] font-semibold text-white"
                disabled={gerar.isPending}
                onClick={() => gerar.mutate()}
              >
                Confirmar: a chave atual para de valer agora
              </button>
            ) : confirmar === "desligar" ? (
              <button
                type="button"
                className="min-h-11 rounded-lg bg-[#9A1C12] px-3 text-[14px] font-semibold text-white"
                disabled={desligar.isPending}
                onClick={() => desligar.mutate()}
              >
                Confirmar: desligar a integração
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={classeBotaoSecundario}
                  onClick={() => setConfirmar("trocar")}
                >
                  <KeyRound className="size-4" aria-hidden="true" /> Trocar a chave
                </button>
                <button
                  type="button"
                  className={classeAcaoTexto}
                  onClick={() => setConfirmar("desligar")}
                >
                  <Unplug className="size-4" aria-hidden="true" /> Desligar
                </button>
              </>
            )}
            {confirmar && (
              <button type="button" className={classeAcaoTexto} onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
