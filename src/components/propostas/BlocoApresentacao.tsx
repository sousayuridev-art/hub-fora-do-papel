import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import { CampoTexto } from "@/components/propostas/CampoTexto";
import type { PropsBloco } from "@/components/propostas/tipos";

/** Tipo de projeto, título (a promessa) e a apresentação para o cliente. */
export function BlocoApresentacao({ d, alterar, bloqueado }: PropsBloco) {
  return (
    <BlocoEditor
      id="apresentacao"
      titulo="Apresentação"
      texto="É o topo da página que o cliente abre. Título com o que ele ganha, não com a tecnologia."
    >
      <CampoTexto
        rotulo="Tipo de projeto"
        valor={d.tipo}
        max={80}
        bloqueado={bloqueado}
        placeholder="Ex.: Site com painel de edição"
        aoMudar={(v) => alterar({ tipo: v })}
      />
      <CampoTexto
        rotulo="Título"
        valor={d.titulo}
        max={160}
        bloqueado={bloqueado}
        placeholder="Ex.: Um site que trabalha pela clínica enquanto vocês atendem."
        aoMudar={(v) => alterar({ titulo: v })}
      />
      <CampoTexto
        rotulo="Apresentação"
        valor={d.apresentacao}
        max={1200}
        linhas={3}
        bloqueado={bloqueado}
        placeholder="Para quem é, de onde veio (diagnóstico, conversa) e um convite para ler com calma."
        aoMudar={(v) => alterar({ apresentacao: v })}
      />
    </BlocoEditor>
  );
}
