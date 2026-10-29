import { useEffect, useState } from "react";

import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import {
  rotuloFrente,
  rotuloFunil,
  rotuloObjetivo,
  rotuloSituacaoCampanha,
  type Campanha,
  type CamposCampanha,
  type Frente,
  type Funil,
  type Objetivo,
  type SituacaoCampanha,
} from "@/lib/marketing";

const opcoes = <T extends string>(r: Record<T, string>) =>
  (Object.keys(r) as T[]).map((id) => ({ id, rotulo: r[id] }));

type Rascunho = {
  nome: string;
  objetivo: Objetivo | "";
  funil: Funil | "";
  frente: Frente | "";
  inicio: string;
  fim: string;
  situacao: SituacaoCampanha;
  descricao: string;
};

const vazio: Rascunho = {
  nome: "",
  objetivo: "",
  funil: "",
  frente: "",
  inicio: "",
  fim: "",
  situacao: "planejada",
  descricao: "",
};

/** Criar ou editar uma campanha: nome, objetivo, etapa do funil, frente, período e situação. */
export function CampanhaPainel({
  aberto,
  campanha,
  aoMudar,
  aoSalvar,
  aoRemover,
  salvando,
}: {
  aberto: boolean;
  campanha: Campanha | null;
  aoMudar: (a: boolean) => void;
  aoSalvar: (id: string | null, c: CamposCampanha) => void;
  aoRemover: (id: string) => void;
  salvando: boolean;
}) {
  const [r, setR] = useState<Rascunho>(vazio);
  useEffect(() => {
    if (!aberto) return;
    setR(
      campanha
        ? {
            nome: campanha.name,
            objetivo: campanha.objective ?? "",
            funil: campanha.funnel ?? "",
            frente: campanha.front ?? "",
            inicio: campanha.starts_on ?? "",
            fim: campanha.ends_on ?? "",
            situacao: campanha.status,
            descricao: campanha.description ?? "",
          }
        : vazio,
    );
  }, [aberto, campanha]);

  const periodoRuim = !!r.inicio && !!r.fim && r.fim < r.inicio;
  const valido = r.nome.trim().length >= 2 && !periodoRuim;
  const salvar = () => {
    if (!valido) return;
    aoSalvar(campanha?.id ?? null, {
      nome: r.nome.trim(),
      objetivo: r.objetivo || null,
      funil: r.funil || null,
      frente: r.frente || null,
      inicio: r.inicio || null,
      fim: r.fim || null,
      situacao: r.situacao,
      descricao: r.descricao.trim() || null,
    });
    aoMudar(false);
  };
  const muda =
    <K extends keyof Rascunho>(k: K) =>
    (v: Rascunho[K]) =>
      setR((x) => ({ ...x, [k]: v }));

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={campanha ? "Editar campanha" : "Nova campanha"}
      descricao="Uma campanha junta peças com o mesmo objetivo e período."
      rodape={
        <>
          {campanha && (
            <button
              type="button"
              className={`${classeBotaoSecundario} text-sit-risco-t sm:mr-auto`}
              onClick={() => {
                aoRemover(campanha.id);
                aoMudar(false);
              }}
            >
              Remover
            </button>
          )}
          <button type="button" className={classeBotaoSecundario} onClick={() => aoMudar(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={classeAcaoPrincipal}
            disabled={!valido || salvando}
            onClick={salvar}
          >
            Salvar campanha
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <CampoTexto
          rotulo="Nome"
          valor={r.nome}
          aoMudar={muda("nome")}
          maxLength={80}
          placeholder="Ex.: Central de Atendimento · novembro"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoEscolha<Objetivo>
            rotulo="Objetivo"
            valor={r.objetivo}
            vazio="Escolha"
            aoMudar={muda("objetivo")}
            opcoes={opcoes(rotuloObjetivo)}
          />
          <CampoEscolha<Funil>
            rotulo="Etapa do funil"
            valor={r.funil}
            vazio="Escolha"
            aoMudar={muda("funil")}
            opcoes={opcoes(rotuloFunil)}
          />
          <CampoEscolha<Frente>
            rotulo="Frente"
            valor={r.frente}
            vazio="Escolha"
            aoMudar={muda("frente")}
            opcoes={opcoes(rotuloFrente)}
          />
          <CampoEscolha<SituacaoCampanha>
            rotulo="Situação"
            valor={r.situacao}
            aoMudar={muda("situacao")}
            opcoes={opcoes(rotuloSituacaoCampanha)}
          />
          <CampoTexto rotulo="Início" tipo="date" valor={r.inicio} aoMudar={muda("inicio")} />
          <CampoTexto
            rotulo="Fim"
            tipo="date"
            valor={r.fim}
            aoMudar={muda("fim")}
            {...(r.inicio && { min: r.inicio })}
            {...(periodoRuim && { ajuda: "O fim vem depois do início." })}
          />
        </div>
        <CampoArea
          rotulo="Descrição"
          valor={r.descricao}
          aoMudar={muda("descricao")}
          maxLength={1000}
          linhas={4}
          ajuda="A mensagem principal e o que a campanha quer mudar."
        />
        <button type="submit" className="sr-only">
          Salvar campanha
        </button>
      </form>
    </PainelLateral>
  );
}
