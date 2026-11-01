import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Columns3, List, Plus, Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { CampoEscolha } from "@/components/hub/Campo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { PedidoPainel } from "@/components/pedidos/PedidoPainel";
import { AlternarVista } from "@/components/hub/AlternarVista";
import { PedidosLista } from "@/components/pedidos/PedidosLista";
import { PedidosQuadro } from "@/components/pedidos/PedidosQuadro";
import { RegistrarPedidoPainel } from "@/components/pedidos/RegistrarPedidoPainel";
import { useMutacoesPedidos } from "@/components/pedidos/useMutacoesPedidos";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { classeAcaoPrincipal } from "@/lib/estilos";
import {
  abasPedidos,
  chavesPedidos,
  listarPedidos,
  resumoPedidos,
  rotuloOrigem,
  situacoesDaAba,
  type AbaPedidos,
  type Origem,
} from "@/lib/pedidos";
import { chavesPrecos, lerPrecos } from "@/lib/precos";

const busca = z.object({
  aba: z
    .enum(["todos", "recebido", "andamento", "aguardando_cliente", "concluidos"])
    .optional()
    .catch(undefined),
  pedido: z.string().uuid().optional().catch(undefined),
  cliente: z.string().uuid().optional().catch(undefined),
  origem: z.enum(["portal", "painel", "whatsapp", "reuniao", "hub"]).optional().catch(undefined),
  /** Quadro por situação (padrão) ou lista (RD2-4). */
  vista: z.enum(["quadro", "lista"]).optional().catch(undefined),
  urgentes: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/app/pedidos")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Pedidos de ajuste · Hub Fora do Papel" }] }),
  component: Pedidos,
});

