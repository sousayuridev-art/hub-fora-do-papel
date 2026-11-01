import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ImageOff, Plus, Search } from "lucide-react";

import { ProdutoPainel } from "@/components/catalogo/ProdutoPainel";
import { useMutacoesCatalogo } from "@/components/catalogo/useMutacoesCatalogo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { Selo } from "@/components/hub/Selo";
import {
  chavesCatalogo,
  lerConfig,
  listarCategorias,
  listarProdutos,
  rotuloSelo,
  urlDaFoto,
  type ProdutoCatalogo,
} from "@/lib/catalogo";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Produtos do catálogo (HUB-CG-02): lista virtualizada com foto, selo e preço; painel de edição. */
export function CatalogoProdutos({ siteId }: { siteId: string }) {
  const produtos = useQuery({
    queryKey: chavesCatalogo.produtos(siteId),
    queryFn: () => listarProdutos(siteId),
  });
  const categorias = useQuery({
    queryKey: chavesCatalogo.categorias(siteId),
    queryFn: () => listarCategorias(siteId),
  });
  const config = useQuery({
    queryKey: chavesCatalogo.config(siteId),
    queryFn: () => lerConfig(siteId),
  });
  const m = useMutacoesCatalogo(siteId);
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(semAcento(texto.trim()));
  const [aberto, setAberto] = useState<{ produto: ProdutoCatalogo | null } | null>(null);

  const nomeCategoria = useMemo(
    () => new Map((categorias.data ?? []).map((c) => [c.id, c.nome])),
    [categorias.data],
  );
  const itens = useMemo(
    () =>
      (produtos.data ?? []).filter(
        (p) => !termo || semAcento(`${p.codigo} ${p.nome} ${p.marca ?? ""}`).includes(termo),
      ),
    [produtos.data, termo],
  );
  const marcas = useMemo(
    () =>
      [
        ...new Set([
          ...(config.data?.marcas ?? []),
          ...(produtos.data ?? []).map((p) => p.marca ?? ""),
        ]),
      ]
        .filter(Boolean)
        .sort(),
    [config.data, produtos.data],
  );

  const { ref, margem } = useMargemDaLista<HTMLUListElement>();
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin: margem,
  });

  if (produtos.isError || categorias.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os produtos"
        aoTentarDeNovo={() => void (produtos.isError ? produtos.refetch() : categorias.refetch())}
      />
    );

  const semCategoria = categorias.data?.length === 0;
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#D9DEE5] bg-white px-3 focus-within:border-hub-tinta sm:w-80">
          <Search className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
          <span className="sr-only">Buscar produto</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nome, marca ou código"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none md:text-[15px]"
          />
        </label>
        <button
          type="button"
          className={classeAcaoPrincipal}
          disabled={semCategoria}
          onClick={() => setAberto({ produto: null })}
        >
          <Plus className="size-4" aria-hidden="true" /> Novo produto
        </button>
      </div>
      {semCategoria && (
        <p className="rounded-xl bg-sit-atencao p-3 text-[14px] text-sit-atencao-t">
          Crie uma categoria antes do primeiro produto (aba Categorias).
        </p>
      )}

      {!produtos.data || !categorias.data ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {produtos.data.length === 0
            ? "Nenhum produto ainda."
            : `Nada encontrado para "${texto}".`}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
          <ul ref={ref} className="relative" style={{ height: v.getTotalSize() }}>
            {v.getVirtualItems().map((l) => {
              const p = itens[l.index];
              if (!p) return null;
              const foto = urlDaFoto(p.fotos[0]);
              return (
                <li
                  key={p.id}
                  ref={v.measureElement}
                  data-index={l.index}
                  className="absolute inset-x-0 top-0 border-b border-[#EEF1F5]"
                  style={{ transform: `translateY(${l.start - v.options.scrollMargin}px)` }}
                >
                  <button
                    type="button"
                    onClick={() => setAberto({ produto: p })}
                    className="grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFC] focus-visible:bg-[#F9FAFC] focus-visible:outline-none"
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt=""
                        loading="lazy"
                        className="size-13 rounded-lg bg-[#F5F7FA] object-cover"
                      />
                    ) : (
                      <span className="grid size-13 place-items-center rounded-lg bg-[#F5F7FA] text-hub-suave">
                        <ImageOff className="size-5" aria-label="Sem foto" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <b className="truncate text-[14.5px] font-semibold">{p.nome}</b>
                        {p.selo && (
                          <Selo tom={p.selo === "promo" ? "atencao" : "info"} ponto={false}>
                            {rotuloSelo[p.selo]}
                            {p.selo === "promo" && p.promo_pct ? ` ${p.promo_pct}%` : ""}
                          </Selo>
                        )}
                      </span>
                      <span className="truncate text-[13px] text-hub-suave">
                        {[`#${p.codigo}`, p.marca, nomeCategoria.get(p.categoria)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-right text-[14.5px] font-semibold tabular-nums">
                      {p.preco_cents == null ? (
                        <span className="font-normal text-hub-suave">Consulte</span>
                      ) : (
                        moeda(p.preco_cents)
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ProdutoPainel
        siteId={siteId}
        aberto={aberto !== null}
        produto={aberto?.produto ?? null}
        categorias={categorias.data ?? []}
        marcas={marcas}
        salvando={m.produto.isPending}
        aoFechar={() => setAberto(null)}
        aoSalvar={(d) => m.produto.mutate(d, { onSuccess: () => setAberto(null) })}
        aoApagar={(p) => {
          m.apagar.mutate(p);
          setAberto(null);
        }}
      />
    </div>
  );
}
