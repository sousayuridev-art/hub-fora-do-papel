import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, X } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { chavesSite, listarMidia } from "@/lib/site";

/** Escolhe uma imagem já enviada na aba Mídia (o banco só aceita imagens do site-midia). */
export function EscolherImagem({
  siteId,
  rotulo,
  valor,
  aoMudar,
}: {
  siteId: string;
  rotulo: string;
  valor: string | null;
  aoMudar: (url: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const q = useQuery({
    queryKey: chavesSite.midia(siteId),
    queryFn: () => listarMidia(siteId),
    enabled: aberto,
  });
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-medium">{rotulo}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hub-borda bg-hub-fundo">
          {valor ? (
            <img src={valor} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-hub-suave" aria-hidden="true" />
          )}
        </span>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="inline-flex min-h-11 items-center rounded-xl border border-[#DADAD3] bg-white px-4 text-[15px] font-medium hover:bg-hub-selecao"
        >
          {aberto ? "Fechar a Mídia" : valor ? "Trocar imagem" : "Escolher da Mídia"}
        </button>
        {valor && (
          <button
            type="button"
            onClick={() => aoMudar(null)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[15px] text-hub-suave hover:bg-hub-selecao hover:text-hub-tinta"
          >
            <X className="size-4" aria-hidden="true" /> Tirar imagem
          </button>
        )}
      </div>
      {aberto &&
        (q.isError ? (
          <EstadoErro
            titulo="Não foi possível carregar as imagens"
            aoTentarDeNovo={() => void q.refetch()}
          />
        ) : !q.data ? (
          <div className="h-24 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
        ) : q.data.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Nenhuma imagem ainda. Envie na aba Mídia e volte aqui.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {q.data.map((img) => (
              <li key={img.caminho}>
                <button
                  type="button"
                  onClick={() => {
                    aoMudar(img.url);
                    setAberto(false);
                  }}
                  aria-label={`Usar ${img.nome}`}
                  aria-pressed={img.url === valor}
                  className="block aspect-square w-full overflow-hidden rounded-xl border border-hub-borda aria-pressed:ring-2 aria-pressed:ring-[#FFB020]"
                >
                  <img
                    src={img.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
