import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { MateriaisCategorias, type Pasta } from "@/components/materiais/MateriaisCategorias";
import { MateriaisLista } from "@/components/materiais/MateriaisLista";
import { MaterialFormPainel, type DadosMaterial } from "@/components/materiais/MaterialFormPainel";
import { MaterialPainel } from "@/components/materiais/MaterialPainel";
import { useMutacoesMateriais } from "@/components/materiais/useMutacoesMateriais";
import { classeAcaoPrincipal } from "@/lib/estilos";
import {
  categoriasMaterial,
  chavesMateriais,
  listarMateriais,
  type CategoriaMaterial,
  type Material,
} from "@/lib/materiais";

const pastas = ["todos", ...categoriasMaterial.map((c) => c.id), "compartilhados", "lixeira"] as [
  Pasta,
  ...Pasta[],
];
const origens = ["todas", "nosso", "cliente"] as const;
type Origem = (typeof origens)[number];

const busca = z.object({
  pasta: z.enum(pastas).optional().catch(undefined),
  cliente: z.string().uuid().optional().catch(undefined),
  material: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/app/materiais")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Materiais · Hub Fora do Papel" }] }),
  component: Materiais,
});

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Materiais() {
  const { pasta = "todos", cliente, material } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesMateriais.lista, queryFn: listarMateriais });
  const m = useMutacoesMateriais();
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(texto);
  const [origem, setOrigem] = useState<Origem>("todas");
  const [form, setForm] = useState<{ aberto: boolean; material: Material | null }>({
    aberto: false,
    material: null,
  });

  const d = q.data;
  const clientesComMaterial = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const x of d?.itens ?? []) if (x.client_id && x.empresa) mapa.set(x.client_id, x.empresa);
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [d?.itens]);

  // Filtro de exibição (a contagem por categoria vem pronta do banco).
  const itens = useMemo(() => {
    const t = semAcento(termo.trim());
    return (d?.itens ?? []).filter((x) => {
      if (pasta === "lixeira") {
        if (!x.excluido_em) return false;
      } else {
        if (x.excluido_em) return false;
        if (pasta === "compartilhados" && !x.compartilhado) return false;
        if (pasta !== "todos" && pasta !== "compartilhados" && x.categoria !== pasta) return false;
      }
      if (cliente && x.client_id !== cliente) return false;
      if (origem !== "todas" && x.origem !== origem) return false;
      if (!t) return true;
      return semAcento(
        [x.titulo, x.descricao, x.empresa, x.projeto, x.arquivo, x.texto].filter(Boolean).join(" "),
      ).includes(t);
    });
  }, [d?.itens, pasta, cliente, origem, termo]);

  const aberto = material ? (d?.itens.find((x) => x.id === material) ?? null) : null;
  const abrir = (id: string | undefined) =>
    void navigate({ search: (s) => ({ ...s, material: id }), replace: true });

  const salvar = async (v: DadosMaterial) => {
    if (v.tipo === "arquivo" && !v.id) {
      for (const arquivo of v.arquivos) {
        const titulo =
          v.arquivos.length > 1 ? arquivo.name.replace(/\.[^.]+$/, "").slice(0, 120) : v.titulo;
        try {
          await m.enviar.mutateAsync({
            ...v,
            arquivo,
            titulo: titulo.length >= 2 ? titulo : arquivo.name,
          });
        } catch {
          return; // o aviso de erro já saiu; para no primeiro que falhar
        }
      }
      return;
    }
    m.salvar.mutate(v);
  };

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Biblioteca"
        titulo="Materiais"
        resumo="Modelos, guias, textos prontos e os arquivos que os clientes mandam, num lugar só."
        acao={
          <button
            type="button"
            className={classeAcaoPrincipal}
            onClick={() => setForm({ aberto: true, material: null })}
          >
            <Plus className="size-4" aria-hidden="true" /> Enviar material
          </button>
        }
      />

      {m.enviar.isPending && (
        <p role="status" className="rounded-2xl bg-sit-info p-4 text-[14.5px] text-sit-info-t">
          Enviando arquivo… pode continuar usando o Hub, só não feche esta aba.
        </p>
      )}

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os materiais"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !d ? (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]" aria-busy="true">
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
          <MateriaisCategorias
            contagem={d.contagem}
            ativa={pasta}
            aoEscolher={(p) =>
              void navigate({
                search: (s) => ({ ...s, pasta: p === "todos" ? undefined : p }),
                replace: true,
              })
            }
          />
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Buscar materiais</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hub-suave"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar por nome, cliente ou texto"
                  className="h-11 w-full rounded-xl border border-[#DADAD3] bg-white pl-9 pr-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
                />
              </label>
              <select
                aria-label="Cliente"
                value={cliente ?? ""}
                onChange={(e) =>
                  void navigate({
                    search: (s) => ({ ...s, cliente: e.target.value || undefined }),
                    replace: true,
                  })
                }
                className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px] lg:w-56"
              >
                <option value="">Todos os clientes</option>
                {clientesComMaterial.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            <FiltrosChip<Origem>
              rotulo="Origem"
              ativo={origem}
              aoEscolher={setOrigem}
              opcoes={[
                { id: "todas", rotulo: "Tudo" },
                { id: "nosso", rotulo: "Nossos" },
                { id: "cliente", rotulo: "Do cliente" },
              ]}
            />
            {itens.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                {d.contagem.todos === 0 && pasta !== "lixeira"
                  ? 'Nenhum material ainda. Use "Enviar material" para guardar o primeiro modelo, guia ou texto pronto.'
                  : pasta === "lixeira"
                    ? "A lixeira está vazia."
                    : "Nada encontrado com esses filtros."}
              </p>
            ) : (
              <MateriaisLista itens={itens} aoAbrir={(x) => abrir(x.id)} />
            )}
          </div>
        </div>
      )}

      <MaterialPainel
        m={aberto}
        aoFechar={() => abrir(undefined)}
        aoEditar={(x) => {
          abrir(undefined);
          setForm({ aberto: true, material: x });
        }}
        aoLixeira={(x, excluir) => m.lixeira.mutate({ m: x, excluir })}
        aoExcluir={(x) => m.excluir.mutate(x)}
      />
      <MaterialFormPainel
        aberto={form.aberto}
        aoMudar={(v) => setForm((f) => ({ ...f, aberto: v }))}
        material={form.material}
        inicial={{
          clienteId: cliente,
          categoria:
            pasta !== "todos" && pasta !== "lixeira" && pasta !== "compartilhados"
              ? (pasta as CategoriaMaterial)
              : undefined,
        }}
        aoSalvar={(v) => void salvar(v)}
      />
    </div>
  );
}
