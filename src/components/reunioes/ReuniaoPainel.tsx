import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { TranscricaoLista } from "@/components/reunioes/TranscricaoLista";
import { VinculoReuniao } from "@/components/reunioes/VinculoReuniao";
import { diaComHora } from "@/lib/formatar";
import {
  abrirReuniao,
  chavesReunioes,
  duracao,
  rotuloSituacao,
  type Reuniao,
} from "@/lib/reunioes";
import { classeLinkTexto } from "@/lib/estilos";

/** Painel da reunião: dados, vínculo com o cliente e transcrição (card RE-1). */
export function ReuniaoPainel({
  reuniao,
  aoFechar,
}: {
  reuniao: Reuniao | null;
  aoFechar: () => void;
}) {
  const r = useQuery({
    queryKey: chavesReunioes.uma(reuniao?.id ?? "nenhuma"),
    queryFn: () => abrirReuniao(reuniao?.id ?? ""),
    enabled: Boolean(reuniao),
  });
  const dados = r.data;
  const resumo = reuniao
    ? [
        diaComHora(reuniao.inicio),
        duracao(reuniao.inicio, reuniao.fim),
        rotuloSituacao[reuniao.situacao],
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <PainelLateral
      aberto={reuniao !== null}
      aoMudar={(a) => !a && aoFechar()}
      titulo={reuniao?.titulo ?? "Reunião"}
      descricao={resumo}
    >
      {r.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="h-32 animate-pulse rounded-xl bg-hub-fundo" />
          <div className="h-64 animate-pulse rounded-xl bg-hub-fundo" />
        </div>
      ) : r.isError || !dados ? (
        <EstadoErro
          titulo="Não foi possível abrir a reunião"
          aoTentarDeNovo={() => void r.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="vinculo-t">
            <h3 id="vinculo-t" className="text-[16px] font-semibold">
              De quem é esta reunião
            </h3>
            {dados.cliente && (
              <p className="text-[14.5px] text-hub-suave">
                Ligada a{" "}
                <Link
                  to="/app/clientes/$id"
                  params={{ id: dados.cliente.id }}
                  search={{ aba: "reunioes" }}
                  className={`${classeLinkTexto}`}
                >
                  {dados.cliente.nome}
                </Link>
                {dados.vinculo === "email" ? " pelo e-mail de um convidado." : "."}
              </p>
            )}
            {/* A chave reinicia o formulário quando o vínculo muda do servidor. */}
            <VinculoReuniao
              key={`${dados.id}-${dados.cliente?.id ?? ""}-${dados.projeto?.id ?? ""}`}
              r={dados}
            />
          </section>

          {dados.lista_convidados.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="convidados-t">
              <h3 id="convidados-t" className="text-[16px] font-semibold">
                Convidados
              </h3>
              <ul className="flex flex-col gap-1 text-[14.5px]">
                {dados.lista_convidados.map((c) => (
                  <li key={c.email} className="truncate">
                    {c.nome ? `${c.nome} · ` : ""}
                    <span className="text-hub-suave">{c.email}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-2" aria-labelledby="transcricao-t">
            <h3 id="transcricao-t" className="text-[16px] font-semibold">
              Transcrição
            </h3>
            {dados.situacao === "sem_transcricao" ? (
              <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px] text-hub-suave">
                Esta reunião terminou sem transcrição. Na próxima, ligue a transcrição no Meet logo
                no início.
              </p>
            ) : (
              <TranscricaoLista falas={dados.falas} />
            )}
          </section>
        </div>
      )}
    </PainelLateral>
  );
}
