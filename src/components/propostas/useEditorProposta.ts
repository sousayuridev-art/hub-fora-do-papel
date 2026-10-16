import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro } from "@/lib/notify";
import {
  chavesPropostas,
  mensagemDaProposta,
  salvarProposta,
  type DetalheProposta,
  type DocProposta,
} from "@/lib/propostas";

export type EstadoSalvamento = "salvo" | "pendente" | "salvando" | "erro";

/**
 * Salvamento automático do rascunho.
 * - A tela muda na hora (otimista); as mudanças se juntam e vão ao banco 700 ms depois.
 * - Um salvamento por vez, com a versão devolvida pelo anterior (o banco recusa versão antiga).
 * - A conta (total, parcelas, pendências) volta do banco e substitui a da tela.
 * - Se falhar, o texto digitado fica na tela e o aviso oferece "Tentar de novo".
 */
export function useEditorProposta(detalhe: DetalheProposta) {
  const qc = useQueryClient();
  const id = detalhe.proposta.id;
  const versao = useRef(detalhe.proposta.updated_at);
  const fila = useRef<DocProposta>({});
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emAndamento = useRef(false);
  const [estado, setEstado] = useState<EstadoSalvamento>("salvo");

  // Nova proposta aberta (ou recarregada de fora): adota a versão do banco.
  useEffect(() => {
    if (!emAndamento.current && Object.keys(fila.current).length === 0) {
      versao.current = detalhe.proposta.updated_at;
    }
  }, [detalhe.proposta.updated_at]);

  const enviarFila = useCallback(async () => {
    if (emAndamento.current) return;
    const doc = fila.current;
    if (Object.keys(doc).length === 0) return;
    fila.current = {};
    emAndamento.current = true;
    setEstado("salvando");
    try {
      const r = await salvarProposta(id, versao.current, doc);
      versao.current = r.versao;
      qc.setQueryData<DetalheProposta>(chavesPropostas.detalhe(id), (atual) =>
        atual
          ? {
              ...atual,
              calculo: r.calculo,
              proposta: {
                ...atual.proposta,
                updated_at: r.versao,
                total_cents: r.calculo.total_cents,
              },
            }
          : atual,
      );
      void qc.invalidateQueries({ queryKey: chavesPropostas.lista });
      void qc.invalidateQueries({ queryKey: chavesPropostas.resumo });
      setEstado(Object.keys(fila.current).length ? "pendente" : "salvo");
    } catch (e) {
      // Devolve o que não foi salvo para a fila (sem perder o que chegou depois).
      fila.current = { ...doc, ...fila.current };
      setEstado("erro");
      const msg = mensagemDaProposta(e) ?? mensagemDeErro(e);
      erro(`Não salvou: ${msg}`, { tentarDeNovo: () => void enviarFila() });
    } finally {
      emAndamento.current = false;
      if (Object.keys(fila.current).length && relogio.current === null) {
        relogio.current = setTimeout(() => {
          relogio.current = null;
          void enviarFila();
        }, 700);
      }
    }
  }, [id, qc]);

  /** Muda campos do documento: tela na hora, banco em seguida. */
  const mudar = useCallback(
    (doc: DocProposta) => {
      fila.current = { ...fila.current, ...doc };
      setEstado("pendente");
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => {
        relogio.current = null;
        void enviarFila();
      }, 700);
    },
    [enviarFila],
  );

  /** Salva já (antes de enviar a proposta). Devolve a versão mais nova. */
  const salvarAgora = useCallback(async () => {
    if (relogio.current) {
      clearTimeout(relogio.current);
      relogio.current = null;
    }
    while (emAndamento.current) await new Promise((r) => setTimeout(r, 80));
    await enviarFila();
    return { versao: versao.current, ok: Object.keys(fila.current).length === 0 };
  }, [enviarFila]);

  // Ao sair da tela, não deixa mudança para trás.
  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      if (Object.keys(fila.current).length) void enviarFila();
    },
    [enviarFila],
  );

  return { mudar, salvarAgora, estado };
}
