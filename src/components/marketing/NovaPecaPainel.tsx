import { useState } from "react";

import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import {
  formatosDe,
  rotuloFormato,
  type Campanha,
  type Canal,
  type Formato,
  type NovaPeca,
} from "@/lib/marketing";
import { cn } from "@/lib/utils";

/** Formato sugerido ao marcar o canal (o mais usado em cada um). */
const formatoInicial: Record<string, Formato> = {
  instagram: "carrossel",
  linkedin: "texto",
  tiktok: "video",
  youtube: "shorts",
};

/**
 * Nova peça (MK-1): a ideia e os canais. Cada canal marcado vira uma versão própria, que depois
 * ganha texto, roteiro e chamada do jeito daquele canal.
 */
export function NovaPecaPainel({
  aberto,
  aoMudar,
  canais,
  campanhas,
  campanhaInicial,
  aoCriar,
  criando,
}: {
  aberto: boolean;
  aoMudar: (a: boolean) => void;
  canais: Canal[];
  campanhas: Campanha[];
  campanhaInicial?: string | undefined;
  aoCriar: (v: NovaPeca) => void;
  criando: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [ideia, setIdeia] = useState("");
  const [prazo, setPrazo] = useState("");
  const [campanha, setCampanha] = useState<string>(campanhaInicial ?? "");
  const [marcados, setMarcados] = useState<Record<string, Formato | undefined>>({
    instagram: "carrossel",
  });

  const ativos = canais.filter((c) => c.ativo);
  const versoes = ativos
    .filter((c) => marcados[c.slug])
    .map((c) => ({ canal: c.slug, formato: marcados[c.slug] as Formato }));
  const valido = titulo.trim().length >= 2;

  function limpar() {
    setTitulo("");
    setIdeia("");
    setPrazo("");
    setMarcados({ instagram: "carrossel" });
  }

  function enviar() {
    if (!valido) return;
    aoCriar({
      titulo: titulo.trim(),
      versoes,
      campanha: campanha || null,
      prazo: prazo || null,
      ideia: ideia.trim() || null,
    });
    limpar();
    aoMudar(false);
  }

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova peça"
      descricao="Uma ideia, uma versão por canal. O briefing completo vem no próximo passo."
      rodape={
        <>
          <button type="button" className={classeBotaoSecundario} onClick={() => aoMudar(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={classeAcaoPrincipal}
            disabled={!valido || criando}
            onClick={enviar}
          >
            Criar peça
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <CampoTexto
          rotulo="Título"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          placeholder="Ex.: Por que a planilha trava quando a empresa cresce"
          required
        />
        <CampoArea
          rotulo="Ideia central (opcional)"
          valor={ideia}
          aoMudar={setIdeia}
          maxLength={400}
          linhas={3}
          ajuda="Uma frase: o que a pessoa precisa entender ou sentir."
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-[14px] font-medium">Canais e formato</legend>
          {ativos.map((c) => {
            const marcado = !!marcados[c.slug];
            return (
              <div
                key={c.slug}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center",
                  marcado ? "border-hub-tinta" : "border-hub-borda",
                )}
              >
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-[15px]">
                  <input
                    type="checkbox"
                    className="size-5 accent-[#0E1013]"
                    checked={marcado}
                    onChange={(e) =>
                      setMarcados((m) => ({
                        ...m,
                        [c.slug]: e.target.checked
                          ? (formatoInicial[c.slug] ?? formatosDe(c.slug)[0])
                          : undefined,
                      }))
                    }
                  />
                  {c.nome}
                </label>
                {marcado && (
                  <CampoEscolha
                    rotulo={`Formato no ${c.nome}`}
                    className="sm:w-56 [&>label]:sr-only"
                    valor={marcados[c.slug] ?? ""}
                    aoMudar={(f) => setMarcados((m) => ({ ...m, [c.slug]: f }))}
                    opcoes={formatosDe(c.slug).map((f) => ({ id: f, rotulo: rotuloFormato[f] }))}
                  />
                )}
              </div>
            );
          })}
          <p className="text-[13px] text-hub-suave">
            Pode criar sem canal e decidir depois, no briefing.
          </p>
        </fieldset>
        {campanhas.length > 0 && (
          <CampoEscolha
            rotulo="Campanha (opcional)"
            valor={campanha}
            aoMudar={setCampanha}
            opcoes={[
              { id: "", rotulo: "Sem campanha" },
              ...campanhas
                .filter((c) => c.status !== "encerrada")
                .map((c) => ({ id: c.id, rotulo: c.name })),
            ]}
          />
        )}
        <CampoTexto rotulo="Prazo (opcional)" tipo="date" valor={prazo} aoMudar={setPrazo} />
        <button type="submit" className="sr-only">
          Criar peça
        </button>
      </form>
    </PainelLateral>
  );
}
