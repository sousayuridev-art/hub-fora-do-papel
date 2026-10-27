import { useEffect, useMemo, useRef, useState } from "react";

import { Abas } from "@/components/hub/Abas";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { ArtigoAcoes, type Confirmacao, type Ocupado } from "@/components/site/ArtigoAcoes";
import { AvisosDoArtigo } from "@/components/site/AvisosDoArtigo";
import { FormPagina } from "@/components/site/FormPagina";
import { PaginaPrevia } from "@/components/site/PaginaPrevia";
import { SeloSituacaoArtigo } from "@/components/site/SeloSituacaoArtigo";
import { useMutacoesBlocos } from "@/components/site/useMutacoesBlocos";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  mesmoValor,
  problemasDoBloco,
  rotuloBloco,
  valorDoForm,
  valorParaForm,
  type Blocos,
  type ChaveBloco,
} from "@/lib/paginasSite";
import { mensagemDoSite, type BlocoSalvo } from "@/lib/site";

type Aba = "escrever" | "previa";

/** O site guarda até 2 min no servidor e até 2 min (+1) na rede: no máximo 5 min. */
const PRAZO_SITE = "Aparece no site em até 5 minutos.";

/**
 * Editor de uma parte da página (card CMS-4) em painel lateral; painel de baixo no celular.
 * Rascunho: "Salvar rascunho" e "Publicar". No ar: "Salvar alterações" já vai para o site.
 * O texto fica na tela até salvar: erro de rede ou recusa do banco não apaga nada.
 */
export function PaginaEditor<K extends ChaveBloco>({
  siteId,
  dominio,
  chave,
  bloco,
  aoFechar,
}: {
  siteId: string;
  dominio: string;
  chave: K;
  /** Linha do banco; undefined = ainda não existe neste site. */
  bloco: BlocoSalvo | undefined;
  aoFechar: () => void;
}) {
  const m = useMutacoesBlocos(siteId);
  const [salvo, setSalvo] = useState<BlocoSalvo | null>(bloco ?? null);
  const [base, setBase] = useState<Blocos[K]>(() => valorParaForm(chave, bloco?.valor));
  const [form, setForm] = useState<Blocos[K]>(base);
  const [aba, setAba] = useState<Aba>("escrever");
  const [avisos, setAvisos] = useState<{ titulo: string; itens: string[] } | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [confirmar, setConfirmar] = useState<Confirmacao>(null);
  const caixaAvisos = useRef<HTMLDivElement>(null);

  const sujo = !mesmoValor(form, base);
  const situacao = salvo?.situacao ?? null;
  const noAr = situacao === "publicado";
  const valor = useMemo(() => valorDoForm(chave, form), [chave, form]);

  useEffect(() => {
    if (!sujo) return;
    const avisar = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  useEffect(() => {
    if (avisos) caixaAvisos.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [avisos]);

  const mostrar = (titulo: string, itens: string[]) => {
    setAba("escrever");
    setAvisos({ titulo, itens });
  };

  function falhou(e: unknown, titulo: string, tentar: () => void) {
    const msg = mensagemDoSite(e);
    if (msg) {
      mostrar(titulo, [msg]);
      erro(msg);
      return;
    }
    erro(mensagemDeErro(e), {
      detalhe: "O que você escreveu continua aqui.",
      tentarDeNovo: tentar,
    });
  }

  async function gravar(silencioso: boolean): Promise<BlocoSalvo | null> {
    const locais = problemasDoBloco(chave, valor, noAr);
    if (locais.length) {
      mostrar(
        noAr ? "Esta parte está no ar. Para salvar, corrija:" : "Para salvar, corrija:",
        locais,
      );
      return null;
    }
    const enviado = form;
    try {
      const r = await m.salvar.mutateAsync({ chave, valor });
      setSalvo(r);
      setBase(enviado);
      setAvisos(null);
      if (!silencioso)
        ok(r.situacao === "publicado" ? `Alterações salvas. ${PRAZO_SITE}` : "Rascunho salvo.");
      return r;
    } catch (e) {
      falhou(e, "Não foi possível salvar:", () => void acaoSalvar());
      return null;
    }
  }

  async function acaoSalvar() {
    if (ocupado) return;
    setOcupado("salvar");
    await gravar(false);
    setOcupado(null);
  }

  async function acaoPublicar() {
    if (ocupado) return;
    const locais = problemasDoBloco(chave, valor, true);
    if (locais.length) return mostrar("Para publicar, corrija:", locais);
    setOcupado("publicar");
    try {
      const b = !salvo || sujo ? await gravar(true) : salvo;
      if (!b) return;
      const r = await m.publicar.mutateAsync(chave);
      setSalvo(r);
      setAvisos(null);
      ok(`Publicado. ${PRAZO_SITE}`);
    } catch (e) {
      falhou(e, "O banco não publicou:", () => void acaoPublicar());
    } finally {
      setOcupado(null);
    }
  }

  const fechar = (aberto: boolean) => {
    if (aberto || ocupado) return;
    if (sujo) setConfirmar("sair");
    else aoFechar();
  };

  return (
    <PainelLateral
      aberto
      aoMudar={fechar}
      largo
      titulo={rotuloBloco[chave].titulo}
      descricao={`Site ${dominio}`}
      rodape={
        <ArtigoAcoes
          situacao={situacao === "arquivado" ? "rascunho" : situacao}
          ocupado={ocupado}
          confirmar={confirmar}
          aoSalvar={() => void acaoSalvar()}
          aoPublicar={() => void acaoPublicar()}
          aoArquivar={() => {}}
          aoSair={aoFechar}
          aoCancelarConfirmacao={() => setConfirmar(null)}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Abas<Aba>
            rotulo="Editor da página"
            opcoes={[
              { id: "escrever", rotulo: "Escrever" },
              { id: "previa", rotulo: "Prévia no site" },
            ]}
            ativa={aba}
            aoEscolher={setAba}
            className="max-md:mx-0 max-md:px-0"
          />
          <div className="flex items-center gap-2 text-[13px] text-hub-suave">
            {situacao && <SeloSituacaoArtigo situacao={situacao} />}
            <span role="status">
              {sujo ? "Alterações não salvas" : salvo ? "Tudo salvo" : "Ainda não salvo"}
            </span>
          </div>
        </div>

        {noAr ? (
          <p className="rounded-xl bg-sit-info p-3.5 text-[14px] text-sit-info-t">
            Esta parte está no ar. Ao salvar, a alteração vai para o site. {PRAZO_SITE}
          </p>
        ) : (
          <p className="rounded-xl bg-sit-neutro p-3.5 text-[14px] text-sit-neutro-t">
            Enquanto não for publicada, o site mostra o texto que já está no código.
          </p>
        )}
        {avisos && <AvisosDoArtigo ref={caixaAvisos} titulo={avisos.titulo} itens={avisos.itens} />}

        {aba === "previa" ? (
          <PaginaPrevia chave={chave} valor={valor} />
        ) : (
          <FormPagina chave={chave} siteId={siteId} valor={form} aoMudar={setForm} />
        )}
      </div>
    </PainelLateral>
  );
}
