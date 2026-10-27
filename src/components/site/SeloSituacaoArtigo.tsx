import { Selo } from "@/components/hub/Selo";
import { rotuloSituacao, tomSituacao, type SituacaoSite } from "@/lib/site";

/** Situação do artigo nas cores do Hub: rascunho (atenção), publicado (concluído), arquivado (neutro). */
export function SeloSituacaoArtigo({ situacao }: { situacao: SituacaoSite }) {
  return <Selo tom={tomSituacao[situacao]}>{rotuloSituacao[situacao]}</Selo>;
}
