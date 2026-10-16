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

export type EstadoSalvamento = "salvo" | "pendente" | "salvando" | "erro" | "conflito";

const maisNova = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();

/**
 * Salvamento automático do rascunho.
 * - A tela muda na hora (otimista); as mudanças se juntam e vão ao banco 700 ms depois.
 * - Um salvamento por vez, com a versão devolvida pelo anterior (o banco recusa versão antiga).
 * - A conta (total, parcelas, pendências) volta do banco e substitui a da tela.
 * - Se falhar, o texto fica na tela e o aviso oferece "Tentar de novo" (sem repetir sozinho).
 * - Se a proposta mudou em outra aba, para de salvar e pede para recarregar.
 */
export function useEditorProposta(detalhe: DetalheProposta) {
  const qc = useQueryClient();
  const id = detalhe.proposta.id;
  const versao = useRef(detalhe.proposta.updated_at);
  const fila = useRef<DocProposta>({});
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emAndamento = useRef(false);
  const conflito = useRef(false);
  const [estado, setEstado] = useState<EstadoSalvamento>("salvo");

  const pendente = () => emAndamento.current || Object.keys(fila.current).length > 0;

  /** Adota a versão do banco, só se for mais nova (um recarregamento antigo não volta a versão). */
  const adotarVersao = useCallback((v: string) => {
    if (maisNova(v, versao.current)) versao.current = v;
  }, []);

  useEffect(() => {
    if (!pendente()) adotarVersao(detalhe.proposta.updated_at);
  }, [detalhe.proposta.updated_at, adotarVersao]);

  const enviarFila = useCallback(async () => {
    if (emAndamento.current || conflito.current) return;
    const doc = fila.current;
    if (Object.keys(doc).length === 0) return;
    fila.current = {};
    emAndamento.current = true;
    setEstado("salvando");
    let falhou = false;
    try {
      await qc.cancelQueries({ queryKey: chavesPropostas.detalhe(id) });
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
      falhou = true;
      // Devolve o que não foi salvo para a fila (sem perder o que chegou depois).
      fila.current = { ...doc, ...fila.current };
      const texto =
        e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
      if (texto.includes("versao_desatualizada") || texto.includes("proposta_nao_e_rascunho")) {
        conflito.current = true;
        setEstado("conflito");
        erro(
          "Esta proposta mudou em outra aba. Recarregue a página; o que você digitou aqui por último não foi salvo.",
          {
            tentarDeNovo: () => window.location.reload(),
          },
        );
      } else {
        setEstado("erro");
        erro(`Não salvou: ${mensagemDaProposta(e) ?? mensagemDeErro(e)}`, {
          tentarDeNovo: () => void enviarFila(),
        });
      }
    } finally {
      emAndamento.current = false;
      // Só continua sozinho depois de um sucesso; depois de erro, espera "Tentar de novo" ou nova digitação.
      if (!falhou && Object.keys(fila.current).length && relogio.current === null) {
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
      if (conflito.current) return;
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
    return {
      versao: versao.current,
      ok: !conflito.current && Object.keys(fila.current).length === 0,
    };
  }, [enviarFila]);

  // Fechar a aba com mudança ainda não salva: o navegador pergunta antes.
  useEffect(() => {
    const avisar = (ev: BeforeUnloadEvent) => {
      if (pendente()) ev.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  // Ao sair da tela, não deixa mudança para trás.
  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      if (Object.keys(fila.current).length) void enviarFila();
    },
    [enviarFila],
  );

  return { mudar, salvarAgora, adotarVersao, estado };
}
