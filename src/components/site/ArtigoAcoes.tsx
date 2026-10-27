import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SituacaoSite } from "@/lib/site";

export type Ocupado = "salvar" | "publicar" | "arquivar" | null;
export type Confirmacao = "sair" | "arquivar" | null;

const amarelo = "h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]";
const contorno = "h-11";

function Rotulo({ texto, girando }: { texto: string; girando: boolean }) {
  return (
    <>
      {girando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {texto}
    </>
  );
}

/**
 * Rodapé do editor. Rascunho: "Salvar rascunho" + "Publicar" (principal).
 * Publicado: "Salvar alterações" (vai direto ao site). Arquivado: "Salvar" + "Publicar de novo".
 * Sair com alteração e arquivar pedem confirmação no próprio rodapé.
 */
export function ArtigoAcoes({
  situacao,
  ocupado,
  confirmar,
  aoSalvar,
  aoPublicar,
  aoArquivar,
  aoSair,
  aoCancelarConfirmacao,
}: {
  /** null = artigo novo, ainda não gravado. */
  situacao: SituacaoSite | null;
  ocupado: Ocupado;
  confirmar: Confirmacao;
  aoSalvar: () => void;
  aoPublicar: () => void;
  aoArquivar: () => void;
  aoSair: () => void;
  aoCancelarConfirmacao: () => void;
}) {
  const travado = ocupado !== null;
  if (confirmar === "sair")
    return (
      <>
        <p className="text-[14px] sm:mr-auto sm:self-center">
          Há alterações não salvas. Sair descarta o que mudou.
        </p>
        <Button variant="outline" className={contorno} onClick={aoCancelarConfirmacao}>
          Continuar editando
        </Button>
        <Button className="h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]" onClick={aoSair}>
          Sair sem salvar
        </Button>
      </>
    );
  if (confirmar === "arquivar")
    return (
      <>
        <p className="text-[14px] sm:mr-auto sm:self-center">
          {situacao === "publicado"
            ? "O artigo sai do site. Dá para publicar de novo depois."
            : "O rascunho vai para os arquivados."}
        </p>
        <Button
          variant="outline"
          className={contorno}
          onClick={aoCancelarConfirmacao}
          disabled={travado}
        >
          Voltar
        </Button>
        <Button
          className="h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]"
          onClick={aoArquivar}
          disabled={travado}
        >
          <Rotulo texto="Arquivar" girando={ocupado === "arquivar"} />
        </Button>
      </>
    );
  if (situacao === "publicado")
    return (
      <Button className={amarelo} onClick={aoSalvar} disabled={travado}>
        <Rotulo texto="Salvar alterações" girando={ocupado === "salvar"} />
      </Button>
    );
  return (
    <>
      <Button variant="outline" className={contorno} onClick={aoSalvar} disabled={travado}>
        <Rotulo
          texto={situacao === "arquivado" ? "Salvar" : "Salvar rascunho"}
          girando={ocupado === "salvar"}
        />
      </Button>
      <Button className={amarelo} onClick={aoPublicar} disabled={travado}>
        <Rotulo
          texto={situacao === "arquivado" ? "Publicar de novo" : "Publicar"}
          girando={ocupado === "publicar"}
        />
      </Button>
    </>
  );
}
