import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  titulo?: string;
  mensagem?: string;
  aoTentarDeNovo: () => void;
};

/** Tela amigável de erro, usada pelo limite de erros global e pelas áreas protegidas. */
export function TelaErro({
  titulo = "Esta página não carregou",
  mensagem = "Algo deu errado do nosso lado. Tente de novo; se continuar, fale com o suporte.",
  aoTentarDeNovo,
}: Props) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hub-fundo px-4">
      <div className="w-full max-w-md rounded-2xl border border-hub-borda bg-white p-8 text-center shadow-sm">
        <h1 className="font-titulo text-xl font-semibold tracking-tight text-hub-tinta">
          {titulo}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-hub-suave">{mensagem}</p>
        <Button className="mt-6 h-11 w-full sm:w-auto" onClick={aoTentarDeNovo}>
          <RotateCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
