import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { ClientesAtivosTabela } from "@/components/clientes/ClientesAtivosTabela";
import { ClientesTabela } from "@/components/clientes/ClientesTabela";
import { useLogos } from "@/components/clientes/useLogos";
import { NovoContatoPainel } from "@/components/funil/NovoContatoPainel";
import { Input } from "@/components/ui/input";
import { classeAcaoPrincipal, classeLinkTexto } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import {
  chavesAgora,
  clientesAgora,
  filtrosClientes,
  gruposClientes,
  ordensClientes,
  passoAberto,
  resumoClientes,
  valorDe,
  type AgoraCliente,
  type FiltroLista,
  type GrupoCliente,
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
  /** Clientes ativos (padrão), Contatos, Ex-clientes ou Arquivados (RD2-5). */
  grupo: z.enum(["ativo", "contato", "ex", "arquivado"]).optional().catch(undefined),
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

/** Grupo da ficha: o do banco; enquanto ele não chega, uma aproximação pela situação. */
function grupoDe(c: ClienteLinha, agora: Record<string, AgoraCliente> | undefined): GrupoCliente {
  const g = agora?.[c.id]?.grupo;
  if (g) return g;
  if (c.situacao === "cliente") return "ativo";
  if (c.situacao === "arquivado") return "arquivado";
  return "contato";
}

/** Filtros que fazem sentido dentro de Contatos (Clientes e Arquivados viraram abas). */
const filtrosDeContato = filtrosClientes.filter((o) => o.id !== "cliente" && o.id !== "arquivado");

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
  const { filtro: f, ordem: o, grupo: g } = Route.useSearch();
  const navigate = Route.useNavigate();
  const grupo: GrupoCliente = g ?? "ativo";
  const filtro: FiltroLista =
    grupo !== "contato" || f === "cliente" || f === "arquivado" ? "todos" : (f ?? "todos");
  const ordem: OrdemClientes = o ?? "atividade";
  const filtrar = (id: FiltroLista) =>
    void navigate({
      search: (s) => ({ ...s, filtro: id === "todos" || id === filtro ? undefined : id }),
      replace: true,
    });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(normal(texto.trim()));
  const [novo, setNovo] = useState(false);

  const lista = useQuery({ queryKey: chavesClientes.lista, queryFn: listarClientes });
  const resumo = useQuery({
    queryKey: [...chavesClientes.lista, "resumo"],
    queryFn: resumoClientes,
  });
  const agora = useQuery({ queryKey: chavesAgora, queryFn: clientesAgora });

  // Filtro de exibição da lista já carregada (as contagens vêm do banco)
  const visiveis = useMemo(
    () =>
      ordenar(
        (lista.data ?? []).filter(
          (c) =>
            // "Para hoje" e "Vencidos" contam todos os passos abertos (mesma regra do banco)
            (filtro === "hoje" ||
              filtro === "vencidos" ||
              grupoDe(c, agora.data?.itens) === grupo) &&
            noFiltro(c, filtro) &&
            (!termo ||
              normal(
                `${c.company_name} ${c.contact_name} ${c.email ?? ""} ${c.whatsapp ?? ""} ${c.city ?? ""}`,
              ).includes(termo)),
        ),
        ordem,
      ),
    [lista.data, filtro, termo, ordem, grupo, agora.data],
  );
  const r = resumo.data;
  const ra = agora.data?.resumo;
  const logos = useLogos(visiveis.map((c) => c.logo_path));
  const escolherGrupo = (id: GrupoCliente) =>
    void navigate({
      search: (s) => ({ ...s, grupo: id === "ativo" ? undefined : id, filtro: undefined }),
      replace: true,
    });
  const tabelaDeCliente = grupo === "ativo" || grupo === "ex";

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

      <div
        role="tablist"
        aria-label="Quem mostrar"
        className="flex max-w-full self-start overflow-x-auto rounded-xl bg-[#E9EDF2] p-1"
      >
        {gruposClientes.map((op) => (
          <button
            key={op.id}
            type="button"
            role="tab"
            aria-selected={grupo === op.id}
            onClick={() => escolherGrupo(op.id)}
            className={
              grupo === op.id
                ? "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] md:min-h-10"
                : "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-[14px] text-[#4A4D54] hover:text-hub-tinta md:min-h-10"
            }
          >
            {op.rotulo}
            {ra && <span className="tabular-nums text-hub-suave">{ra[op.id]}</span>}
          </button>
        ))}
      </div>

      {grupo === "ativo" && ra && (
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
          <span>
            <b className="font-semibold">{moeda(ra.mensalidades_cents)}/mês</b>{" "}
            <span className="text-hub-suave">em mensalidades</span>
          </span>
          <span>
            <b className="font-semibold">{ra.projetos_andamento}</b>{" "}
            <span className="text-hub-suave">
              {ra.projetos_andamento === 1 ? "projeto em andamento" : "projetos em andamento"}
            </span>
          </span>
          <span>
            <b
              className={
                ra.clientes_em_atraso > 0 ? "font-semibold text-sit-risco-t" : "font-semibold"
              }
            >
              {ra.clientes_em_atraso}
            </b>{" "}
            <span className="text-hub-suave">
              {ra.clientes_em_atraso === 1
                ? "cliente com cobrança atrasada"
                : "clientes com cobrança atrasada"}
            </span>
          </span>
        </p>
      )}

      {grupo !== "contato" ? null : resumo.isError ? (
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
        {grupo === "contato" && (
          <FiltrosChip<FiltroLista>
            rotulo="Filtrar contatos"
            opcoes={filtrosDeContato.map((o) => ({
              id: o.id,
              rotulo: o.rotulo,
              contagem: o.id === "todos" ? ra?.contato : r?.[o.id],
            }))}
            ativo={filtro}
            aoEscolher={(id) =>
              void navigate({
                search: (s) => ({ ...s, filtro: id === "todos" ? undefined : id }),
                replace: true,
              })
            }
          />
        )}
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
          {texto
            ? `Nada encontrado para "${texto}".`
            : grupo === "ativo"
              ? "Nenhum cliente ativo ainda. Quem fecha negócio em Vendas aparece aqui."
              : "Nenhuma ficha aqui."}
          {filtro !== "todos" && (
            <button
              type="button"
              onClick={() => filtrar("todos")}
              className={`${classeLinkTexto} ml-1 inline-flex min-h-11 items-center`}
            >
              Ver todos
            </button>
          )}
        </p>
      ) : (
        <>
          {tabelaDeCliente ? (
            <ClientesAtivosTabela itens={visiveis} agora={agora.data?.itens ?? {}} logos={logos} />
          ) : (
            <ClientesTabela itens={visiveis} logos={logos} />
          )}
          {r && (
            <p className="flex flex-col gap-1 text-[14px] text-hub-suave sm:flex-row sm:justify-between">
              <span className="font-semibold text-hub-tinta">
                {visiveis.length} {visiveis.length === 1 ? "ficha" : "fichas"}
              </span>
            </p>
          )}
        </>
      )}
      <NovoContatoPainel aberto={novo} aoMudar={setNovo} />
    </div>
  );
}
