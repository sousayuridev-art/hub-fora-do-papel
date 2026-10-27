import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Archive } from "lucide-react";

import { Abas } from "@/components/hub/Abas";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { ArtigoAcoes, type Confirmacao, type Ocupado } from "@/components/site/ArtigoAcoes";
import { ArtigoCampos } from "@/components/site/ArtigoCampos";
import { ArtigoGoogle } from "@/components/site/ArtigoGoogle";
import { ArtigoPontos } from "@/components/site/ArtigoPontos";
import { ArtigoPrevia } from "@/components/site/ArtigoPrevia";
import { ArtigoSecoes } from "@/components/site/ArtigoSecoes";
import { AvisoConflito } from "@/components/site/AvisoConflito";
import { AvisosDoArtigo } from "@/components/site/AvisosDoArtigo";
import { SeloSituacaoArtigo } from "@/components/site/SeloSituacaoArtigo";
import { useMutacoesArtigos } from "@/components/site/useMutacoesArtigos";
import {
  dadosDoForm,
  formDoArtigo,
  formVazio,
  mudou,
  problemasDoArtigo,
  type FormArtigo,
} from "@/lib/editorArtigo";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { ehConflito, mensagemDoSite, type ArtigoCompleto } from "@/lib/site";

type Aba = "escrever" | "previa";

