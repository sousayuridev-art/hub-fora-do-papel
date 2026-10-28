import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  chavesPaginas,
  ehConflitoDePagina,
  mensagemDaPagina,
  publicarPagina,
  salvarRascunho,
  type DadosPagina,
  type PaginaCompleta,
} from "@/lib/paginasCliente";
import { erro, mensagemDeErro } from "@/lib/notify";

export type EstadoRascunho = "salvo" | "pendente" | "salvando" | "erro" | "conflito";

/**
 * Rascunho salvo sozinho (card PC-4): espera 1,2 s depois da última mudança e grava com a versão
 * que a pessoa abriu. Se outra pessoa salvou antes, para de gravar e avisa (conflito).
 * Sem rede, mantém a cópia na tela e oferece "Tentar de novo".
 */
export function useRascunho(pagina: PaginaCompleta) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoRascunho>("salvo");
  const [temRascunho, setTemRascunho] = useState(pagina.tem_rascunho);
  const versao = useRef(pagina.versao);
  const atual = useRef<DadosPagina>(pagina.rascunho);
  const gravado = useRef<DadosPagina>(pagina.rascunho);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conflito = useRef(false);

  const salvar = useMutation({
    mutationFn: (d: DadosPagina) => salvarRascunho(pagina.id, d, versao.current),
  });
  const publicar = useMutation({ mutationFn: () => publicarPagina(pagina.id, versao.current) });

  const gravar = useCallback(async (): Promise<boolean> => {
    if (conflito.current) return false;
    const enviando = atual.current;
    if (enviando === gravado.current) {
      setEstado("salvo");
      return true;
    }
    setEstado("salvando");
    try {
      const r = await salvar.mutateAsync(enviando);
      versao.current = r.versao;
      gravado.current = enviando;
      setTemRascunho(true);
      if (atual.current !== enviando) {
        setEstado("pendente");
        return gravar();
      }
      setEstado("salvo");
      return true;
    } catch (e) {
      if (ehConflitoDePagina(e)) {
        conflito.current = true;
        setEstado("conflito");
      } else {
        setEstado("erro");
        erro(mensagemDaPagina(e) ?? mensagemDeErro(e), { tentarDeNovo: () => void gravar() });
      }
      return false;
    }
  }, [salvar]);

  const mudou = useCallback(
    (d: DadosPagina) => {
      atual.current = d;
      if (conflito.current) return;
      setEstado("pendente");
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => void gravar(), 1200);
    },
    [gravar],
  );

  /** Grava o que falta antes de publicar ou sair. */
  const garantir = useCallback(async () => {
    if (relogio.current) clearTimeout(relogio.current);
    return gravar();
  }, [gravar]);

  // Saindo do editor: grava o que falta sem esperar e descarta a cópia guardada da página,
  // para quem reabrir receber a versão nova (e não um falso "alterada por outra pessoa").
  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      const pendente = !conflito.current && atual.current !== gravado.current;
      const fim = pendente
        ? salvarRascunho(pagina.id, atual.current, versao.current).then(
            () => undefined,
            (e: unknown) => {
              erro(
                `A última mudança da página não foi salva. ${mensagemDaPagina(e) ?? mensagemDeErro(e)}`,
              );
            },
          )
        : Promise.resolve();
      void fim.finally(() => {
        void qc.invalidateQueries({ queryKey: chavesPaginas.pagina(pagina.id) });
        void qc.invalidateQueries({ queryKey: chavesPaginas.doSite(pagina.site_id) });
      });
    },
    [pagina.id, pagina.site_id, qc],
  );

  async function aoPublicar(): Promise<boolean> {
    if (!(await garantir())) return false;
    try {
      await publicar.mutateAsync();
      setTemRascunho(false);
      void qc.invalidateQueries({ queryKey: chavesPaginas.doSite(pagina.site_id) });
      return true;
    } catch (e) {
      erro(mensagemDaPagina(e) ?? mensagemDeErro(e), { tentarDeNovo: () => void aoPublicar() });
      return false;
    }
  }

  return {
    estado,
    temRascunho,
    mudou,
    garantir,
    publicar: aoPublicar,
    publicando: publicar.isPending,
    textoAtual: () => atual.current,
  };
}
