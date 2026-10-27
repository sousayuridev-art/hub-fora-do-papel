import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { copiarEndereco } from "@/components/site/copiarEndereco";
import { Button } from "@/components/ui/button";
import { diaMes } from "@/lib/formatar";
import { tamanhoLegivel } from "@/lib/materiais";
import type { ImagemSite } from "@/lib/site";
import { classeBotaoSecundario } from "@/lib/estilos";

/** Detalhes da imagem: ver grande, copiar o endereço e apagar (com confirmação no rodapé). */
export function MidiaPainel({
  img,
  aoFechar,
  aoApagar,
}: {
  img: ImagemSite | null;
  aoFechar: () => void;
  aoApagar: (img: ImagemSite) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const fechar = () => {
    setConfirmando(false);
    aoFechar();
  };
  return (
    <PainelLateral
      aberto={img !== null}
      aoMudar={(v) => !v && fechar()}
      titulo="Imagem"
      descricao={img?.nome}
      rodape={
        img &&
        (confirmando ? (
          <>
            <p className="text-[14px] sm:mr-auto sm:self-center">
              Se a imagem estiver num artigo, ela some de lá.
            </p>
            <Button variant="outline" className="h-11" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
            <Button
              className="h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]"
              onClick={() => {
                aoApagar(img);
                fechar();
              }}
            >
              Apagar de vez
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            className="h-11 text-sit-risco-t"
            onClick={() => setConfirmando(true)}
          >
            Apagar imagem
          </Button>
        ))
      }
    >
      {img && (
        <div className="flex flex-col gap-4">
          <img
            src={img.url}
            alt={img.nome}
            className="max-h-[50dvh] w-full rounded-xl border border-hub-borda bg-hub-fundo object-contain"
          />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[14px]">
            {img.tamanho !== null && (
              <>
                <dt className="text-hub-suave">Tamanho</dt>
                <dd>{tamanhoLegivel(img.tamanho)}</dd>
              </>
            )}
            {img.criado_em && (
              <>
                <dt className="text-hub-suave">Enviada em</dt>
                <dd>{diaMes(img.criado_em)}</dd>
              </>
            )}
            <dt className="text-hub-suave">Endereço</dt>
            <dd className="break-all">{img.url}</dd>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => void copiarEndereco(img.url)}
            >
              <Copy className="size-4" aria-hidden="true" /> Copiar endereço
            </button>
            <a
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className={classeBotaoSecundario}
            >
              <ExternalLink className="size-4" aria-hidden="true" /> Abrir em outra aba
            </a>
          </div>
        </div>
      )}
    </PainelLateral>
  );
}
