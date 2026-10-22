import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { chavesProjetos, destravaProjeto, type Destrava } from "@/lib/projetos";

export type AcaoDestrava = Destrava["acao"];

/**
 * RD-10: "O que destrava o projeto". À esquerda, a ação principal única do momento (o banco
 * escolhe pela ordem de prioridade do card); à direita, o que está com o cliente.
 * Recarrega sozinho quando qualquer ação do projeto invalida ["projetos"].
 */
export function ProjetoDestrava({
  projetoId,
  aoAgir,
}: {
  projetoId: string;
  aoAgir: (acao: AcaoDestrava) => void;
}) {
  const q = useQuery({
    queryKey: chavesProjetos.destrava(projetoId),
    queryFn: () => destravaProjeto(projetoId),
  });

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível ver o que destrava o projeto"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div aria-busy="true" className="h-36 animate-pulse rounded-2xl bg-white" />;

  const { acao, responsavel, com_cliente } = q.data;
  return (
    <section
      aria-labelledby="destrava-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <h2 id="destrava-t" className="font-titulo text-lg font-bold">
        O que destrava o projeto
      </h2>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:items-stretch">
        <div className="flex flex-col gap-3 rounded-xl bg-[#F7F7F3] p-4 md:flex-row md:items-center md:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-hub-tinta">{acao.titulo}</p>
            <p className="text-[13.5px] text-hub-suave">{acao.apoio}</p>
          </div>
          <button
            type="button"
            className={classeAcaoPrincipal.replace("sm:w-auto", "md:w-auto md:shrink-0")}
            onClick={() => aoAgir(acao)}
          >
            {acao.botao}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-hub-borda p-4 text-[14px]">
          <p className="font-semibold text-hub-tinta">
            Com {responsavel}:{com_cliente.length === 0 ? " nada pendente" : ""}
          </p>
          {com_cliente.length > 0 && (
            <ul className="flex flex-col gap-1 text-[#2A2D33]">
              {com_cliente.map((i) => (
                <li key={i.tipo + i.id} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[#7A4200]"
                  />
                  <span className="min-w-0">{i.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
