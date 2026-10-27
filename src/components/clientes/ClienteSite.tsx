import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesSitesCliente,
  criarSiteDoCliente,
  definirSiteDoCliente,
  mensagemDoSiteCliente,
  modulosSite,
  sitesDoHub,
  type ModuloSite,
  type SiteDoHub,
} from "@/lib/sitesCliente";

const NOVO = "novo";

/**
 * Site do cliente (card PC-1): o Yuri liga um site a este cliente e escolhe os módulos.
 * Os módulos montam o menu do painel do cliente.
 */
export function ClienteSite({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const sites = useQuery({ queryKey: chavesSitesCliente.hub, queryFn: sitesDoHub });
  const ligado = sites.data?.find((s) => s.client_id === clienteId) ?? null;
  const livres = (sites.data ?? []).filter((s) => s.client_id === null);

  const [escolha, setEscolha] = useState<string>("");
  const [nome, setNome] = useState("");
  const [dominio, setDominio] = useState("");
  const [modulos, setModulos] = useState<ModuloSite[]>(["paginas", "contatos"]);
  const [noAr, setNoAr] = useState(true);

  useEffect(() => {
    setModulos(ligado?.modulos ?? ["paginas", "contatos"]);
    setNoAr(ligado?.no_ar ?? true);
  }, [ligado]);

  const falhou = (e: unknown) => mensagemDoSiteCliente(e) ?? mensagemDeErro(e);
  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: chavesSitesCliente.hub });
  };

  const salvar = useMutation({
    mutationFn: async (v: { siteId: string; clienteId: string | null }) => {
      if (v.siteId === NOVO)
        return criarSiteDoCliente({
          clienteId,
          nome: nome.trim(),
          dominio: dominio.trim(),
          modulos,
          noAr,
        });
      return definirSiteDoCliente({ ...v, modulos, noAr });
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chavesSitesCliente.hub });
      const antes = qc.getQueryData<SiteDoHub[]>(chavesSitesCliente.hub);
      if (antes && v.siteId !== NOVO)
        qc.setQueryData<SiteDoHub[]>(
          chavesSitesCliente.hub,
          antes.map((s) =>
            s.id === v.siteId ? { ...s, client_id: v.clienteId, modulos, no_ar: noAr } : s,
          ),
        );
      return { antes };
    },
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesSitesCliente.hub, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => salvar.mutate(v) });
    },
    onSuccess: (_r, v) => {
      ok(v.clienteId ? "Site do cliente salvo." : "Site desligado deste cliente.");
      setEscolha("");
      setNome("");
      setDominio("");
    },
    onSettled: recarregar,
  });

  const alternar = (m: ModuloSite) =>
    setModulos((atual) => (atual.includes(m) ? atual.filter((x) => x !== m) : [...atual, m]));
  const novoValido = nome.trim().length >= 2 && /\.[a-z]{2,}/i.test(dominio);
  const podeSalvar =
    !salvar.isPending && (ligado !== null || (escolha === NOVO ? novoValido : escolha !== ""));

  return (
    <section
      aria-labelledby="site-cliente-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="site-cliente-t" className="font-titulo text-lg font-bold">
          Site no painel do cliente
        </h2>
        <p className="text-[14px] text-hub-suave">
          Os módulos escolhidos montam o menu que o cliente vê no portal.
        </p>
      </div>

      {sites.isError ? (
        <button
          type="button"
          className={classeBotaoSecundario}
          onClick={() => void sites.refetch()}
        >
          Não carregou. Tentar de novo
        </button>
      ) : sites.isPending ? (
        <div className="h-24 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : (
        <>
          {ligado ? (
            <p className="text-[15px]">
              <b className="font-semibold">{ligado.nome}</b>{" "}
              <span className="text-hub-suave">· {ligado.dominio}</span>
            </p>
          ) : (
            <>
              <CampoEscolha
                rotulo="Site"
                valor={escolha}
                aoMudar={setEscolha}
                vazio="Escolha o site"
                opcoes={[
                  ...livres.map((s) => ({ id: s.id, rotulo: `${s.nome} · ${s.dominio}` })),
                  { id: NOVO, rotulo: "Cadastrar site novo" },
                ]}
              />
              {escolha === NOVO && (
                <div className="flex flex-col gap-3">
                  <CampoTexto
                    rotulo="Nome do site"
                    valor={nome}
                    aoMudar={setNome}
                    maxLength={120}
                  />
                  <CampoTexto
                    rotulo="Domínio"
                    valor={dominio}
                    aoMudar={setDominio}
                    maxLength={253}
                    inputMode="url"
                    autoComplete="off"
                    placeholder="exemplo.com.br"
                  />
                </div>
              )}
            </>
          )}

          {(ligado || escolha) && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-[14px] font-medium">Módulos contratados</legend>
              {modulosSite.map((m) => (
                <label
                  key={m.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-hub-fundo"
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-hub-tinta"
                    checked={modulos.includes(m.id)}
                    onChange={() => alternar(m.id)}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[15px]">{m.rotulo}</span>
                    <span className="text-[13px] text-hub-suave">{m.ajuda}</span>
                  </span>
                </label>
              ))}
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-hub-fundo">
                <input
                  type="checkbox"
                  className="size-5 accent-hub-tinta"
                  checked={noAr}
                  onChange={(e) => setNoAr(e.target.checked)}
                />
                <span className="text-[15px]">O site já está no ar</span>
              </label>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-2">
            {(ligado || escolha) && (
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-xl bg-hub-tinta px-4 text-[15px] font-semibold text-white hover:bg-[#2A2E35] disabled:opacity-50"
                disabled={!podeSalvar}
                onClick={() =>
                  salvar.mutate({ siteId: ligado?.id ?? escolha, clienteId: clienteId })
                }
              >
                Salvar
              </button>
            )}
            {ligado && (
              <button
                type="button"
                className={classeBotaoSecundario}
                disabled={salvar.isPending}
                onClick={() => salvar.mutate({ siteId: ligado.id, clienteId: null })}
              >
                Desligar o site
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
