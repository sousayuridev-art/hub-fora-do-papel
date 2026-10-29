import { CircleAlert, CircleCheck, Clock, Send } from "lucide-react";

import { diaComHora } from "@/lib/formatar";
import type { Etapa, Versao } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/**
 * Publicar sozinho (MK-5): a versão aprovada e agendada sai pelo n8n (Upload-Post) na data marcada.
 * A pessoa liga e desliga; qualquer mudança na versão tira da fila e o aviso fica aqui.
 */
export function PublicarSozinho({
  v,
  etapa,
  aoMudar,
  ocupado,
}: {
  v: Versao;
  etapa: Etapa;
  aoMudar: (ligar: boolean) => void;
  ocupado: boolean;
}) {
  if (v.published_at || etapa !== "pronto") return null;
  const situacao = v.publicacao ?? "manual";
  const ligado = !!v.publicar_sozinho && situacao === "na_fila";
  const semData = !v.scheduled_at;
  const enviada = situacao === "enviada";
  // Data que já passou (ex.: falhou na hora): precisa de uma data nova antes de ligar de novo.
  const dataPassou =
    !!v.scheduled_at && new Date(v.scheduled_at).getTime() < Date.now() + 2 * 60_000;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hub-borda bg-white p-3">
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-[14px] font-medium">Publicar sozinho na data marcada</span>
          <span className="text-[12.5px] text-hub-suave">
            {semData
              ? "Marque a data e a hora abaixo para ligar."
              : "Sai pelo Upload-Post, com o texto e os arquivos aprovados."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={ligado}
          className="size-6 shrink-0 accent-[#0E1013]"
          checked={ligado || enviada}
          disabled={ocupado || enviada || (semData && !ligado)}
          onChange={(e) => aoMudar(e.target.checked)}
        />
      </label>

      {ligado && v.scheduled_at && (
        <p className="flex items-center gap-2 rounded-lg bg-sit-info px-3 py-2 text-[13.5px] text-sit-info-t">
          <Clock className="size-4 shrink-0" aria-hidden="true" /> Na fila para{" "}
          {diaComHora(v.scheduled_at)}.
        </p>
      )}
      {enviada && (
        <p className="flex items-center gap-2 rounded-lg bg-sit-info px-3 py-2 text-[13.5px] text-sit-info-t">
          <Send className="size-4 shrink-0" aria-hidden="true" /> Enviada para a rede
          {v.publicacao_em ? ` em ${diaComHora(v.publicacao_em)}` : ""}. Esperando a confirmação.
        </p>
      )}
      {v.publicacao_erro && !ligado && !enviada && (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-lg px-3 py-2 text-[13.5px]",
            situacao === "falhou"
              ? "bg-sit-risco text-sit-risco-t"
              : "bg-sit-atencao text-sit-atencao-t",
          )}
          role="status"
        >
          <span className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {situacao === "falhou" ? `Não saiu: ${v.publicacao_erro}` : v.publicacao_erro}
          </span>
          <span className="flex flex-wrap gap-2">
            {dataPassou && (
              <span className="self-center text-[12.5px]">
                Marque uma nova data abaixo e ligue de novo.
              </span>
            )}
            {!semData && !dataPassou && (
              <button
                type="button"
                className="min-h-11 rounded-lg bg-white/70 px-3 font-medium text-hub-tinta hover:bg-white md:min-h-9"
                disabled={ocupado}
                onClick={() => aoMudar(true)}
              >
                {situacao === "falhou" ? "Tentar de novo" : "Ligar de novo"}
              </button>
            )}
            <button
              type="button"
              className="min-h-11 rounded-lg px-3 font-medium text-hub-tinta hover:bg-white/50 md:min-h-9"
              disabled={ocupado}
              onClick={() => aoMudar(false)}
            >
              Vou publicar à mão
            </button>
          </span>
        </div>
      )}
      {situacao === "manual" && !v.publicacao_erro && !semData && (
        <p className="flex items-center gap-2 text-[12.5px] text-hub-suave">
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" /> Desligado: você publica e
          cola o link abaixo.
        </p>
      )}
    </div>
  );
}
