import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import type { CaminhoModulo, Modulo } from "@/lib/projetos";
import { cn } from "@/lib/utils";

export type ModoModulo = "novo" | "editar" | "testes" | "aprovacao" | "publicar";

export type EnvioModulo =
  | { modo: "novo"; nome: string; caminho: CaminhoModulo }
  | { modo: "editar"; id: string; nome: string; caminho: CaminhoModulo }
  | { modo: "testes"; id: string; linkTestes: string }
  | { modo: "aprovacao"; id: string; descricao: string; previa: string }
  | { modo: "publicar"; id: string; notas: string; link: string };

const titulos: Record<ModoModulo, { titulo: string; descricao: string; botao: string }> = {
  novo: {
    titulo: "Novo módulo",
    descricao: "Cada módulo anda sozinho até a produção (ex.: RH, Financeiro).",
    botao: "Criar módulo",
  },
  editar: { titulo: "Editar módulo", descricao: "Nome e caminho até a produção.", botao: "Salvar" },
  testes: {
    titulo: "Enviar para testes",
    descricao: "O link de testes aparece no pedido de aprovação para o cliente conferir.",
    botao: "Enviar para testes",
  },
  aprovacao: {
    titulo: "Pedir aprovação do módulo",
    descricao: "O cliente confere no portal e aprova ou pede ajuste. Só depois o módulo vai ao ar.",
    botao: "Enviar para o cliente",
  },
  publicar: {
    titulo: "Publicar módulo",
    descricao: "O cliente vê no portal o que entrou nesta versão, com a data.",
    botao: "Publicar",
  },
};

const ehHttps = (v: string) => v.trim() === "" || /^https:\/\/\S{3,}$/.test(v.trim());

/** Painel único das ações de módulo (card SS-1). */
export function ModuloPainel({
  modo,
  modulo,
  aoFechar,
  aoEnviar,
}: {
  modo: ModoModulo | null;
  modulo: Modulo | null;
  aoFechar: () => void;
  aoEnviar: (v: EnvioModulo) => void;
}) {
  const [nome, setNome] = useState("");
  const [caminho, setCaminho] = useState<CaminhoModulo>("homologacao");
  const [link, setLink] = useState("");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (!modo) return;
    setNome(modulo?.nome ?? "");
    setCaminho(modulo?.caminho ?? "homologacao");
    setLink(
      modo === "publicar"
        ? (modulo?.link_producao ?? "")
        : modo === "aprovacao" || modo === "testes"
          ? (modulo?.link_testes ?? "")
          : "",
    );
    setTexto("");
  }, [modo, modulo]);

  const t = titulos[modo ?? "novo"];
  const valido =
    modo === "novo" || modo === "editar"
      ? nome.trim().length >= 2
      : modo === "publicar"
        ? texto.trim().length >= 5 && ehHttps(link)
        : ehHttps(link);

  function enviar() {
    if (!modo) return;
    const id = modulo?.id ?? "";
    if (modo === "novo") aoEnviar({ modo, nome: nome.trim(), caminho });
    else if (modo === "editar") aoEnviar({ modo, id, nome: nome.trim(), caminho });
    else if (modo === "testes") aoEnviar({ modo, id, linkTestes: link.trim() });
    else if (modo === "aprovacao")
      aoEnviar({ modo, id, descricao: texto.trim(), previa: link.trim() });
    else aoEnviar({ modo, id, notas: texto.trim(), link: link.trim() });
    aoFechar();
  }

  return (
    <PainelLateral
      aberto={modo !== null}
      aoMudar={(a) => !a && aoFechar()}
      titulo={modulo && modo !== "novo" ? `${t.titulo}: ${modulo.nome}` : t.titulo}
      descricao={t.descricao}
      rodape={
        <BotoesPainel
          rotulo={t.botao}
          desabilitado={!valido}
          aoCancelar={aoFechar}
          aoConfirmar={enviar}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {(modo === "novo" || modo === "editar") && (
          <>
            <CampoTexto rotulo="Nome do módulo" valor={nome} aoMudar={setNome} maxLength={60} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-[14px] font-medium">Caminho até a produção</legend>
              {(
                [
                  [
                    "homologacao",
                    "Com homologação",
                    "Testes, aprovação do cliente e depois produção. É o padrão.",
                  ],
                  [
                    "direta",
                    "Publicação direta",
                    "Para ajuste pequeno combinado com o cliente. Não pede aprovação.",
                  ],
                ] as const
              ).map(([id, rotulo, ajuda]) => (
                <label
                  key={id}
                  className={cn(
                    "flex min-h-11 cursor-pointer gap-3 rounded-xl border p-3",
                    caminho === id ? "border-hub-tinta bg-hub-fundo" : "border-hub-borda",
                  )}
                >
                  <input
                    type="radio"
                    name="caminho"
                    className="mt-1 size-4 accent-hub-tinta"
                    checked={caminho === id}
                    onChange={() => setCaminho(id)}
                  />
                  <span className="flex flex-col">
                    <b className="text-[15px] font-semibold">{rotulo}</b>
                    <span className="text-[13.5px] text-hub-suave">{ajuda}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        {modo === "aprovacao" && (
          <CampoArea
            rotulo="O que o cliente deve conferir (opcional)"
            valor={texto}
            aoMudar={setTexto}
            maxLength={1000}
          />
        )}
        {modo === "publicar" && (
          <CampoArea
            rotulo="O que entrou nesta versão"
            ajuda="Em português simples. Ex.: Folha de ponto e pedido de férias."
            valor={texto}
            aoMudar={setTexto}
            maxLength={2000}
          />
        )}
        {(modo === "testes" || modo === "aprovacao" || modo === "publicar") && (
          <CampoTexto
            rotulo={modo === "publicar" ? "Link de produção" : "Link de testes"}
            tipo="url"
            inputMode="url"
            placeholder="https://"
            valor={link}
            aoMudar={setLink}
            maxLength={500}
            {...(!ehHttps(link) ? { ajuda: "O link precisa começar com https://." } : {})}
          />
        )}
      </div>
    </PainelLateral>
  );
}
