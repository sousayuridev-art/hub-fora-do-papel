import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { EnviarFotoBotao } from "@/components/catalogo/EnviarFotoBotao";
import { useMutacoesCatalogo } from "@/components/catalogo/useMutacoesCatalogo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import {
  chavesCatalogo,
  listarCategorias,
  urlDaFoto,
  type CategoriaCatalogo,
} from "@/lib/catalogo";
import { classeBotaoSecundario } from "@/lib/estilos";

function Linha({ c, siteId }: { c: CategoriaCatalogo; siteId: string }) {
  const m = useMutacoesCatalogo(siteId);
  const [nome, setNome] = useState(c.nome);
  const foto = urlDaFoto(c.foto);
  const mudouNome = nome.trim() !== c.nome && nome.trim().length >= 2;
  return (
    <li className="flex flex-col gap-3 border-t border-[#EEF1F5] p-4 first:border-t-0 sm:flex-row sm:items-center">
      {foto ? (
        <img
          src={foto}
          alt=""
          className="h-16 w-24 shrink-0 rounded-lg bg-[#F5F7FA] object-cover"
        />
      ) : (
        <span className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-[#F5F7FA] text-[12.5px] text-hub-suave">
          sem capa
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label className="sr-only" htmlFor={`cat-${c.id}`}>
          Nome da categoria
        </label>
        <div className="flex gap-2">
          <input
            id={`cat-${c.id}`}
            value={nome}
            maxLength={60}
            onChange={(e) => setNome(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
          />
          {mudouNome && (
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => m.categoria.mutate({ id: c.id, nome: nome.trim(), foto: c.foto })}
            >
              Salvar
            </button>
          )}
        </div>
        <span className="text-[13px] text-hub-suave">
          {c.produtos} {c.produtos === 1 ? "produto" : "produtos"} · endereço /{c.slug}
          {c.produtos === 0 && " · aparece vazia no site"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <EnviarFotoBotao
          siteId={siteId}
          maiorLado={800}
          rotulo={c.foto ? "Trocar capa" : "Enviar capa"}
          aoEnviar={(caminho) => m.categoria.mutate({ id: c.id, nome: c.nome, foto: caminho })}
        />
        <button
          type="button"
          disabled={c.produtos > 0}
          title={c.produtos > 0 ? "Só dá para apagar categoria sem produtos" : undefined}
          onClick={() => m.apagarCat.mutate(c)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-sit-risco-t hover:bg-sit-risco disabled:cursor-not-allowed disabled:text-hub-suave disabled:hover:bg-transparent md:min-h-10"
        >
          <Trash2 className="size-4" aria-hidden="true" /> Apagar
        </button>
      </div>
      {c.produtos > 0 && (
        <span className="sr-only">Para apagar, mova ou apague os produtos dela.</span>
      )}
    </li>
  );
}

/** Categorias do catálogo (HUB-CG-03): renomear, capa (até 800 px), criar e apagar só vazia. */
export function CatalogoCategorias({ siteId }: { siteId: string }) {
  const q = useQuery({
    queryKey: chavesCatalogo.categorias(siteId),
    queryFn: () => listarCategorias(siteId),
  });
  const m = useMutacoesCatalogo(siteId);
  const [nova, setNova] = useState("");
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar as categorias"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nova.trim().length < 2) return;
          m.categoria.mutate({ nome: nova.trim(), foto: null }, { onSuccess: () => setNova("") });
        }}
      >
        <label className="sr-only" htmlFor="nova-categoria">
          Nova categoria
        </label>
        <input
          id="nova-categoria"
          value={nova}
          maxLength={60}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova categoria (ex.: Camisas polo)"
          className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] bg-white px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
        />
        <button
          type="submit"
          className={classeBotaoSecundario}
          disabled={m.categoria.isPending || nova.trim().length < 2}
        >
          Criar
        </button>
      </form>
      {!q.data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : q.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma categoria ainda.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
          {q.data.map((c) => (
            <Linha key={`${c.id}-${c.nome}`} c={c} siteId={siteId} />
          ))}
        </ul>
      )}
      <p className="text-[13px] text-hub-suave">Só dá para apagar uma categoria sem produtos.</p>
    </div>
  );
}
