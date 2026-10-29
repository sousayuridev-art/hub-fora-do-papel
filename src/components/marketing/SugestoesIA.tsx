import { Loader2, MessageSquareQuote, PenLine, SpellCheck } from "lucide-react";

import { CartaoSugestao } from "@/components/marketing/CartaoSugestao";
import { useSugestoesIA } from "@/components/marketing/useSugestoesIA";
import { classeAcaoTexto } from "@/lib/estilos";
import { dolares, type TipoSugestao, type Versao } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/**
 * Sugestões da IA de uma versão (MK-3). A IA sugere; a pessoa decide o que usar.
 * Botões apagados sem briefing completo ou com o teto do mês atingido.
 */
export function SugestoesIA({
  v,
  faltaBriefing,
  ocupado,
}: {
  v: Versao;
  faltaBriefing: string[];
  ocupado: boolean;
}) {
  const { uso, lista, pedir, usar, descartar } = useSugestoesIA(v.id);
  const canal = v.canal_nome ?? v.channel;
  const u = uso.data;
  const noTeto = !!u && u.gasto >= u.teto;
  const noLimite = !!u && u.pedidos_hoje >= u.limite_diario;
  const semTexto = !(v.body ?? "").trim() && !(v.hook ?? "").trim();
  const bloqueado = faltaBriefing.length > 0 || noTeto || noLimite || !!v.published_at;
  const pedindo = pedir.isPending ? pedir.variables : null;

  const acoes: { tipo: TipoSugestao; rotulo: string; carregando: string; icone: typeof PenLine }[] =
    [
      {
        tipo: "versao",
        rotulo: "Sugerir esta versão",
        carregando: `Escrevendo a versão do ${canal}…`,
        icone: PenLine,
      },
      {
        tipo: "ganchos",
        rotulo: "Mais ganchos",
        carregando: "Pensando em cinco ganchos…",
        icone: MessageSquareQuote,
      },
      {
        tipo: "revisao",
        rotulo: "Revisar pela voz",
        carregando: "Revisando pela voz da marca…",
        icone: SpellCheck,
      },
    ];

  return (
    <section aria-label="Sugestões da IA" className="flex flex-col gap-3">
      <h3 className="text-[14px] font-medium">Sugestões da IA</h3>
      <div className="flex flex-wrap gap-2">
        {acoes.map((a) => {
          const desligado =
            bloqueado || ocupado || pedir.isPending || (a.tipo === "revisao" && semTexto);
          return (
            <button
              key={a.tipo}
              type="button"
              disabled={desligado}
              onClick={() => pedir.mutate(a.tipo)}
              className={cn(
                classeAcaoTexto,
                "gap-2 max-sm:w-full max-sm:justify-center",
                desligado && "opacity-50",
              )}
              title={
                a.tipo === "revisao" && semTexto ? "Escreva o gancho ou o texto antes" : undefined
              }
            >
              {pedindo === a.tipo ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <a.icone className="size-4" aria-hidden="true" />
              )}
              {pedindo === a.tipo ? a.carregando : a.rotulo}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {acoes.find((a) => a.tipo === pedindo)?.carregando ?? ""}
      </p>

      {faltaBriefing.length > 0 && !v.published_at && (
        <p className="rounded-xl bg-sit-neutro px-3 py-2.5 text-[13.5px] text-sit-neutro-t">
          A IA não inventa o briefing. Falta: {faltaBriefing.join(", ")}.
        </p>
      )}
      {noLimite && !noTeto && (
        <p className="rounded-xl bg-sit-atencao px-3 py-2.5 text-[13.5px] text-sit-atencao-t">
          Foram {u?.limite_diario} pedidos hoje, o limite do dia. Amanhã libera de novo.
        </p>
      )}

      {lista.isError && (
        <p className="rounded-xl bg-sit-risco px-3 py-2.5 text-[13.5px] text-sit-risco-t">
          Não foi possível carregar as sugestões.{" "}
          <button
            type="button"
            onClick={() => void lista.refetch()}
            className="font-semibold underline-offset-2 hover:underline"
          >
            Tentar de novo
          </button>
        </p>
      )}
      {(lista.data ?? []).map((s) => (
        <CartaoSugestao
          key={s.id}
          s={s}
          desativado={ocupado || usar.isPending || !!v.published_at}
          aoUsar={(campos, opcao) => usar.mutate({ id: s.id, campos, opcao })}
          aoDescartar={() => descartar.mutate(s.id)}
        />
      ))}

      {u && (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-[13px] tabular-nums",
            noTeto
              ? "bg-sit-risco text-sit-risco-t"
              : u.percentual >= 80
                ? "bg-sit-atencao text-sit-atencao-t"
                : "text-hub-suave",
          )}
        >
          Uso da IA neste mês: {dolares(u.gasto)} de {dolares(u.teto)}
          {noTeto
            ? ". O teto do mês foi atingido; as sugestões voltam no mês que vem."
            : u.percentual >= 80
              ? `. Já foi ${Math.min(u.percentual, 100)}% do teto.`
              : ""}
        </p>
      )}
    </section>
  );
}
