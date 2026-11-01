import { useQuery } from "@tanstack/react-query";

import { enderecoDaPrevia, tipoDePrevia, type Material } from "@/lib/materiais";

/**
 * Prévia do arquivo no painel (RD2-7): imagem, PDF, vídeo e áudio, sem baixar.
 * O endereço vale 10 minutos e é renovado ao reabrir. PDF no celular abre em nova aba
 * (os navegadores do celular não mostram PDF dentro da página).
 */
export function MaterialPrevia({ m }: { m: Material }) {
  const tipo = tipoDePrevia(m);
  const q = useQuery({
    queryKey: ["materiais", "previa", m.caminho],
    queryFn: () => enderecoDaPrevia(m.caminho ?? ""),
    enabled: tipo !== null && Boolean(m.caminho),
    staleTime: 8 * 60_000,
  });
  if (!tipo || !m.caminho) return null;
  if (q.isPending)
    return <div className="aspect-[4/3] animate-pulse rounded-xl bg-[#EEF1F5]" aria-busy="true" />;
  if (q.isError)
    return (
      <p className="rounded-xl bg-[#F5F7FA] p-4 text-[14px] text-hub-suave">
        Não foi possível carregar a prévia.{" "}
        <button
          type="button"
          className="min-h-11 font-medium text-hub-tinta"
          onClick={() => void q.refetch()}
        >
          Tentar de novo
        </button>
      </p>
    );
  const url = q.data;
  const moldura = "overflow-hidden rounded-xl border border-[#E3E7ED] bg-[#F5F7FA]";

  if (tipo === "imagem")
    return (
      <div className={moldura}>
        <img
          src={url}
          alt={`Prévia de ${m.titulo}`}
          className="mx-auto max-h-[60vh] w-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  if (tipo === "video")
    return (
      <div className={moldura}>
        <video src={url} controls preload="metadata" className="max-h-[60vh] w-full bg-black">
          <track kind="captions" />
        </video>
      </div>
    );
  if (tipo === "audio") return <audio src={url} controls preload="metadata" className="w-full" />;
  return (
    <div className={`${moldura} max-md:hidden`}>
      <iframe src={url} title={`Prévia de ${m.titulo}`} className="h-[60vh] w-full bg-white" />
    </div>
  );
}
