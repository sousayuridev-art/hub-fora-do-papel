import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { SemSite } from "@/components/portal/site/SemSite";
import { AcompanharRevisao } from "@/components/portal/revisao/AcompanharRevisao";
import { ConviteRevisao } from "@/components/portal/revisao/ConviteRevisao";
import { MarcarRevisao } from "@/components/portal/revisao/MarcarRevisao";
import { useRevisao } from "@/components/portal/revisao/useRevisao";
import { useSitesPortal } from "@/hooks/useSitesPortal";

export const Route = createFileRoute("/portal/site/revisar/")({
  head: () => ({ meta: [{ title: "Revisar o site · Painel Fora do Papel" }] }),
  component: RevisarSite,
});

/**
 * Revisar o site (cards RS-2 e RS-3): convite na primeira vez, depois acompanhar as revisões;
 * "Começar a revisão" ou "Marcar ajustes" abre a prévia para tocar e montar a lista.
 */
function RevisarSite() {
  const sites = useSitesPortal();
  const site = sites.site;
  const q = useRevisao(site?.id ?? null);
  const [marcando, setMarcando] = useState(false);

  if (sites.carregando) return <SemSite motivo="carregando" />;
  if (sites.falhou) return <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />;
  if (!site) return <SemSite motivo="sem-site" />;
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir a revisão"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div className="h-80 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  const r = q.data;

  if (marcando && !r.aprovado_em) return <MarcarRevisao r={r} aoSair={() => setMarcando(false)} />;
  if (r.rodadas.length === 0 && !r.aprovado_em)
    return (
      <ConviteRevisao
        dominio={r.site.dominio}
        incluidas={r.incluidas}
        aoComecar={() => setMarcando(true)}
      />
    );
  return <AcompanharRevisao r={r} aoMarcarMais={() => setMarcando(true)} />;
}