function Pedidos() {
  const {
    aba = "todos",
    pedido,
    cliente: clienteNaUrl,
    origem: origemNaUrl,
    vista = "quadro",
    urgentes = false,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cliente = clienteNaUrl ?? "todos";
  const setCliente = (v: string) =>
    void navigate({
      search: (s) => ({ ...s, cliente: v === "todos" ? undefined : v }),
      replace: true,
    });
  const origem: Origem | "todas" = origemNaUrl ?? "todas";
  const setOrigem = (v: Origem | "todas") =>
    void navigate({
      search: (s) => ({ ...s, origem: v === "todas" ? undefined : v }),
      replace: true,
    });
  const [texto, setTexto] = useState("");
  const termo = useDeferredValue(texto.trim().toLowerCase());
  const [registrar, setRegistrar] = useState(false);
  const m = useMutacoesPedidos();

  const lista = useQuery({ queryKey: chavesPedidos.lista, queryFn: listarPedidos });
  const resumo = useQuery({ queryKey: chavesPedidos.resumo, queryFn: resumoPedidos });
  const precos = useQuery({ queryKey: chavesPrecos.tudo, queryFn: lerPrecos });
  const hora = precos.data?.precos.hour_cents ?? 0;

  const clientes = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const p of lista.data ?? []) vistos.set(p.client_id, p.company_name);
    // veio da ficha de um cliente sem pedidos: a opção existe para o filtro aparecer
    if (cliente !== "todos" && !vistos.has(cliente)) vistos.set(cliente, "Cliente escolhido");
    return [...vistos]
      .map(([id, rotulo]) => ({ id, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [lista.data, cliente]);

  const visiveis = useMemo(() => {
    // no quadro as colunas já separam a situação; lá o filtro é só "Urgentes"
    const sit = vista === "quadro" ? null : situacoesDaAba[aba];
    return (lista.data ?? []).filter(
      (p) =>
        (!sit || sit.includes(p.status)) &&
        (vista === "lista" || !urgentes || p.urgente === true) &&
        (cliente === "todos" || p.client_id === cliente) &&
        (origem === "todas" || p.origin === origem) &&
        (!termo || `${p.code} ${p.title} ${p.company_name}`.toLowerCase().includes(termo)),
    );
  }, [lista.data, aba, cliente, origem, termo, vista, urgentes]);
  const totalUrgentes = useMemo(
    () =>
      (lista.data ?? []).filter(
        (p) => p.urgente && p.status !== "pronto" && p.status !== "recusado",
      ).length,
    [lista.data],
  );

  const aberto = pedido ? ((lista.data ?? []).find((p) => p.id === pedido) ?? null) : null;
  // Abrir o pedido cria entrada no histórico; fechar pela tela não (RD-9)
  const painelPedido = usePainelNaUrl(
    (id, o) => void navigate({ search: (s) => ({ ...s, pedido: id }), ...o }),
  );
  const r = resumo.data;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Entregar"
        titulo="Pedidos de ajuste"
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setRegistrar(true)}>
            <Plus className="size-4" aria-hidden="true" /> Registrar pedido
          </button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {vista === "quadro" ? (
          <FiltrosChip<"todos" | "urgentes">
            rotulo="Filtrar o quadro"
            ativo={urgentes ? "urgentes" : "todos"}
            aoEscolher={(id) =>
              void navigate({
                search: (s) => ({ ...s, urgentes: id === "urgentes" ? true : undefined }),
                replace: true,
              })
            }
            opcoes={[
              { id: "todos", rotulo: "Todos" },
              { id: "urgentes", rotulo: "Urgentes", contagem: totalUrgentes },
            ]}
          />
        ) : (
          <FiltrosChip<AbaPedidos>
            rotulo="Situação dos pedidos"
            ativo={aba}
            aoEscolher={(id) =>
              void navigate({
                search: (s) => ({ ...s, aba: id === "todos" ? undefined : id }),
                replace: true,
              })
            }
            opcoes={abasPedidos.map((a) => ({
              id: a.id,
              rotulo: a.rotulo,
              contagem: r
                ? a.id === "todos"
                  ? r.todos
                  : a.id === "recebido"
                    ? r.recebido
                    : a.id === "andamento"
                      ? r.andamento
                      : a.id === "aguardando_cliente"
                        ? r.aguardando_cliente
                        : r.concluidos
                : undefined,
            }))}
          />
        )}
        <AlternarVista
          vista={vista}
          opcoes={[
            { id: "quadro", rotulo: "Quadro", Icone: Columns3 },
            { id: "lista", rotulo: "Lista", Icone: List },
          ]}
          aoMudar={(v) =>
            void navigate({
              search: (s) => ({ ...s, vista: v === "quadro" ? undefined : v }),
              replace: true,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <CampoEscolha
          className="sm:w-64"
          rotulo="Cliente"
          valor={cliente}
          aoMudar={setCliente}
          opcoes={[{ id: "todos", rotulo: "Todos os clientes" }, ...clientes]}
        />
        <CampoEscolha<Origem | "todas">
          className="sm:w-48"
          rotulo="Origem"
          valor={origem}
          aoMudar={setOrigem}
          opcoes={[
            { id: "todas", rotulo: "Todas" },
            ...(Object.keys(rotuloOrigem) as Origem[]).map((id) => ({
              id,
              rotulo: rotuloOrigem[id],
            })),
          ]}
        />
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-3 focus-within:border-hub-tinta sm:max-w-sm sm:ml-auto">
          <Search className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
          <span className="sr-only">Buscar pedido</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por código ou texto"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none md:text-[15px]"
          />
        </label>
      </div>

      {lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os pedidos"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : lista.isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {lista.data.length === 0
            ? 'Nenhum pedido ainda. Pedidos feitos pelo cliente no portal entram aqui sozinhos; os do WhatsApp, registre em "Registrar pedido".'
            : "Nenhum pedido com esses filtros."}
        </p>
      ) : vista === "quadro" ? (
        <PedidosQuadro
          itens={visiveis}
          aoAbrir={(p) => painelPedido.abrir(p.id)}
          aoVerProntos={() =>
            void navigate({ search: (s) => ({ ...s, vista: "lista", aba: "concluidos" }) })
          }
        />
      ) : (
        <PedidosLista itens={visiveis} aoAbrir={(p) => painelPedido.abrir(p.id)} />
      )}

      <PedidoPainel
        p={aberto}
        horaCents={hora}
        aoFechar={painelPedido.fechar}
        aoClassificar={(p, c, horas, nota) => m.classificar.mutate({ p, c, horas, nota })}
        aoEnviar={(p) => m.enviar.mutate({ p })}
        aoIniciar={(p) => m.iniciar.mutate({ p })}
        aoConcluir={(p) => m.concluir.mutate({ p })}
        aoRecusar={(p, motivo) => m.recusar.mutate({ p, motivo })}
        aoUrgente={(p, urgente) => m.urgente.mutate({ p, urgente })}
      />
      <RegistrarPedidoPainel
        aberto={registrar}
        aoMudar={setRegistrar}
        aoRegistrar={(v) => m.registrar.mutate(v)}
      />
    </div>
  );
}
