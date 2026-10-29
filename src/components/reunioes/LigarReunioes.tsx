import { useQuery } from "@tanstack/react-query";

import { diaComHora } from "@/lib/formatar";
import { chavesReunioes, reunioesParaLigar, type Reuniao } from "@/lib/reunioes";
import { useVincularReuniao } from "@/components/reunioes/useVincularReuniao";
import { classeAcaoTexto, classeLinkTexto } from "@/lib/estilos";

/**
 * "Ligue estas reuniões a um cliente" (card RD-4): reuniões sem cliente com o cliente sugerido
 * pelo e-mail dos convidados (calculado no banco). "Ligar" em um clique; sem sugestão, só
 * "Escolher cliente", que abre o painel com o vínculo.
 */
export function LigarReunioes({
  aoEscolher,
  aoVerTodas,
}: {
  aoEscolher: (r: Reuniao) => void;
  aoVerTodas: () => void;
}) {
  const q = useQuery({ queryKey: chavesReunioes.paraLigar, queryFn: reunioesParaLigar });
  const vincular = useVincularReuniao();

  if (q.isError) {
    return (
      <p className="rounded-2xl border border-hub-borda bg-white p-4 text-[14px] text-sit-risco-t">
        Não foi possível ver as reuniões sem cliente.{" "}
        <button
          type="button"
          className={`${classeLinkTexto} min-h-11`}
          onClick={() => void q.refetch()}
        >
          Tentar de novo
        </button>
      </p>
    );
  }
  if (!q.data || q.data.total === 0) return null;
  const { total, itens } = q.data;

  return (
    <section
      aria-labelledby="ligar-t"
      className="flex flex-col gap-3 rounded-2xl border border-[#F3E2BD] bg-white p-4 md:px-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 id="ligar-t" className="text-[16px] font-semibold">
          Ligue estas reuniões a um cliente · {total}
        </h2>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {itens.map((r) => {
          const s = r.sugestao;
          return (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-[#F3E2BD] bg-[#FFFCF5] p-3.5 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14.5px] font-semibold">{r.titulo}</span>
                <span className="text-[13px] text-hub-suave">
                  {diaComHora(r.inicio)}
                  {s ? (
                    <>
                      {" · sugestão: "}
                      <b className="font-semibold text-hub-tinta">{s.cliente.nome}</b>
                    </>
                  ) : (
                    " · nenhum convidado bate com um cliente"
                  )}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {s && (
                  <button
                    type="button"
                    disabled={vincular.isPending}
                    onClick={() =>
                      vincular.mutate({
                        id: r.id,
                        cliente: s.cliente,
                        deal: s.deal_id,
                        projeto: s.projeto,
                      })
                    }
                    aria-label={`Ligar ${r.titulo} a ${s.cliente.nome}`}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-hub-tinta bg-white px-4 text-[14px] font-semibold transition-colors hover:bg-hub-selecao disabled:opacity-60 sm:flex-none"
                  >
                    Ligar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => aoEscolher(r)}
                  className={
                    s
                      ? classeAcaoTexto
                      : "inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#DADAD3] bg-white px-4 text-[14px] font-medium hover:bg-hub-selecao sm:flex-none"
                  }
                >
                  {s ? "Outro cliente" : "Escolher cliente"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {total > itens.length && (
        <button type="button" onClick={aoVerTodas} className={`${classeAcaoTexto} self-start`}>
          Ver as {total} reuniões sem cliente
        </button>
      )}
    </section>
  );
}
