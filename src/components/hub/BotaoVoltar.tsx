import { useCanGoBack, useRouter, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Voltar das telas de detalhe (card RD-9). Quem veio de dentro do Hub volta pelo histórico
 * (a lista reaparece com o filtro que estava); quem entrou direto pelo endereço vai para a
 * lista da seção (`para`, destino fixo por tela). Aparece só no celular: no computador a
 * migalha faz esse papel.
 */
export function BotaoVoltar({
  para,
  rotulo = "Voltar",
  className,
}: {
  para: NonNullable<LinkProps["to"]>;
  rotulo?: string;
  className?: string;
}) {
  const router = useRouter();
  const podeVoltar = useCanGoBack();

  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={() => {
        if (podeVoltar) router.history.back();
        else void router.navigate({ to: para });
      }}
      className={cn(
        "-ml-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-hub-tinta transition-colors hover:bg-hub-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta md:hidden",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );
}
