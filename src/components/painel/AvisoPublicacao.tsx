import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";

import { chavesMarketing, publicacoesComProblema } from "@/lib/marketing";

/**
 * Painel (MK-5): o que não saiu sozinho ou saiu da fila e precisa do Yuri.
 * Abaixo de nada para mostrar, não aparece.
 */
export function AvisoPublicacao() {
  const { data } = useQuery({
    queryKey: chavesMarketing.problemasPublicacao,
    queryFn: publicacoesComProblema,
  });
  if (!data || data.length === 0) return null;
  return (
    <section
      aria-labelledby="aviso-publicacao-t"
      className="flex flex-col gap-2 rounded-xl bg-sit-risco px-4 py-3 text-[14px] text-sit-risco-t"
    >
      <h2 id="aviso-publicacao-t" className="flex items-center gap-2 font-semibold">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {data.length === 1
          ? "Uma publicação precisa de você"
          : `${data.length} publicações precisam de você`}
      </h2>
      <ul className="flex flex-col gap-1">
        {data.slice(0, 5).map((p) => (
          <li key={p.versao_id}>
            <Link
              to="/app/marketing"
              search={{ peca: p.peca_id }}
              className="flex min-h-11 flex-col justify-center hover:underline md:min-h-0"
            >
              <span className="font-medium">
                {p.titulo} · {p.canal_nome ?? p.canal}
              </span>
              {p.erro && <span className="text-[13px]">{p.erro}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
