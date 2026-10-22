import { useEffect, useState } from "react";

import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { CampoTexto } from "@/components/propostas/CampoTexto";
import { Opcoes } from "@/components/propostas/Opcoes";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { isoDoDia, moeda } from "@/lib/formatar";
import {
  rotuloPlataforma,
  type CampanhaPainel,
  type PainelTrafego,
  type Plataforma,
} from "@/lib/trafego";

const plataformas: { id: Plataforma; rotulo: string }[] = [
  { id: "google", rotulo: rotuloPlataforma.google },
  { id: "meta", rotulo: rotuloPlataforma.meta },
];

/** Registrar investimento: campanha, data, valor, cliques e observação. */
export function RegistrarInvestimentoPainel({
  aberto,
  aoFechar,
  campanhas,
  campanhaInicial = null,
  aoSalvar,
  aoNovaCampanha,
}: {
  aberto: boolean;
  aoFechar: () => void;
  campanhas: CampanhaPainel[];
  /** "Lançar valor" na linha da campanha já abre com ela escolhida. */
  campanhaInicial?: string | null;
  aoSalvar: (v: {
    campanha: string;
    data: string;
    valorCents: number;
    cliques: number | null;
    nota: string;
  }) => void;
  aoNovaCampanha: () => void;
}) {
  const ativas = campanhas.filter((c) => c.ativa);
  const [campanha, setCampanha] = useState("");
  const [data, setData] = useState(isoDoDia(new Date()));
  const [valor, setValor] = useState<number | null>(null);
  const [cliques, setCliques] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  useEffect(() => {
    if (aberto) {
      setCampanha(campanhaInicial ?? ativas[0]?.id ?? campanhas[0]?.id ?? "");
      setData(isoDoDia(new Date()));
      setValor(null);
      setCliques(null);
      setNota("");
    }
    // Reinicia só ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  const pronto = Boolean(campanha) && (valor ?? 0) > 0 && Boolean(data);

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Registrar investimento"
      descricao="Lance cada cobrança da Meta ou do Google na campanha certa."
      rodape={
        <>
          <button type="button" className={classeBotaoSecundario} onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${classeAcaoPrincipal} disabled:opacity-50`}
            disabled={!pronto}
            onClick={() => {
              aoSalvar({
                campanha,
                data,
                valorCents: valor ?? 0,
                cliques: cliques == null ? null : Math.round(cliques),
                nota,
              });
              aoFechar();
            }}
          >
            Registrar
          </button>
        </>
      }
    >
      {campanhas.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-hub-suave">
            Cadastre a campanha antes de lançar o investimento.
          </p>
          <button type="button" className={classeBotaoSecundario} onClick={aoNovaCampanha}>
            Nova campanha
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inv-campanha" className="text-[14px] font-medium">
              Campanha
            </label>
            <select
              id="inv-campanha"
              value={campanha}
              onChange={(e) => setCampanha(e.target.value)}
              className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px]"
            >
              {campanhas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {rotuloPlataforma[c.plataforma]}
                  {c.ativa ? "" : " (pausada)"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inv-data" className="text-[14px] font-medium">
                Data da cobrança
              </label>
              <input
                id="inv-data"
                type="date"
                value={data}
                max={isoDoDia(new Date())}
                onChange={(e) => setData(e.target.value)}
                className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px]"
              />
            </div>
            <CampoNumero
              rotulo="Valor"
              prefixo="R$"
              escala={100}
              casas={2}
              valor={valor}
              aoMudar={setValor}
            />
          </div>
          <CampoNumero
            rotulo="Cliques (opcional)"
            casas={0}
            valor={cliques}
            aoMudar={setCliques}
            ajuda="Está no relatório da plataforma. Ajuda a ver a taxa do clique ao contato."
          />
          <CampoTexto
            rotulo="Observação (opcional)"
            valor={nota}
            max={300}
            aoMudar={setNota}
            placeholder="Ex.: cobrança semanal"
          />
        </div>
      )}
    </PainelLateral>
  );
}

/** Nova campanha ou editar (nome, plataforma, ativa/pausada). */
export function CampanhaPainel({
  aberto,
  aoFechar,
  campanha,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  campanha: CampanhaPainel | null;
  aoSalvar: (v: {
    id: string | null;
    nome: string;
    plataforma: Plataforma;
    ativa: boolean;
  }) => void;
}) {
  const [nome, setNome] = useState("");
  const [plataforma, setPlataforma] = useState<Plataforma>("meta");
  const [ativa, setAtiva] = useState(true);
  useEffect(() => {
    if (aberto) {
      setNome(campanha?.nome ?? "");
      setPlataforma(campanha?.plataforma ?? "meta");
      setAtiva(campanha?.ativa ?? true);
    }
  }, [aberto, campanha]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo={campanha ? "Editar campanha" : "Nova campanha"}
      descricao='Use o mesmo nome do anúncio. É ele que liga o contato à campanha pelo campo "Qual anúncio".'
      rodape={
        <>
          <button type="button" className={classeBotaoSecundario} onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${classeAcaoPrincipal} disabled:opacity-50`}
            disabled={nome.trim().length < 2}
            onClick={() => {
              aoSalvar({ id: campanha?.id ?? null, nome, plataforma, ativa });
              aoFechar();
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="Nome da campanha"
          valor={nome}
          max={80}
          aoMudar={setNome}
          placeholder="Ex.: Site lento perde cliente"
        />
        <Opcoes
          rotulo="Plataforma"
          opcoes={plataformas}
          valor={plataforma}
          aoEscolher={setPlataforma}
        />
        <Opcoes
          rotulo="Situação"
          opcoes={[
            { id: "ativa", rotulo: "Ativa" },
            { id: "pausada", rotulo: "Pausada" },
          ]}
          valor={ativa ? "ativa" : "pausada"}
          aoEscolher={(v) => setAtiva(v === "ativa")}
        />
        <p className="text-[13.5px] text-hub-suave">
          Pausar aqui só organiza o Hub. Na plataforma, pause pelo próprio gerenciador de anúncios.
        </p>
      </div>
    </PainelLateral>
  );
}

/** Orçamento mensal por plataforma. */
export function OrcamentoPainel({
  aberto,
  aoFechar,
  o,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  o: PainelTrafego["orcamento"] | undefined;
  aoSalvar: (v: { google: number; meta: number }) => void;
}) {
  const [google, setGoogle] = useState<number | null>(o?.google_cents ?? 0);
  const [meta, setMeta] = useState<number | null>(o?.meta_cents ?? 0);
  useEffect(() => {
    if (aberto) {
      setGoogle(o?.google_cents ?? 0);
      setMeta(o?.meta_cents ?? 0);
    }
  }, [aberto, o]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Orçamento mensal"
      descricao="Quanto você quer investir por mês em cada plataforma."
      rodape={
        <>
          <button type="button" className={classeBotaoSecundario} onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={classeAcaoPrincipal}
            onClick={() => {
              aoSalvar({ google: google ?? 0, meta: meta ?? 0 });
              aoFechar();
            }}
          >
            Salvar orçamento
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoNumero
          rotulo={rotuloPlataforma.google}
          prefixo="R$"
          sufixo="/mês"
          escala={100}
          casas={0}
          valor={google}
          aoMudar={setGoogle}
        />
        <CampoNumero
          rotulo={rotuloPlataforma.meta}
          prefixo="R$"
          sufixo="/mês"
          escala={100}
          casas={0}
          valor={meta}
          aoMudar={setMeta}
        />
        <p className="rounded-xl bg-hub-fundo px-4 py-3 text-[14.5px]">
          Total: <strong className="tabular-nums">{moeda((google ?? 0) + (meta ?? 0))}</strong> por
          mês
        </p>
      </div>
    </PainelLateral>
  );
}
