import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil } from "lucide-react";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { useLogos } from "@/components/clientes/useLogos";
import { SeloSituacaoSistema } from "@/components/sistemas/SistemaCartao";
import { SistemaPainel } from "@/components/sistemas/SistemaPainel";
import { SistemaServicos } from "@/components/sistemas/SistemaServicos";
import { SistemaVisaoGeral } from "@/components/sistemas/SistemaVisaoGeral";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { chavesSistemas, sistemasResumo } from "@/lib/sistemas";

const busca = z.object({
  aba: z.enum(["visao", "infra"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/sistemas/$id")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Sistema · Hub Fora do Papel" }] }),
  component: Sistema,
});

/** Página do sistema (SIS-1): Visão geral e Infraestrutura. */
function Sistema() {
  const { id } = Route.useParams();
  const { aba = "visao" } = Route.useSearch();
  const navigate = Route.useNavigate();
  // A lista já traz tudo de cada sistema (poucos itens); a página lê do mesmo cache.
  const q = useQuery({ queryKey: chavesSistemas.resumo, queryFn: sistemasResumo });
  const s = q.data?.itens.find((x) => x.id === id);
  const imagens = useLogos([s?.capa_path]);
  const [editar, setEditar] = useState(false);

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar o sistema"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (q.isPending)
    return <div className="h-40 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (!s)
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-white p-6">
        <p className="text-[15px]">Esse sistema não existe mais.</p>
        <Link to="/app/sistemas" className={classeBotaoSecundario}>
          Ver os sistemas
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltarPara="/app/sistemas"
        migalha={
          <span className="flex min-w-0 items-center gap-1">
            <Link to="/app/sistemas" className="hover:text-hub-tinta">
              Sistemas
            </Link>
            <span aria-hidden="true">›</span>
            <span className="truncate">{s.empresa}</span>
          </span>
        }
        titulo={s.nome}
        selo={<SeloSituacaoSistema situacao={s.situacao} />}
        resumo={s.descricao ?? undefined}
        acao={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={classeBotaoSecundario} onClick={() => setEditar(true)}>
              <Pencil className="size-4" aria-hidden="true" /> Editar dados
            </button>
            {s.url_producao && (
              <a
                href={s.url_producao}
                target="_blank"
                rel="noreferrer noopener"
                className={classeAcaoPrincipal}
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Abrir o sistema
              </a>
            )}
          </div>
        }
        abas={
          <Abas
            rotulo="Partes do sistema"
            ativa={aba}
            aoEscolher={(a) =>
              void navigate({ search: { aba: a === "visao" ? undefined : a }, replace: true })
            }
            opcoes={[
              { id: "visao", rotulo: "Visão geral" },
              { id: "infra", rotulo: "Infraestrutura", contagem: s.servicos },
            ]}
          />
        }
      />

      {aba === "infra" ? (
        <SistemaServicos
          sistemaId={s.id}
          custoNosso={s.custo_nosso_cents}
          custoCliente={s.custo_cliente_cents}
        />
      ) : (
        <SistemaVisaoGeral s={s} capa={s.capa_path ? imagens[s.capa_path] : undefined} />
      )}

      <SistemaPainel aberto={editar} sistema={s} aoFechar={() => setEditar(false)} />
    </div>
  );
}
