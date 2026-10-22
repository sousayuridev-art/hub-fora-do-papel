import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { ClientesTabela } from "@/components/clientes/ClientesTabela";
import { NovoContatoPainel } from "@/components/funil/NovoContatoPainel";
import { Input } from "@/components/ui/input";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import {
  filtrosClientes,
  ordensClientes,
  passoAberto,
  resumoClientes,
  valorDe,
  type FiltroLista,
  type OrdemClientes,
} from "@/lib/clientes";
import type { ClienteLinha } from "@/lib/funil";
import { chavesClientes, listarClientes } from "@/lib/funil";

const busca = z.object({
  filtro: z
    .enum(["todos", "contato", "negociacao", "cliente", "arquivado", "hoje", "vencidos"])
    .optional()
    .catch(undefined),
  ordem: z.enum(["atividade", "prazo", "valor"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/clientes/")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Clientes · Hub Fora do Papel" }] }),
  component: Clientes,
});

/** Normaliza para buscar sem acento e sem diferença de maiúsculas. */
const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Filtro de exibição sobre a lista já carregada (os números vêm do banco). */
function noFiltro(c: ClienteLinha, filtro: FiltroLista): boolean {
  if (filtro === "todos") return true;
  if (filtro === "hoje") return passoAberto(c) && c.next_step_date === c.hoje;
  if (filtro === "vencidos")
    return passoAberto(c) && c.next_step_date !== null && c.next_step_date < c.hoje;
  return c.situacao === filtro;
}

/** Ordem de exibição; "atividade" mantém a ordem do banco. */
function ordenar(itens: ClienteLinha[], ordem: OrdemClientes): ClienteLinha[] {
  if (ordem === "atividade") return itens;
  const copia = [...itens];
  if (ordem === "prazo") {
    const chave = (c: ClienteLinha) => (passoAberto(c) && c.next_step_at) || "9999";
    return copia.sort((a, b) => chave(a).localeCompare(chave(b)));
  }
  return copia.sort((a, b) => (valorDe(b).valor ?? -1) - (valorDe(a).valor ?? -1));
}

function Clientes() {
  const { filtro: f, ordem: o } = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtro: FiltroLista = f ?? "todos";
  const ordem: OrdemClientes = o ?? "atividade";
  const filtrar = (id: FiltroLista) =>
    void navigate({
      search: (s) => ({ ...s, filtro: id === "todos" || id === filtro ? undefined : id }),
    });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(normal(texto.trim()));
  const [novo, setNovo] = useState(false);

  const lista = useQuery({ queryKey: chavesClientes.lista, queryFn: listarClientes });
  const resumo = useQuery({
    queryKey: [...chavesClientes.lista, "resumo"],
    queryFn: resumoClientes,
  });

  // Filtro de exibição da lista já carregada (as contagens vêm do banco)
  const visiveis = useMemo(
    () =>
      ordenar(
        (lista.data ?? []).filter(
          (c) =>
            noFiltro(c, filtro) &&
            (!termo ||
              normal(
                `${c.company_name} ${c.contact_name} ${c.email ?? ""} ${c.whatsapp ?? ""} ${c.city ?? ""}`,
              ).includes(termo)),
        ),
        ordem,
      ),
    [lista.data, filtro, termo, ordem],
  );
  const r = resumo.data;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Clientes"
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo contato
          </button>
        }
      />

      {resumo.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os números"
          aoTentarDeNovo={() => void resumo.refetch()}
        />
      ) : r ? (
        <FaixaNumeros
          itens={[
            {
              rotulo: "Para hoje",
              valor: r.para_hoje,
              apoio:
                r.para_hoje_com_hora > 0
                  ? `${r.para_hoje_com_hora} com horário marcado`
                  : "Passos marcados para hoje",
              aoClicar: () => filtrar("hoje"),
              ativo: filtro === "hoje",
            },
            {
              rotulo: "Vencidos",
              valor: r.vencidos,
              apoio:
                r.vencidos === 0
                  ? "Nenhum passo atrasado"
                  : r.vencido_ha_dias === 1
                    ? "O mais antigo venceu ontem"
                    : `O mais antigo há ${r.vencido_ha_dias} dias`,
              tom: r.vencidos > 0 ? "risco" : undefined,
              aoClicar: () => filtrar("vencidos"),
              ativo: filtro === "vencidos",
            },
            {
              rotulo: "Em negociação",
              valor: moeda(r.em_negociacao_cents),
              apoio: r.negociacao === 1 ? "1 oportunidade" : `${r.negociacao} oportunidades`,
              aoClicar: () => filtrar("negociacao"),
              ativo: filtro === "negociacao",
            },
            {
              rotulo: "Clientes ativos",
              valor: r.cliente,
              apoio:
                r.mensalidades_cents > 0
                  ? `${moeda(r.mensalidades_cents)} por mês em mensalidades`
                  : "Nenhuma mensalidade ativa",
              aoClicar: () => filtrar("cliente"),
              ativo: filtro === "cliente",
            },
          ]}
        />
      ) : (
        <div className="h-[92px] animate-pulse rounded-2xl bg-white" aria-busy="true" />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <label className="relative lg:w-72 lg:flex-none">
          <span className="sr-only">Buscar empresa, contato ou cidade</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hub-suave"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar empresa, contato ou cidade"
            className="h-11 bg-white pl-9 text-base md:text-[15px]"
            enterKeyHint="search"
          />
        </label>
        <FiltrosChip<FiltroLista>
          rotulo="Filtrar clientes"
          opcoes={filtrosClientes.map((o) => ({ id: o.id, rotulo: o.rotulo, contagem: r?.[o.id] }))}
          ativo={filtro}
          aoEscolher={(id) =>
            void navigate({ search: (s) => ({ ...s, filtro: id === "todos" ? undefined : id }) })
          }
        />
        <label className="flex items-center gap-2 text-[13.5px] text-hub-suave lg:ml-auto">
          Ordenar por
          <select
            value={ordem}
            onChange={(e) =>
              void navigate({
                search: (s) => ({
                  ...s,
                  ordem:
                    e.target.value === "atividade" ? undefined : (e.target.value as OrdemClientes),
                }),
                replace: true,
              })
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] bg-white px-3 text-base font-semibold text-hub-tinta lg:flex-none lg:text-[14px]"
          >
            {ordensClientes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {lista.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os clientes"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-8 text-center text-[15px] text-hub-suave">
          {texto ? `Nada encontrado para "${texto}".` : "Nenhuma ficha neste filtro."}
          {filtro !== "todos" && (
            <button
              type="button"
              onClick={() => filtrar("todos")}
              className="ml-1 inline-flex min-h-11 items-center font-medium text-[#1E3FA8] underline underline-offset-4"
            >
              Ver todos
            </button>
          )}
        </p>
      ) : (
        <>
          <ClientesTabela itens={visiveis} />
          {r && (
            <p className="flex flex-col gap-1 text-[14px] text-hub-suave sm:flex-row sm:justify-between">
              <span className="font-semibold text-hub-tinta">
                {visiveis.length} de {lista.data.length}
              </span>
            </p>
          )}
        </>
      )}
      <NovoContatoPainel aberto={novo} aoMudar={setNovo} />
    </div>
  );
}
