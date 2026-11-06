import { Link } from "@tanstack/react-router";
import { ChevronRight, Eye, Hand } from "lucide-react";

import { diaMes, dataLocal } from "@/lib/formatar";
import {
  nomeDoTipo,
  oQueFalta,
  prontoParaAprovar,
  situacaoDoAjuste,
  type Revisao,
} from "@/lib/revisao";
import { cn } from "@/lib/utils";

const tons = {
  neutro: "bg-sit-neutro text-sit-neutro-t",
  info: "bg-sit-info text-sit-info-t",
  atencao: "bg-sit-atencao text-sit-atencao-t",
  ok: "bg-sit-ok text-sit-ok-t",
  risco: "bg-sit-risco text-sit-risco-t",
};

/** Acompanhar a revisão (card RS-3, tela 07): progresso, o que espera o cliente e cada ajuste. */
export function AcompanharRevisao({ r, aoMarcarMais }: { r: Revisao; aoMarcarMais: () => void }) {
  const ultima = r.rodadas[0];
  const todos = r.rodadas.flatMap((d) => d.ajustes);
  const paraVer = todos.filter((a) => a.situacao === "para_ver");
  const prontos = ultima
    ? ultima.ajustes.filter((a) => a.situacao === "para_ver" || a.situacao === "aprovado").length
    : 0;
  const pronto = prontoParaAprovar(r);
  const falta = oQueFalta(r);
  const naLista = r.rascunho?.itens.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="text-[13.5px] font-medium text-hub-suave">Meu site · {r.site.nome}</span>
        <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[44px]">
          {r.aprovado_em ? "Site aprovado" : `Revisão ${ultima?.numero ?? 1}`}
        </h1>
        {r.aprovado_em && (
          <p className="text-[15px] text-hub-suave">
            Aprovado em {diaMes(dataLocal(r.aprovado_em))}
            {r.aprovado_por ? ` por ${r.aprovado_por}` : ""}. Mudanças novas são pedidos de ajuste.
          </p>
        )}
      </header>

      {ultima && !r.aprovado_em && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-hub-borda bg-white p-4">
          <div className="flex justify-between text-[15px] tabular-nums">
            <b>
              {prontos} de {ultima.ajustes.length} prontos
            </b>
            <span className="text-hub-suave">
              enviada em {diaMes(dataLocal(ultima.enviada_em))}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E9E9E3]">
            <i
              className="block h-full rounded-full bg-sit-ok-t"
              style={{
                width: `${ultima.ajustes.length ? (prontos / ultima.ajustes.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {paraVer[0] && (
        <Link
          to="/portal/site/revisar/$pedido"
          params={{ pedido: paraVer[0].id }}
          className="flex items-center gap-3 rounded-2xl bg-hub-tinta p-4 text-[#F5F5F2]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFB020] text-hub-tinta">
            <Eye className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-[15px]">
              {paraVer.length === 1
                ? "1 ajuste espera você"
                : `${paraVer.length} ajustes esperam você`}
            </b>
            <span className="text-[14px] text-[#C7CBD6]">Veja o antes e o depois</span>
          </span>
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      )}

      {r.rodadas.map((d) => (
        <section key={d.id} aria-labelledby={`rev-${d.id}`} className="flex flex-col gap-2">
          {r.rodadas.length > 1 && (
            <h2 id={`rev-${d.id}`} className="text-[15px] font-semibold text-hub-suave">
              Revisão {d.numero}
            </h2>
          )}
          <ul className="flex flex-col gap-2">
            {d.ajustes.map((a) => {
              const s = situacaoDoAjuste[a.situacao];
              const conferir = a.situacao === "para_ver" || a.situacao === "aprovado";
              const conteudo = (
                <>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hub-tinta text-[13px] font-bold text-white tabular-nums">
                    {a.ordem}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-hub-suave">
                      {nomeDoTipo(a.tipo)} · {a.secao ?? a.pagina}
                    </span>
                    <span className="block truncate text-[15px] text-hub-tinta">
                      {a.depois ?? a.descricao ?? "Ajuste"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold",
                      tons[s.tom],
                    )}
                  >
                    {s.rotulo}
                  </span>
                </>
              );
              return (
                <li key={a.id}>
                  {conferir ? (
                    <Link
                      to="/portal/site/revisar/$pedido"
                      params={{ pedido: a.id }}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-hub-borda bg-white p-3 hover:border-hub-tinta"
                    >
                      {conteudo}
                    </Link>
                  ) : a.situacao === "orcamento" ? (
                    <Link
                      to="/portal/aprovacoes"
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-hub-borda bg-white p-3 hover:border-hub-tinta"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-hub-borda bg-white p-3">
                      {conteudo}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {!r.aprovado_em && (
        <div className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-4">
          {pronto ? (
            <>
              <p className="text-[15px]">
                <b>Tudo conferido.</b> Se estiver tudo certo, falta a aprovação final do site.
              </p>
              <Link
                to="/portal/site/revisar/aprovar"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#FFB020] px-6 text-base font-semibold text-hub-tinta md:self-start"
              >
                Aprovar o site
              </Link>
            </>
          ) : (
            falta && (
              <p className="text-[14.5px] text-hub-suave">Antes de aprovar o site: {falta}.</p>
            )
          )}
          <button
            type="button"
            onClick={aoMarcarMais}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold text-hub-tinta md:self-start"
          >
            <Hand className="size-4" aria-hidden="true" />
            {naLista > 0
              ? `Continuar a lista (${naLista})`
              : `Marcar ajustes da revisão ${r.proxima}`}
          </button>
          {r.proxima > r.incluidas && naLista === 0 && (
            <p className="text-[13.5px] text-hub-suave">
              As {r.incluidas} revisões incluídas já foram usadas: a próxima provavelmente será
              serviço adicional, com o valor para você aprovar antes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
