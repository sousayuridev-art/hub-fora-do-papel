import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ClienteSite } from "@/components/clientes/ClienteSite";
import { classeAcaoTexto } from "@/lib/estilos";
import { chavesSitesHub, haQuanto, rotuloSituacaoSite, sitesResumo } from "@/lib/sitesHub";

/**
 * Site na página do cliente (RD2-8): com site ligado, um cartão que leva à página do site
 * (onde ficam o conteúdo e o que o cliente pode editar). Sem site, o formulário para ligar um.
 */
export function ClienteSiteCartao({ clienteId }: { clienteId: string }) {
  const q = useQuery({ queryKey: chavesSitesHub.resumo, queryFn: sitesResumo });
  const sites = (q.data?.itens ?? []).filter((s) => s.client_id === clienteId);
  if (q.isPending)
    return <div className="h-28 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (sites.length === 0) return <ClienteSite clienteId={clienteId} />;
  return (
    <>
      {sites.map((s) => (
        <section
          key={s.id}
          aria-label={`Site ${s.dominio}`}
          className="flex flex-col gap-2 rounded-2xl border border-[#E3E7ED] bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-all text-[15.5px] font-semibold">{s.dominio}</h2>
            <span className="shrink-0 text-[13px] text-hub-suave">
              {rotuloSituacaoSite[s.situacao]}
            </span>
          </div>
          <p className="text-[13.5px] text-hub-suave">
            {s.contatos_mes} {s.contatos_mes === 1 ? "contato" : "contatos"} no mês · cliente entrou{" "}
            {haQuanto(s.ultimo_acesso).toLowerCase()}
          </p>
          <Link
            to="/app/sites/$id"
            params={{ id: s.id }}
            className={`${classeAcaoTexto} self-start`}
          >
            Abrir o site no Hub ›
          </Link>
        </section>
      ))}
    </>
  );
}
