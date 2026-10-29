import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CampoTexto } from "@/components/hub/Campo";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { chavesClientes } from "@/lib/funil";
import { diaComHora } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesMarketing,
  definirOrigemDoCliente,
  mensagemDoMarketing,
  origemDoCliente,
  versoesPublicadas,
  type OrigemCliente,
  type VersaoPublicada,
} from "@/lib/marketing";

const falhou = (e: unknown) => {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
  if (m.includes("versao_nao_publicada")) return "Escolha uma peça que já foi publicada.";
  return mensagemDoMarketing(e) ?? mensagemDeErro(e);
};

/**
 * Peça de origem do cliente (MK-4): automática quando o contato veio pelo link com rastreio;
 * à mão quando a pessoa chegou pelo direct ou pelo WhatsApp dizendo que viu um post.
 */
export function ClientePecaDeOrigem({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const chave = chavesMarketing.origemCliente(clienteId);
  const origem = useQuery({ queryKey: chave, queryFn: () => origemDoCliente(clienteId) });
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState("");
  const opcoes = useQuery({
    queryKey: chavesMarketing.publicadas(busca.trim()),
    queryFn: () => versoesPublicadas(busca.trim()),
    enabled: escolhendo,
    placeholderData: keepPreviousData,
  });

  const definir = useMutation({
    mutationFn: (v: VersaoPublicada | null) =>
      definirOrigemDoCliente(clienteId, v?.versao_id ?? null),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<OrigemCliente>(chave);
      qc.setQueryData<OrigemCliente>(chave, { manual: v !== null, peca: v });
      setEscolhendo(false);
      return { antes };
    },
    onError: (e, v, ctx) => {
      qc.setQueryData(chave, ctx?.antes);
      erro(falhou(e), { tentarDeNovo: () => definir.mutate(v) });
    },
    onSuccess: (_r, v) => ok(v ? "Peça de origem salva." : "Peça de origem removida."),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: chave }),
        // A ficha muda de versão no banco: a edição do cliente precisa da versão nova.
        qc.invalidateQueries({ queryKey: chavesClientes.ficha(clienteId) }),
        qc.invalidateQueries({ queryKey: chavesMarketing.todosResultados }),
        qc.invalidateQueries({ queryKey: chavesMarketing.todosDestaques }),
        qc.invalidateQueries({ queryKey: chavesMarketing.detalhes }),
      ]),
  });

  const o = origem.data;
  return (
    <section
      aria-labelledby="peca-origem-t"
      className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="peca-origem-t" className="font-titulo text-lg font-bold">
          Peça de origem
        </h2>
        <p className="text-[14px] text-hub-suave">Qual conteúdo das redes trouxe este cliente.</p>
      </div>

      {origem.isError ? (
        <button
          type="button"
          className={classeBotaoSecundario}
          onClick={() => void origem.refetch()}
        >
          Tentar carregar de novo
        </button>
      ) : !o ? (
        <div className="h-12 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : o.peca ? (
        <div className="flex flex-col gap-1 rounded-xl bg-hub-fundo p-3 text-[14px]">
          <Link
            to="/app/marketing"
            search={{ peca: o.peca.peca_id }}
            className="font-semibold text-hub-tinta hover:underline"
          >
            {o.peca.titulo}
          </Link>
          <span className="text-[13px] text-hub-suave">
            {o.peca.canal_nome ?? o.peca.canal}
            {o.peca.publicada_em ? ` · publicada em ${diaComHora(o.peca.publicada_em)}` : ""}
            {o.manual ? " · marcada à mão" : " · veio pelo link da peça"}
          </span>
        </div>
      ) : (
        <p className="text-[14px] text-hub-suave">Não informada.</p>
      )}

      {o && !escolhendo && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={classeAcaoTexto}
            onClick={() => setEscolhendo(true)}
            disabled={definir.isPending}
          >
            {o.peca ? "Trocar" : "Escolher a peça"}
          </button>
          {o.peca && (
            <button
              type="button"
              className={classeAcaoTexto}
              onClick={() => definir.mutate(null)}
              disabled={definir.isPending}
            >
              Remover
            </button>
          )}
        </div>
      )}

      {escolhendo && (
        <div className="flex flex-col gap-2">
          <CampoTexto
            rotulo="Buscar peça publicada"
            valor={busca}
            aoMudar={setBusca}
            placeholder="Título da peça ou código do link"
            maxLength={60}
          />
          {opcoes.isError ? (
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => void opcoes.refetch()}
            >
              Tentar de novo
            </button>
          ) : (opcoes.data ?? []).length === 0 ? (
            <p className="text-[13.5px] text-hub-suave">
              {opcoes.isFetching ? "Buscando…" : "Nenhuma peça publicada encontrada."}
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {(opcoes.data ?? []).map((v) => (
                <li key={v.versao_id}>
                  <button
                    type="button"
                    onClick={() => definir.mutate(v)}
                    className={`${classeAcaoTexto} w-full flex-col items-start bg-transparent py-1.5 text-left`}
                  >
                    <span>{v.titulo}</span>
                    <span className="text-[12.5px] font-normal text-hub-suave">
                      {v.canal_nome ?? v.canal} · {v.codigo}
                      {v.publicada_em ? ` · ${diaComHora(v.publicada_em)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={`${classeAcaoTexto} self-start`}
            onClick={() => setEscolhendo(false)}
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
