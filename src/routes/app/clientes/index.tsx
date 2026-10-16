import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { ClientesTabela } from "@/components/clientes/ClientesTabela";
import { NovoContatoPainel } from "@/components/funil/NovoContatoPainel";
import { Input } from "@/components/ui/input";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import { filtrosClientes, resumoClientes, type FiltroClientes } from "@/lib/clientes";
import { chavesClientes, listarClientes } from "@/lib/funil";

const busca = z.object({
  filtro: z
    .enum(["todos", "contato", "negociacao", "cliente", "arquivado"])
    .optional()
    .catch(undefined),
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

function Clientes() {
  const { filtro: f } = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtro: FiltroClientes = f ?? "todos";
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
      (lista.data ?? []).filter(
        (c) =>
          (filtro === "todos" || c.situacao === filtro) &&
          (!termo ||
            normal(
              `${c.company_name} ${c.contact_name} ${c.email ?? ""} ${c.whatsapp ?? ""}`,
            ).includes(termo)),
      ),
    [lista.data, filtro, termo],
  );
  const r = resumo.data;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Clientes"
        resumo={
          <>
            Uma ficha por empresa, do primeiro contato até a mensalidade. Quando o contato fecha, a
            mesma ficha vira cliente.
            {r && (
              <>
                {" "}
                <strong className="font-semibold text-hub-tinta">
                  {r.contato} contatos · {r.negociacao} em negociação · {r.cliente} clientes
                </strong>
              </>
            )}
          </>
        }
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo contato
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Buscar por empresa ou pessoa</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hub-suave"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por empresa ou pessoa"
            className="h-11 bg-white pl-9 text-base md:text-[15px]"
            enterKeyHint="search"
          />
        </label>
        <FiltrosChip
          rotulo="Filtrar clientes"
          opcoes={filtrosClientes.map((o) => ({ id: o.id, rotulo: o.rotulo, contagem: r?.[o.id] }))}
          ativo={filtro}
          aoEscolher={(id) =>
            void navigate({ search: { filtro: id === "todos" ? undefined : id } })
          }
        />
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
        </p>
      ) : (
        <>
          <ClientesTabela itens={visiveis} />
          {r && (
            <p className="flex flex-col gap-1 text-[14px] text-hub-suave sm:flex-row sm:justify-between">
              <span className="font-semibold text-hub-tinta">
                {visiveis.length} de {lista.data.length}
              </span>
              <span>
                {moeda(r.em_negociacao_cents)} em diagnósticos e propostas ·{" "}
                {moeda(r.fechado_cents)} em projetos fechados
              </span>
            </p>
          )}
        </>
      )}
      <NovoContatoPainel aberto={novo} aoMudar={setNovo} />
    </div>
  );
}
