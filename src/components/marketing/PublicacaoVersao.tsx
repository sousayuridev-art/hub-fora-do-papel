import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { CampoTexto, classeEntrada } from "@/components/hub/Campo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import type { Etapa, Resultados, Versao } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/** ISO → valor do campo datetime-local (hora local do navegador). */
function paraCampo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const doCampo = (v: string) => (v ? new Date(v).toISOString() : null);

const metricas: { id: keyof Omit<Resultados, "registrado_em">; rotulo: string }[] = [
  { id: "alcance", rotulo: "Alcance" },
  { id: "salvamentos", rotulo: "Salvamentos" },
  { id: "cliques", rotulo: "Cliques no link" },
  { id: "mensagens", rotulo: "Mensagens" },
];

/**
 * Agenda, publicação e resultados de uma versão. Até o MK-5 a publicação é feita pela pessoa
 * na rede; aqui ela marca a data e cola o link. Resultados são digitados da própria rede.
 */
export function PublicacaoVersao({
  v,
  etapa,
  aoAgendar,
  aoPublicar,
  aoRegistrar,
  ocupado,
}: {
  v: Versao;
  etapa: Etapa;
  aoAgendar: (quando: string | null) => void;
  aoPublicar: (link: string, quando: string | null) => void;
  aoRegistrar: (r: Resultados) => void;
  ocupado: boolean;
}) {
  const [quando, setQuando] = useState(paraCampo(v.scheduled_at));
  const [link, setLink] = useState(v.published_url ?? "");
  const [publicadaEm, setPublicadaEm] = useState("");
  const [r, setR] = useState<Record<string, string>>(() =>
    Object.fromEntries(metricas.map((m) => [m.id, v.results?.[m.id]?.toString() ?? ""])),
  );

  if (!["pronto", "publicado", "analisado"].includes(etapa))
    return (
      <p className="rounded-xl bg-sit-neutro px-3 py-2.5 text-[14px] text-sit-neutro-t">
        Agendar e publicar ficam liberados depois da aprovação.
      </p>
    );

  if (!v.published_at)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`agenda-${v.id}`} className="text-[14px] font-medium">
            Data planejada
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`agenda-${v.id}`}
              type="datetime-local"
              className={cn(classeEntrada, "h-11")}
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
            />
            <button
              type="button"
              className={classeBotaoSecundario}
              disabled={ocupado || !quando || doCampo(quando) === v.scheduled_at}
              onClick={() => aoAgendar(doCampo(quando))}
            >
              Salvar data
            </button>
            {v.scheduled_at && (
              <button
                type="button"
                className={classeBotaoSecundario}
                disabled={ocupado}
                onClick={() => {
                  setQuando("");
                  aoAgendar(null);
                }}
              >
                Tirar data
              </button>
            )}
          </div>
          <p className="text-[13px] text-hub-suave">
            A data entra no calendário. A publicação na rede ainda é feita por você.
          </p>
        </div>
        <form
          className="flex flex-col gap-3 rounded-2xl border border-hub-borda p-4"
          onSubmit={(e) => {
            e.preventDefault();
            aoPublicar(link.trim(), doCampo(publicadaEm));
          }}
        >
          <b className="text-[15px]">Já publicou?</b>
          <CampoTexto
            rotulo="Link do post"
            tipo="url"
            inputMode="url"
            valor={link}
            aoMudar={setLink}
            placeholder="https://"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`publicada-${v.id}`} className="text-[14px] font-medium">
              Quando saiu (se não foi agora)
            </label>
            <input
              id={`publicada-${v.id}`}
              type="datetime-local"
              className={cn(classeEntrada, "h-11")}
              value={publicadaEm}
              max={paraCampo(new Date().toISOString())}
              onChange={(e) => setPublicadaEm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={cn(classeBotaoSecundario, "self-start")}
            disabled={ocupado || !link.trim().startsWith("https://")}
          >
            Marcar como publicada
          </button>
        </form>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-sit-ok px-3 py-2.5 text-[14px] text-sit-ok-t">
        Publicada em {diaComHora(v.published_at)}
        {v.published_url && (
          <a
            href={v.published_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-1 font-semibold underline-offset-2 hover:underline"
          >
            Abrir o post <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const saida: Resultados = {};
          for (const m of metricas) {
            const t = (r[m.id] ?? "").trim();
            if (t !== "") saida[m.id] = Number(t);
          }
          aoRegistrar(saida);
        }}
      >
        <b className="text-[15px]">Resultados</b>
        <p className="text-[13px] text-hub-suave">
          Copie os números do painel da rede, uma semana depois de publicar. Deixe em branco o que a
          rede não mostra.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {metricas.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <label htmlFor={`${m.id}-${v.id}`} className="text-[14px] font-medium">
                {m.rotulo}
              </label>
              <input
                id={`${m.id}-${v.id}`}
                inputMode="numeric"
                pattern="[0-9]*"
                className={cn(classeEntrada, "h-11 tabular-nums")}
                value={r[m.id] ?? ""}
                onChange={(e) => setR((x) => ({ ...x, [m.id]: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className={cn(classeBotaoSecundario, "self-start")}
          disabled={ocupado || metricas.every((m) => !(r[m.id] ?? "").trim())}
        >
          Salvar resultados
        </button>
      </form>
    </div>
  );
}
