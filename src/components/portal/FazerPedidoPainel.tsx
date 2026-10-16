import { useEffect, useState } from "react";

import { CampoArea, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";

/** Pedido feito pelo cliente. Painel de baixo no celular. */
export function FazerPedidoPainel({
  aberto,
  aoMudar,
  aoEnviar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoEnviar: (v: { titulo: string; descricao: string }) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  useEffect(() => {
    if (aberto) {
      setTitulo("");
      setDescricao("");
    }
  }, [aberto]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Fazer um pedido"
      descricao="Conte o que você quer mudar. Respondemos dizendo se está no combinado ou se tem custo."
      rodape={
        <>
          <Button variant="outline" className="h-12 max-sm:w-full" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button
            className="h-12 bg-hub-tinta text-white hover:bg-[#2A2E35] max-sm:w-full"
            disabled={titulo.trim().length < 2}
            onClick={() => {
              aoEnviar({ titulo: titulo.trim(), descricao: descricao.trim() });
              aoMudar(false);
            }}
          >
            Enviar pedido
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="O que você precisa"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          autoComplete="off"
          placeholder="Ex.: trocar a foto da recepção"
        />
        <CampoArea
          rotulo="Detalhes (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={2000}
          linhas={4}
          placeholder="Onde fica, o que deve entrar no lugar, até quando precisa"
        />
        <p className="text-[13.5px] text-hub-suave">Nada com custo começa sem a sua aprovação.</p>
      </div>
    </PainelLateral>
  );
}
