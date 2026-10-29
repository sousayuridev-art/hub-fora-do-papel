import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { useRascunho } from "@/components/marketing/useRascunho";
import {
  ajudaObjetivo,
  ajudaPilar,
  rotuloFrente,
  rotuloFunil,
  rotuloObjetivo,
  rotuloPilar,
  type Campanha,
  type CamposPeca,
  type ClienteOpcao,
  type Frente,
  type Funil,
  type Objetivo,
  type PecaDetalhe,
  type Pilar,
} from "@/lib/marketing";

const opcoes = <T extends string>(r: Record<T, string>) =>
  (Object.keys(r) as T[]).map((id) => ({ id, rotulo: r[id] }));

/**
 * Briefing da peça (MK-1): objetivo, etapa do funil, pilar e ideia central são a porta para a
 * criação. Escolhas salvam na hora; textos salvam ao sair do campo.
 */
export function BriefingPeca({
  p,
  campanhas,
  clientes,
  aoSalvar,
}: {
  p: PecaDetalhe;
  campanhas: Campanha[];
  clientes: ClienteOpcao[];
  aoSalvar: (c: CamposPeca) => void;
}) {
  // Rascunhos: seguem o banco, mas guardam o que foi digitado se a gravação falhar.
  const [titulo, setTitulo, marcarTitulo] = useRascunho(p.title);
  const [ideia, setIdeia, marcarIdeia] = useRascunho(p.core_idea ?? "");
  const [publico, setPublico, marcarPublico] = useRascunho(p.audience ?? "");
  const [serie, setSerie, marcarSerie] = useRascunho(p.series ?? "");
  const [direcao, setDirecao, marcarDirecao] = useRascunho(p.art_direction ?? "");

  const sair = (
    campo: keyof CamposPeca,
    atual: string,
    salvo: string | null,
    marcar: (v: string) => void,
    minimo = 0,
  ) => {
    const limpo = atual.trim();
    if (limpo === (salvo ?? "")) return;
    if (minimo > 0 && limpo.length < minimo) return;
    marcar(limpo);
    aoSalvar({ [campo]: limpo || null } as CamposPeca);
  };

  return (
    <div className="flex flex-col gap-5">
      <div onBlur={() => sair("titulo", titulo, p.title, marcarTitulo, 2)}>
        <CampoTexto rotulo="Título" valor={titulo} aoMudar={setTitulo} maxLength={120} />
      </div>
      <div onBlur={() => sair("ideia", ideia, p.core_idea, marcarIdeia)}>
        <CampoArea
          rotulo="Ideia central"
          valor={ideia}
          aoMudar={setIdeia}
          maxLength={400}
          linhas={3}
          ajuda="Uma frase com o que a pessoa precisa entender ou sentir. Todas as versões partem dela."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoEscolha<Objetivo>
          rotulo="Objetivo"
          valor={p.objective ?? ""}
          vazio="Escolha o objetivo"
          aoMudar={(v) => aoSalvar({ objetivo: v })}
          opcoes={opcoes(rotuloObjetivo)}
          ajuda={p.objective ? ajudaObjetivo[p.objective] : undefined}
        />
        <CampoEscolha<Funil>
          rotulo="Etapa do funil"
          valor={p.funnel ?? ""}
          vazio="Escolha a etapa"
          aoMudar={(v) => aoSalvar({ funil: v })}
          opcoes={opcoes(rotuloFunil)}
        />
        <CampoEscolha<Pilar>
          rotulo="Pilar"
          valor={p.pillar ?? ""}
          vazio="Escolha o pilar"
          aoMudar={(v) => aoSalvar({ pilar: v })}
          opcoes={opcoes(rotuloPilar)}
          ajuda={
            p.pillar ? ajudaPilar[p.pillar] : "Gire entre os pilares; nunca dois iguais seguidos."
          }
        />
        <CampoEscolha<Frente>
          rotulo="Frente"
          valor={p.front ?? ""}
          vazio="Escolha a frente"
          aoMudar={(v) => aoSalvar({ frente: v })}
          opcoes={opcoes(rotuloFrente)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div onBlur={() => sair("publico", publico, p.audience, marcarPublico)}>
          <CampoTexto
            rotulo="Público"
            valor={publico}
            aoMudar={setPublico}
            maxLength={200}
            placeholder="Ex.: dono de clínica com agenda no WhatsApp"
          />
        </div>
        <div onBlur={() => sair("serie", serie, p.series, marcarSerie)}>
          <CampoTexto
            rotulo="Série (opcional)"
            valor={serie}
            aoMudar={setSerie}
            maxLength={60}
            placeholder="Ex.: Projetos reais"
          />
        </div>
        <CampoEscolha
          rotulo="Campanha"
          valor={p.campaign_id ?? ""}
          aoMudar={(v) => aoSalvar({ campanha: v || null })}
          opcoes={[
            { id: "", rotulo: "Sem campanha" },
            ...campanhas.map((c) => ({ id: c.id, rotulo: c.name })),
          ]}
        />
        <CampoTexto
          rotulo="Prazo"
          tipo="date"
          valor={p.due_date ?? ""}
          aoMudar={(v) => aoSalvar({ prazo: v || null })}
        />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-hub-borda p-4">
        <legend className="px-1 text-[14px] font-medium">Projeto real</legend>
        <CampoEscolha
          rotulo="Cliente mostrado na peça"
          valor={p.client_id ?? ""}
          aoMudar={(v) => aoSalvar({ cliente: v || null })}
          opcoes={[
            { id: "", rotulo: "Nenhum" },
            ...clientes.map((c) => ({ id: c.id, rotulo: c.empresa })),
          ]}
          ajuda="Só com autorização do cliente. Nomes de pessoas de exemplo e valores escondidos."
        />
        {p.client_id && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="size-5 accent-[#0E1013]"
              checked={p.client_authorized}
              onChange={(e) => aoSalvar({ autorizacao: e.target.checked })}
            />
            O cliente autorizou mostrar nome e telas
          </label>
        )}
      </fieldset>

      <div onBlur={() => sair("direcao_arte", direcao, p.art_direction, marcarDirecao)}>
        <CampoArea
          rotulo="Direção de arte"
          valor={direcao}
          aoMudar={setDirecao}
          maxLength={2000}
          linhas={4}
          ajuda="Composição, imagem principal, tipografia e o que não pode faltar. Fundo #F5F5F2 ou capa escura, âmbar só no destaque, sem visual genérico de banco de imagens."
        />
      </div>
    </div>
  );
}
