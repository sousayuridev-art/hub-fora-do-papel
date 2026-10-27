import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { MidiaItem } from "@/components/site/MidiaItem";
import { MidiaPainel } from "@/components/site/MidiaPainel";
import { useMutacoesMidia } from "@/components/site/useMutacoesMidia";
import { chavesSite, listarMidia, type ImagemSite } from "@/lib/site";

/** Imagens do site no bucket público (JPG, PNG ou WebP até 2 MB). */
export function MidiaGaleria({ siteId }: { siteId: string }) {
  const q = useQuery({ queryKey: chavesSite.midia(siteId), queryFn: () => listarMidia(siteId) });
  const { apagar } = useMutacoesMidia(siteId);
  const [aberta, setAberta] = useState<ImagemSite | null>(null);

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar as imagens"
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
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14.5px] text-hub-suave">
        JPG, PNG ou WebP até 2 MB. Copie o endereço para usar como capa de um artigo.
      </p>
      {q.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma imagem ainda. Use &quot;Enviar imagem&quot; para guardar a primeira.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {q.data.map((img) => (
            <MidiaItem key={img.caminho} img={img} aoAbrir={() => setAberta(img)} />
          ))}
        </ul>
      )}
      <MidiaPainel
        img={aberta}
        aoFechar={() => setAberta(null)}
        aoApagar={(i) => apagar.mutate(i)}
      />
    </div>
  );
}
