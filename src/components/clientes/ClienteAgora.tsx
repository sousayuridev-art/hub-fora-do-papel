import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Selo } from "@/components/hub/Selo";
import { chavesAgora, clientesAgora } from "@/lib/clientes";
import { classeAcaoTexto } from "@/lib/estilos";

const textoSaude = { ok: "No ritmo", atencao: "Pede atenção", risco: "Em risco" } as const;
const tomSaude = { ok: "ok", atencao: "atencao", risco: "risco" } as const;

/**
 * "Agora" na página do cliente (RD2-5): o projeto em andamento com fase e saúde, e os pedidos
 * abertos. Some quando não há nada acontecendo (a oportunidade aparece no cartão dela).
 */
export function ClienteAgora({ clienteId }: { clienteId: string }) {
  const q = useQuery({ queryKey: chavesAgora, queryFn: clientesAgora });
  const a = q.data?.itens[clienteId];
  if (!a || (!a.projeto && a.pedidos_abertos === 0)) return null;
  const p = a.projeto;
  const motivo = p?.saude.motivos[0]?.texto;

  return (
    <section
      aria-labelledby="agora-t"
      className="flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-5"
    >
      <h2 id="agora-t" className="text-[15.5px] font-semibold">
        Agora
      </h2>
      {p && (
        <Link
          to="/app/projetos/$id"
          params={{ id: p.id }}
          className="flex items-start justify-between gap-3 rounded-xl border border-[#EEF1F5] p-4 hover:bg-[#F9FAFC]"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <b className="font-semibold">{p.nome}</b>
            <span className="text-[13.5px] text-hub-suave">
              {p.fase_posicao && p.fases_total
                ? `Fase ${p.fase_posicao} de ${p.fases_total}${p.fase_nome ? ` · ${p.fase_nome}` : ""}`
                : "Sem fases"}
              {motivo ? ` · ${motivo}` : ""}
            </span>
            {p.fases_total > 0 && (
              <span aria-hidden="true" className="mt-1 flex gap-1">
                {Array.from({ length: p.fases_total }, (_, i) => (
                  <i
                    key={i}
                    className={
                      p.fase_posicao && i + 1 < p.fase_posicao
                        ? "h-1.5 w-8 rounded-full bg-hub-tinta"
                        : p.fase_posicao === i + 1
                          ? "h-1.5 w-8 rounded-full bg-[#FFB020]"
                          : "h-1.5 w-8 rounded-full bg-[#E3E7ED]"
                    }
                  />
                ))}
              </span>
            )}
          </span>
          <span className="shrink-0">
            <Selo tom={tomSaude[p.saude.nivel]}>{textoSaude[p.saude.nivel]}</Selo>
          </span>
        </Link>
      )}
      {a.pedidos_abertos > 0 && (
        <Link
          to="/app/pedidos"
          search={{ cliente: clienteId, vista: "lista" }}
          className={`${classeAcaoTexto} self-start`}
        >
          {a.pedidos_abertos === 1 ? "1 pedido aberto" : `${a.pedidos_abertos} pedidos abertos`} ›
        </Link>
      )}
    </section>
  );
}
