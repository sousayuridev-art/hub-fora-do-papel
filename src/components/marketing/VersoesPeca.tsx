import { useState } from "react";
import { Plus } from "lucide-react";

import { CampoEscolha } from "@/components/hub/Campo";
import { SiglaCanal } from "@/components/marketing/SiglaCanal";
import { VersaoEditor } from "@/components/marketing/VersaoEditor";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import {
  formatosDe,
  rotuloFormato,
  type Canal,
  type CamposVersao,
  type Formato,
  type PecaDetalhe,
  type Resultados,
} from "@/lib/marketing";
import { cn } from "@/lib/utils";

export type AcoesVersao = {
  salvar: (id: string, c: CamposVersao) => void;
  adicionar: (canal: string, formato: Formato, copiarDe: string | null) => void;
  remover: (id: string) => void;
  agendar: (id: string, quando: string | null) => void;
  publicar: (id: string, link: string, quando: string | null) => void;
  registrar: (id: string, r: Resultados) => void;
};

/**
 * Versões da peça em abas por canal (MK-1). "Usar como base" cria outra versão a partir desta,
 * para adaptar ao outro canal em vez de copiar o mesmo post.
 */
export function VersoesPeca({
  p,
  canais,
  acoes,
  ocupado,
}: {
  p: PecaDetalhe;
  canais: Canal[];
  acoes: AcoesVersao;
  ocupado: boolean;
}) {
  const [ativaId, setAtivaId] = useState<string | null>(p.versoes[0]?.id ?? null);
  const [novo, setNovo] = useState<{ canal: string; formato: Formato; base: string | null } | null>(
    null,
  );
  const publicadaToda = ["publicado", "analisado"].includes(p.stage);
  const ativa = p.versoes.find((v) => v.id === ativaId) ?? p.versoes[0] ?? null;
  const ativos = canais.filter((c) => c.ativo);

  const abrirNovo = (base: string | null) => {
    const canal = ativos.find((c) => !p.versoes.some((v) => v.channel === c.slug)) ?? ativos[0];
    if (!canal) return;
    setNovo({ canal: canal.slug, formato: formatosDe(canal.slug)[0] as Formato, base });
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Versões por canal"
      >
        {p.versoes.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={ativa?.id === v.id}
            onClick={() => setAtivaId(v.id)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-[14.5px]",
              ativa?.id === v.id
                ? "border-hub-tinta bg-white font-semibold"
                : "border-hub-borda bg-[#FAFAF7] text-[#4A4D54] hover:text-hub-tinta",
            )}
          >
            <SiglaCanal canal={v.channel} nome={v.canal_nome} publicada={!!v.published_at} />
            {rotuloFormato[v.format]}
            {v.warnings.some((a) => a.bloqueia) && (
              <span
                aria-label="com aviso que bloqueia"
                className="size-2 rounded-full bg-sit-risco-t"
              />
            )}
          </button>
        ))}
        {!publicadaToda && !novo && (
          <button
            type="button"
            onClick={() => abrirNovo(null)}
            className={`${classeAcaoTexto} gap-2`}
          >
            <Plus className="size-4" aria-hidden="true" /> Versão
          </button>
        )}
      </div>

      {novo && (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-hub-borda p-4 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            acoes.adicionar(novo.canal, novo.formato, novo.base);
            setNovo(null);
          }}
        >
          <CampoEscolha
            rotulo="Canal"
            className="flex-1"
            valor={novo.canal}
            aoMudar={(c) => setNovo({ ...novo, canal: c, formato: formatosDe(c)[0] as Formato })}
            opcoes={ativos.map((c) => ({ id: c.slug, rotulo: c.nome }))}
          />
          <CampoEscolha<Formato>
            rotulo="Formato"
            className="flex-1"
            valor={novo.formato}
            aoMudar={(f) => setNovo({ ...novo, formato: f })}
            opcoes={formatosDe(novo.canal).map((f) => ({ id: f, rotulo: rotuloFormato[f] }))}
          />
          <span className="flex gap-2">
            <button type="button" className={classeBotaoSecundario} onClick={() => setNovo(null)}>
              Cancelar
            </button>
            <button type="submit" className={classeBotaoSecundario} disabled={ocupado}>
              {novo.base ? "Criar a partir desta" : "Adicionar"}
            </button>
          </span>
        </form>
      )}

      {ativa ? (
        <VersaoEditor
          key={ativa.id}
          v={ativa}
          etapa={p.stage}
          unica={p.versoes.length === 1}
          ocupado={ocupado}
          aoSalvar={(c) => acoes.salvar(ativa.id, c)}
          aoDuplicar={() => abrirNovo(ativa.id)}
          aoRemover={() => acoes.remover(ativa.id)}
          aoAgendar={(q) => acoes.agendar(ativa.id, q)}
          aoPublicar={(l, q) => acoes.publicar(ativa.id, l, q)}
          aoRegistrar={(r) => acoes.registrar(ativa.id, r)}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] p-6 text-center text-[14.5px] text-hub-suave">
          Nenhuma versão ainda. Escolha o primeiro canal em “Versão”.
        </p>
      )}
    </div>
  );
}
