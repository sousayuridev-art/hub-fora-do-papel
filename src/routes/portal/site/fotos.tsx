import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { EnviarFotos } from "@/components/portal/site/EnviarFotos";
import { FotoCartao } from "@/components/portal/site/FotoCartao";
import { FotoPainel } from "@/components/portal/site/FotoPainel";
import { SemSite } from "@/components/portal/site/SemSite";
import { useMutacoesFotos } from "@/components/portal/site/useMutacoesFotos";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { chavesFotos, fotosDoSite } from "@/lib/fotosSite";

export const Route = createFileRoute("/portal/site/fotos")({
  head: () => ({ meta: [{ title: "Fotos e arquivos · Painel Fora do Papel" }] }),
  component: Fotos,
});

/** Fotos e arquivos do site (card PC-3): grade, envio com redução no aparelho, descrição e uso. */
function Fotos() {
  const sites = useSitesPortal();
  const site = sites.site;
  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Meu site"
        titulo="Fotos e arquivos"
        texto="As fotos do seu site. Envie daqui e escolha nos artigos e nas páginas. Fotos grandes são reduzidas antes de subir."
        acao={site && <EnviarFotos siteId={site.id} />}
      />
      {sites.carregando ? (
        <SemSite motivo="carregando" />
      ) : sites.falhou ? (
        <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />
      ) : !site ? (
        <SemSite motivo="sem-site" />
      ) : (
        <Grade siteId={site.id} />
      )}
    </div>
  );
}

function Grade({ siteId }: { siteId: string }) {
  const q = useQuery({ queryKey: chavesFotos.doSite(siteId), queryFn: () => fotosDoSite(siteId) });
  const m = useMutacoesFotos(siteId);
  const [aberta, setAberta] = useState<string | null>(null);
  const foto = q.data?.find((f) => f.caminho === aberta) ?? null;

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar as fotos"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data)
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  const semDescricao = q.data.filter((f) => !f.descricao).length;
  return (
    <div className="flex flex-col gap-4">
      {semDescricao > 0 && (
        <p className="rounded-xl bg-sit-atencao p-4 text-[14.5px] text-sit-atencao-t">
          {semDescricao === 1
            ? "1 foto está sem descrição."
            : `${semDescricao} fotos estão sem descrição.`}{" "}
          A descrição ajuda pessoas com deficiência visual e faz a foto aparecer no Google Imagens.
        </p>
      )}
      {q.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma foto ainda. Use "Enviar fotos" para guardar a primeira.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {q.data.map((f) => (
            <FotoCartao key={f.caminho} foto={f} aoAbrir={() => setAberta(f.caminho)} />
          ))}
        </ul>
      )}
      <FotoPainel
        foto={foto}
        aoFechar={() => setAberta(null)}
        aoDescrever={(caminho, descricao) => m.descrever.mutate({ caminho, descricao })}
        aoApagar={(f) => m.apagar.mutate(f)}
      />
    </div>
  );
}