function Parte({
  titulo,
  ajuda,
  children,
}: {
  titulo: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-hub-borda pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-titulo text-[17px] font-semibold">{titulo}</h3>
        {ajuda && <p className="text-[13.5px] text-hub-suave">{ajuda}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Editor de artigo (card CMS-2) em painel lateral largo; painel de baixo no celular.
 * O texto fica na tela até salvar: erro de rede ou recusa do banco não apaga nada.
 */
export function ArtigoEditor({
  siteId,
  dominio,
  categorias,
  artigo,
  aoFechar,
  aoRecarregar,
}: {
  siteId: string;
  dominio: string;
  categorias: string[];
  /** null = artigo novo. */
  artigo: ArtigoCompleto | null;
  aoFechar: () => void;
  /** Busca de novo a versão do banco (depois de um conflito). */
  aoRecarregar: (id: string) => Promise<ArtigoCompleto>;
}) {
  const m = useMutacoesArtigos(siteId);
  const [salvo, setSalvo] = useState<ArtigoCompleto | null>(artigo);
  const [base, setBase] = useState<FormArtigo>(() => (artigo ? formDoArtigo(artigo) : formVazio()));
  const [form, setForm] = useState<FormArtigo>(base);
  const [aba, setAba] = useState<Aba>("escrever");
  const [avisos, setAvisos] = useState<{ titulo: string; itens: string[] } | null>(null);
  const [conflito, setConflito] = useState(false);
  const [recarregando, setRecarregando] = useState(false);
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [confirmar, setConfirmar] = useState<Confirmacao>(null);
  const caixaAvisos = useRef<HTMLDivElement>(null);

  const sujo = mudou(form, base);
  const situacao = salvo?.situacao ?? null;
  const noAr = situacao === "publicado";
  const dados = useMemo(() => dadosDoForm(form), [form]);

  // Fechar a aba do navegador com alteração não salva: o navegador pergunta antes.
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

  /** Erro de gravação: conflito, recusa do banco (mostra o motivo) ou rede (tentar de novo). */
  function falhou(e: unknown, titulo: string, tentar: () => void) {
    const msg = mensagemDoSite(e);
    if (ehConflito(e)) {
      setConflito(true);
      erro("Nada foi gravado: existe uma versão mais nova deste artigo.");
      return;
    }
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

  async function gravar(silencioso: boolean): Promise<ArtigoCompleto | null> {
    const locais = problemasDoArtigo(form, noAr);
    if (locais.length) {
      mostrar(
        noAr ? "O artigo está no ar. Para salvar, corrija:" : "Para salvar, corrija:",
        locais,
      );
      return null;
    }
    const enviado = form;
    try {
      const r = await m.salvar.mutateAsync({
        ...dadosDoForm(enviado),
        ...(salvo ? { id: salvo.id, atualizado_em: salvo.atualizado_em } : {}),
      });
      setSalvo(r);
      setBase(enviado);
      setAvisos(null);
      if (!silencioso)
        ok(
          r.situacao === "publicado"
            ? "Alterações salvas. Já estão no site."
            : r.situacao === "arquivado"
              ? "Alterações salvas."
              : "Rascunho salvo.",
        );
      return r;
    } catch (e) {
      falhou(e, "Não foi possível salvar:", () => void acaoSalvar());
      return null;
    }
  }

  async function acaoSalvar() {
    if (ocupado || conflito) return;
    setOcupado("salvar");
    await gravar(false);
    setOcupado(null);
  }

  async function acaoPublicar() {
    if (ocupado || conflito) return;
    const locais = problemasDoArtigo(form, true);
    if (locais.length) return mostrar("Para publicar, falta:", locais);
    setOcupado("publicar");
    try {
      const a = !salvo || sujo ? await gravar(true) : salvo;
      if (!a) return;
      const r = await m.publicar.mutateAsync(a.id);
      setSalvo(r);
      setAvisos(null);
      ok("Artigo publicado. Já está no site.");
    } catch (e) {
      falhou(e, "O banco não publicou:", () => void acaoPublicar());
    } finally {
      setOcupado(null);
    }
  }

  async function acaoArquivar() {
    if (!salvo || ocupado) return;
    const estavaNoAr = salvo.situacao === "publicado";
    setOcupado("arquivar");
    try {
      const r = await m.arquivar.mutateAsync(salvo.id);
      setSalvo(r);
      setConfirmar(null);
      // Desfazer só quando estava no ar: republicar devolve ao site (rascunho não tem volta por RPC).
      const desfazer = () =>
        void m.publicar
          .mutateAsync(r.id)
          .then((de) => {
            setSalvo(de);
            ok("Artigo de volta ao site.");
          })
          .catch((e: unknown) => erro(mensagemDoSite(e) ?? mensagemDeErro(e)));
      ok(
        estavaNoAr ? "Artigo arquivado. Saiu do site." : "Artigo arquivado.",
        estavaNoAr ? { desfazer } : {},
      );
    } catch (e) {
      erro(mensagemDoSite(e) ?? mensagemDeErro(e), { tentarDeNovo: () => void acaoArquivar() });
    } finally {
      setOcupado(null);
    }
  }

  async function carregarVersaoSalva() {
    if (!salvo) return;
    setRecarregando(true);
    try {
      const a = await aoRecarregar(salvo.id);
      const f = formDoArtigo(a);
      setSalvo(a);
      setBase(f);
      setForm(f);
      setConflito(false);
      setAvisos(null);
      ok("Versão salva carregada.");
    } catch (e) {
      erro(mensagemDeErro(e), { tentarDeNovo: () => void carregarVersaoSalva() });
    } finally {
      setRecarregando(false);
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
      titulo={artigo ? "Editar artigo" : "Novo artigo"}
      descricao={salvo ? `${dominio}/artigos/${salvo.slug}` : `Site ${dominio}`}
      rodape={
        <ArtigoAcoes
          situacao={situacao}
          ocupado={ocupado}
          confirmar={confirmar}
          aoSalvar={() => void acaoSalvar()}
          aoPublicar={() => void acaoPublicar()}
          aoArquivar={() => void acaoArquivar()}
          aoSair={aoFechar}
          aoCancelarConfirmacao={() => setConfirmar(null)}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Abas<Aba>
            rotulo="Editor do artigo"
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

        {noAr && (
          <p className="rounded-xl bg-sit-info p-3.5 text-[14px] text-sit-info-t">
            Este artigo está no ar. Ao salvar, a alteração vai direto para o site.
          </p>
        )}
        {situacao === "arquivado" && (
          <p className="rounded-xl bg-sit-neutro p-3.5 text-[14px] text-sit-neutro-t">
            Arquivado: fora do site. Salvar mantém arquivado; para voltar ao site, use
            &quot;Publicar de novo&quot;.
          </p>
        )}
        {conflito && (
          <AvisoConflito aoCarregar={() => void carregarVersaoSalva()} carregando={recarregando} />
        )}
        {avisos && <AvisosDoArtigo ref={caixaAvisos} titulo={avisos.titulo} itens={avisos.itens} />}

        {aba === "previa" ? (
          <ArtigoPrevia dados={dados} dominio={dominio} publicadoEm={salvo?.publicado_em ?? null} />
        ) : (
          <div className="flex flex-col gap-6">
            <Parte titulo="Artigo">
              <ArtigoCampos
                form={form}
                aoMudar={setForm}
                categorias={categorias}
                dominio={dominio}
                slugTravado={Boolean(salvo?.publicado_em)}
              />
            </Parte>
            <Parte titulo="No Google">
              <ArtigoGoogle form={form} aoMudar={setForm} />
            </Parte>
            <Parte titulo="Resumo em 3 pontos" ajuda="O quadro no topo do artigo.">
              <ArtigoPontos
                pontos={form.corpo.pontos}
                aoMudar={(pontos) => setForm({ ...form, corpo: { ...form.corpo, pontos } })}
              />
            </Parte>
            <Parte titulo="Corpo" ajuda="Cada seção vira um título no artigo e um item do sumário.">
              <ArtigoSecoes
                secoes={form.corpo.secoes}
                aoMudar={(secoes) => setForm({ ...form, corpo: { ...form.corpo, secoes } })}
              />
            </Parte>
            {salvo && situacao !== "arquivado" && (
              <Parte titulo="Arquivar">
                <p className="text-[14px] text-hub-suave">
                  {noAr
                    ? "Tira o artigo do site sem apagar. Dá para publicar de novo depois."
                    : "Guarda o rascunho fora da lista principal, sem apagar."}
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmar("arquivar")}
                  disabled={ocupado !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#DADAD3] bg-white px-4 text-[15px] font-medium text-sit-risco-t hover:bg-sit-risco"
                >
                  <Archive className="size-4" aria-hidden="true" /> Arquivar artigo
                </button>
              </Parte>
            )}
          </div>
        )}
      </div>
    </PainelLateral>
  );
}
