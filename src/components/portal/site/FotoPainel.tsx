import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { CampoArea } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import { tamanhoLegivel } from "@/lib/materiais";
import type { FotoSite } from "@/lib/fotosSite";

const nomeDoUso = (u: FotoSite["usos"][number]) =>
  u.tipo === "artigo" ? `Artigo "${u.nome}"` : `Página (${u.nome})`;

/** Detalhe da foto: descrição (texto alternativo), onde é usada e apagar (só se não estiver em uso). */
export function FotoPainel({
  foto,
  aoFechar,
  aoDescrever,
  aoApagar,
}: {
  foto: FotoSite | null;
  aoFechar: () => void;
  aoDescrever: (caminho: string, descricao: string) => void;
  aoApagar: (f: FotoSite) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    setDescricao(foto?.descricao ?? "");
    setConfirmar(false);
  }, [foto]);
  const emUso = (foto?.usos.length ?? 0) > 0;
  const mudou = descricao.trim() !== (foto?.descricao ?? "");

  return (
    <PainelLateral
      aberto={foto !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Foto"
      descricao={
        foto ? `${foto.nome}${foto.tamanho ? ` · ${tamanhoLegivel(foto.tamanho)}` : ""}` : undefined
      }
      rodape={
        foto && (
          <>
            {!emUso &&
              (confirmar ? (
                <Button
                  variant="outline"
                  className="h-12 border-sit-risco-t text-sit-risco-t max-sm:w-full sm:mr-auto"
                  onClick={() => {
                    aoApagar(foto);
                    aoFechar();
                  }}
                >
                  Apagar de vez
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-12 max-sm:w-full sm:mr-auto"
                  onClick={() => setConfirmar(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Apagar
                </Button>
              ))}
            <Button
              className="h-12 bg-hub-tinta text-white hover:bg-[#2A2E35] max-sm:w-full"
              disabled={!mudou}
              onClick={() => aoDescrever(foto.caminho, descricao)}
            >
              Salvar descrição
            </Button>
          </>
        )
      }
    >
      {foto && (
        <div className="flex flex-col gap-5">
          <img
            src={foto.url}
            alt={foto.descricao ?? ""}
            className="max-h-[320px] w-full rounded-xl bg-hub-fundo object-contain"
          />
          <CampoArea
            rotulo="Descrição da foto"
            valor={descricao}
            aoMudar={setDescricao}
            maxLength={250}
            linhas={3}
            placeholder="Ex.: Recepção da clínica com sofá azul e plantas"
            ajuda="A descrição ajuda pessoas com deficiência visual e faz a foto aparecer no Google Imagens."
          />
          <section aria-labelledby="usos-t" className="flex flex-col gap-2">
            <h3 id="usos-t" className="text-[14px] font-semibold">
              Onde é usada
            </h3>
            {emUso ? (
              <>
                <ul className="flex flex-col gap-1 text-[14.5px]">
                  {foto.usos.map((u) => (
                    <li key={`${u.tipo}-${u.id}`}>{nomeDoUso(u)}</li>
                  ))}
                </ul>
                <p className="rounded-xl bg-sit-atencao p-3 text-[14px] text-sit-atencao-t">
                  Para apagar esta foto, tire ela desses lugares antes.
                </p>
              </>
            ) : (
              <p className="text-[14.5px] text-hub-suave">
                Ainda não está em nenhum artigo ou página.
              </p>
            )}
          </section>
          {confirmar && (
            <p className="rounded-xl bg-sit-risco p-3 text-[14px] text-sit-risco-t">
              A foto sai do site e não volta. Toque em "Apagar de vez" para confirmar.
            </p>
          )}
        </div>
      )}
    </PainelLateral>
  );
}
