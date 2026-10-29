import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";

import { CampoEscolha } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { QuadroEscalado, QuadroMarca } from "@/components/marketing/modelos/QuadroMarca";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import {
  chavesMarketing,
  mensagemDoMarketing,
  proximaCapa,
  removerArquivo,
  rotuloPapel,
  salvarModelo,
  type Pilar,
  type Versao,
} from "@/lib/marketing";
import {
  altura,
  avisosDoModelo,
  LARGURA,
  nomeDoArquivo,
  papelGerado,
  quadrosDaVersao,
  rotuloTemaCapa,
  rotuloTemaFinal,
  type TemaCapa,
  type TemaFinal,
} from "@/lib/modelosMarca";
import { erro, mensagemDeErro } from "@/lib/notify";

const falhou = (e: unknown) => mensagemDoMarketing(e) ?? mensagemDeErro(e);

/**
 * Gerar com o modelo da marca (MK-6): escolhe os temas, confere as miniaturas e gera os PNG,
 * que entram na versão pelo mesmo caminho do envio do MK-2 (Materiais › Conteúdo das redes).
 */
export function GerarModeloPainel({
  aberto,
  aoMudar,
  v,
  pilar,
  aoEnviar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  v: Versao;
  pilar: Pilar | null;
  aoEnviar: (arquivos: File[]) => void;
}) {
  const qc = useQueryClient();
  const sugestao = useQuery({
    queryKey: chavesMarketing.proximaCapa(v.channel, v.id),
    queryFn: () => proximaCapa(v.channel, v.id),
    enabled: aberto,
  });
  const [capa, setCapa] = useState<TemaCapa | null>(null);
  const [final, setFinal] = useState<TemaFinal>(v.modelo?.final ?? "ambar");
  const temaCapa: TemaCapa = capa ?? v.modelo?.capa ?? sugestao.data?.sugerida ?? "escuro";
  const [fontes, setFontes] = useState(false);
  const [gerando, setGerando] = useState(false);
  const quadrosRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    void import("@/components/marketing/modelos/fontesMarca")
      .then((m) => m.carregarFontesMarca())
      .then(() => vivo && setFontes(true))
      .catch(() => vivo && setFontes(true));
    return () => {
      vivo = false;
    };
  }, [aberto]);

  const quadros = useMemo(
    () => quadrosDaVersao(v, pilar, { capa: temaCapa, final }),
    [v, pilar, temaCapa, final],
  );
  const { bloqueia, avisa } = avisosDoModelo(quadros);
  const papel = papelGerado(v.format);
  const atuais = (v.midias ?? []).filter((m) => m.papel === papel);
  const titulo = quadros[0]?.titulo ?? "peca";

  async function gerar() {
    setGerando(true);
    try {
      const [{ toBlob }, { cssDasFontesEmbutido }] = await Promise.all([
        import("html-to-image"),
        import("@/components/marketing/modelos/fontesMarca"),
      ]);
      const fontEmbedCSS = await cssDasFontesEmbutido();
      // Espera os quadros em tamanho real aparecerem na página (escondidos).
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const arquivos: File[] = [];
      for (const [i, q] of quadros.entries()) {
        const no = quadrosRef.current[i];
        if (!no) throw new Error("quadro_nao_montado");
        const blob = await toBlob(no, {
          width: LARGURA,
          height: altura(q.vertical),
          pixelRatio: 1,
          fontEmbedCSS,
          cacheBust: false,
        });
        if (!blob) throw new Error("png_vazio");
        arquivos.push(new File([blob], nomeDoArquivo(titulo, q), { type: "image/png" }));
      }
      await salvarModelo(v.id, temaCapa, final);
      // Os atuais saem da versão (continuam em Materiais) antes de os novos entrarem.
      for (const m of atuais) await removerArquivo(m.id);
      aoEnviar(arquivos);
      void qc.invalidateQueries({ queryKey: chavesMarketing.detalhes });
      aoMudar(false);
    } catch (e) {
      erro(falhou(e) || "Não conseguimos gerar as imagens.", { tentarDeNovo: () => void gerar() });
    } finally {
      setGerando(false);
    }
  }

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(a) => !gerando && aoMudar(a)}
      titulo="Gerar com o modelo da marca"
      descricao="Capa, slides e chamada final no desenho da Fora do Papel. Confira antes de gerar."
      largo
      rodape={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={classeBotaoSecundario}
            onClick={() => aoMudar(false)}
            disabled={gerando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${classeAcaoPrincipal} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={gerando || !fontes || bloqueia.length > 0 || quadros.length === 0}
            onClick={() => void gerar()}
          >
            {gerando ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Gerando{" "}
                {quadros.length} imagens…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden="true" />
                {atuais.length > 0
                  ? `Gerar e trocar ${atuais.length === 1 ? "o atual" : `os ${atuais.length} atuais`}`
                  : "Gerar e anexar"}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoEscolha<TemaCapa>
            rotulo="Capa"
            valor={temaCapa}
            aoMudar={setCapa}
            opcoes={(Object.keys(rotuloTemaCapa) as TemaCapa[]).map((t) => ({
              id: t,
              rotulo: rotuloTemaCapa[t],
            }))}
            ajuda={
              sugestao.data?.ultima
                ? `A última capa no ${v.canal_nome ?? v.channel} foi ${rotuloTemaCapa[sugestao.data.ultima].toLowerCase()}: a grade pede ${rotuloTemaCapa[sugestao.data.sugerida].toLowerCase()}.`
                : "Alterne escura, clara e âmbar na grade."
            }
          />
          {quadros.some((q) => q.tipo === "final") && (
            <CampoEscolha<TemaFinal>
              rotulo="Chamada final"
              valor={final}
              aoMudar={setFinal}
              opcoes={(Object.keys(rotuloTemaFinal) as TemaFinal[]).map((t) => ({
                id: t,
                rotulo: rotuloTemaFinal[t],
              }))}
            />
          )}
        </div>

        {bloqueia.length > 0 && (
          <ul
            role="alert"
            className="flex flex-col gap-1 rounded-xl bg-sit-risco px-3 py-2.5 text-[14px] text-sit-risco-t"
          >
            {bloqueia.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {b}
              </li>
            ))}
          </ul>
        )}
        {avisa.map((a) => (
          <p
            key={a}
            className="rounded-xl bg-sit-atencao px-3 py-2.5 text-[14px] text-sit-atencao-t"
          >
            {a}
          </p>
        ))}
        {atuais.length > 0 && (
          <p className="rounded-xl bg-sit-neutro px-3 py-2.5 text-[14px] text-sit-neutro-t">
            {atuais.length === 1 ? "O arquivo atual" : `Os ${atuais.length} arquivos atuais`} (
            {rotuloPapel[atuais[0]!.papel].toLowerCase()}) sai{atuais.length === 1 ? "" : "em"} da
            versão e continua{atuais.length === 1 ? "" : "m"} em Materiais.
          </p>
        )}

        {!fontes ? (
          <div className="h-60 animate-pulse rounded-2xl bg-hub-fundo" aria-busy="true" />
        ) : (
          <ol
            aria-label="Quadros que serão gerados"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {quadros.map((q) => (
              <li key={q.indice} className="flex flex-col gap-1">
                <QuadroEscalado q={q} largura={q.vertical ? 140 : 160} />
                <span className="text-[12.5px] text-hub-suave">
                  {q.indice}.{" "}
                  {q.tipo === "capa" ? "Capa" : q.tipo === "final" ? "Chamada final" : "Slide"}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[12.5px] text-hub-suave">
          Para mudar um texto, feche, ajuste o slide na versão e abra de novo. Foto ou tela real
          continuam entrando por “Enviar do computador”.
        </p>
        {gerando && (
          <p aria-live="polite" className="text-[13px] font-medium">
            Gerando as imagens. Não feche esta janela.
          </p>
        )}
      </div>

      {gerando && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}
        >
          {quadros.map((q, i) => (
            <QuadroMarca
              key={q.indice}
              q={q}
              ref={(n) => {
                quadrosRef.current[i] = n;
              }}
            />
          ))}
        </div>
      )}
    </PainelLateral>
  );
}
