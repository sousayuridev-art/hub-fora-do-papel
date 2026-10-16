import { Clock, FileX2, RefreshCw } from "lucide-react";

import { Simbolo } from "@/components/layout/Marca";

const textos = {
  invalido: {
    icone: FileX2,
    titulo: "Este link não abre nenhuma proposta",
    texto:
      "Confira se o endereço chegou inteiro. Se continuar assim, peça um novo link a quem enviou.",
  },
  atualizando: {
    icone: RefreshCw,
    titulo: "Esta proposta está sendo atualizada",
    texto:
      "Uma versão nova vai ficar disponível neste mesmo link. Se tiver pressa, fale com o seu responsável.",
  },
  vencida: {
    icone: Clock,
    titulo: "O prazo desta proposta acabou",
    texto:
      "Os valores precisam ser conferidos de novo. Fale com o responsável para receber uma versão atualizada.",
  },
} as const;

/** Telas de link inválido, em atualização ou vencido. */
export function EstadoProposta({
  estado,
  empresa,
  responsavel,
}: {
  estado: keyof typeof textos;
  empresa?: string | null;
  responsavel?: string | null;
}) {
  const t = textos[estado];
  const Icone = t.icone;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-hub-fundo px-4 py-10 text-hub-tinta">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-hub-borda bg-white p-7">
        <Simbolo tamanho={36} />
        <Icone className="size-7 text-hub-suave" aria-hidden="true" />
        <h1 className="font-titulo text-[24px] font-bold leading-tight">{t.titulo}</h1>
        <p className="text-[15px] text-hub-suave">{t.texto}</p>
        {(empresa || responsavel) && (
          <p className="border-t border-hub-borda pt-4 text-[14px] text-hub-suave">
            {empresa && <>Proposta para {empresa}. </>}
            {responsavel && <>Responsável: {responsavel}.</>}
          </p>
        )}
      </div>
    </main>
  );
}
