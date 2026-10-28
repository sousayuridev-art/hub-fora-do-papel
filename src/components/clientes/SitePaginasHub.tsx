import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { CampoTexto } from "@/components/hub/Campo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesPaginas,
  criarPagina,
  definirSecoes,
  mensagemDaPagina,
  paginasDoSite,
  secoesDoSite,
  type SecaoPermitida,
} from "@/lib/paginasCliente";
import { sobreAsSecoes, tiposDeSecao, type TipoSecao } from "@/secoes/config";

type Escolha = Record<TipoSecao, "nao" | "livre" | "fixa">;

/**
 * Hub › ficha do cliente (card PC-4): páginas do site do cliente e quais seções ele pode usar.
 * "Fixa" = o cliente edita os textos, mas a seção não sai do lugar.
 */
export function SitePaginasHub({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const paginas = useQuery({
    queryKey: chavesPaginas.doSite(siteId),
    queryFn: () => paginasDoSite(siteId),
  });
  const secoes = useQuery({
    queryKey: chavesPaginas.secoes(siteId),
    queryFn: () => secoesDoSite(siteId),
  });
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [nome, setNome] = useState("");
  const [caminho, setCaminho] = useState("/");
  const falhou = (e: unknown) => mensagemDaPagina(e) ?? mensagemDeErro(e);

  useEffect(() => {
    if (!secoes.data) return;
    const e = Object.fromEntries(tiposDeSecao.map((t) => [t, "nao"])) as Escolha;
    for (const s of secoes.data)
      if (s.tipo in e) e[s.tipo as TipoSecao] = s.travada ? "fixa" : "livre";
    setEscolha(e);
  }, [secoes.data]);

  const salvarSecoes = useMutation({
    mutationFn: (e: Escolha) =>
      definirSecoes(
        siteId,
        tiposDeSecao
          .filter((t) => e[t] !== "nao")
          .map((t): SecaoPermitida => ({ tipo: t, travada: e[t] === "fixa" })),
      ),
    onMutate: async (e) => {
      const chave = chavesPaginas.secoes(siteId);
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<SecaoPermitida[]>(chave);
      qc.setQueryData<SecaoPermitida[]>(
        chave,
        tiposDeSecao
          .filter((t) => e[t] !== "nao")
          .map((t) => ({ tipo: t, travada: e[t] === "fixa" })),
      );
      return { antes };
    },
    onSuccess: () => ok("Seções do site salvas."),
    onError: (err, e, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesPaginas.secoes(siteId), ctx.antes);
      erro(falhou(err), { tentarDeNovo: () => salvarSecoes.mutate(e) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesPaginas.secoes(siteId) }),
  });

  const nova = useMutation({
    mutationFn: () => criarPagina(siteId, nome.trim(), caminho.trim()),
    onSuccess: (p) => {
      ok("Página criada. Monte as seções e publique para liberar ao cliente.");
      setNome("");
      setCaminho("/");
      void navigate({ to: "/app/paginas/$id", params: { id: p.id } });
    },
    onError: (e) => erro(falhou(e), { tentarDeNovo: () => nova.mutate() }),
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesPaginas.doSite(siteId) }),
  });

  return (
    <div className="flex flex-col gap-5 border-t border-hub-borda pt-4">
      <section aria-labelledby="paginas-t" className="flex flex-col gap-3">
        <h3 id="paginas-t" className="text-[15px] font-semibold">
          Páginas do site
        </h3>
        {paginas.isError ? (
          <button
            type="button"
            className={classeBotaoSecundario}
            onClick={() => void paginas.refetch()}
          >
            Não carregou. Tentar de novo
          </button>
        ) : !paginas.data ? (
          <div className="h-16 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
        ) : paginas.data.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Nenhuma página ainda. O cliente vê "peça à Fora do Papel" até você criar e publicar a
            primeira.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {paginas.data.map((p) => (
              <li key={p.id}>
                <Link
                  to="/app/paginas/$id"
                  params={{ id: p.id }}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 hover:bg-hub-fundo"
                >
                  <span className="min-w-0 truncate text-[15px]">
                    {p.nome} <span className="text-hub-suave">· {p.caminho}</span>
                  </span>
                  <span
                    className={
                      p.publicado_em
                        ? "text-[13px] text-[#145A37]"
                        : "text-[13px] text-sit-atencao-t"
                    }
                  >
                    {p.publicado_em ? "No ar" : "Não publicada"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <CampoTexto
            className="sm:flex-1"
            rotulo="Nova página"
            valor={nome}
            aoMudar={setNome}
            maxLength={60}
            placeholder="Página inicial"
          />
          <CampoTexto
            className="sm:w-36"
            rotulo="Endereço"
            valor={caminho}
            aoMudar={setCaminho}
            maxLength={120}
            autoComplete="off"
          />
          <button
            type="button"
            className={classeBotaoSecundario}
            disabled={nome.trim().length < 2 || !caminho.startsWith("/") || nova.isPending}
            onClick={() => nova.mutate()}
          >
            <Plus className="size-4" aria-hidden="true" /> Criar
          </button>
        </div>
      </section>

      <section aria-labelledby="secoes-t" className="flex flex-col gap-2">
        <h3 id="secoes-t" className="text-[15px] font-semibold">
          Seções que o cliente pode usar
        </h3>
        {!escolha ? (
          <div className="h-24 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {tiposDeSecao.map((t) => (
                <li key={t} className="flex min-h-11 items-center justify-between gap-3">
                  <span className="text-[15px]">{sobreAsSecoes[t].nome}</span>
                  <select
                    aria-label={`${sobreAsSecoes[t].nome}: o que o cliente pode fazer`}
                    value={escolha[t]}
                    onChange={(ev) =>
                      setEscolha({ ...escolha, [t]: ev.target.value as Escolha[TipoSecao] })
                    }
                    className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[14.5px]"
                  >
                    <option value="nao">Não usa</option>
                    <option value="livre">Adiciona e edita</option>
                    <option value="fixa">Fixa (só edita o texto)</option>
                  </select>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${classeBotaoSecundario} self-start`}
              disabled={salvarSecoes.isPending}
              onClick={() => salvarSecoes.mutate(escolha)}
            >
              Salvar seções
            </button>
          </>
        )}
      </section>
    </div>
  );
}
