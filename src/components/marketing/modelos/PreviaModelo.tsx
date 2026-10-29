import { useEffect, useState } from "react";

import { QuadroEscalado } from "@/components/marketing/modelos/QuadroMarca";
import type { Versao } from "@/lib/marketing";
import { quadrosDaVersao } from "@/lib/modelosMarca";

/**
 * Prévia sem arquivo (MK-6): a capa como sairia pelo modelo da marca, no tema já usado ou no
 * escuro. As fontes da marca carregam só aqui (o resto do Hub não baixa nada a mais).
 */
export function PreviaModelo({ v, largura }: { v: Versao; largura: number }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    void import("@/components/marketing/modelos/fontesMarca")
      .then((m) => m.carregarFontesMarca())
      .finally(() => vivo && setPronto(true));
    return () => {
      vivo = false;
    };
  }, []);
  const capa = quadrosDaVersao(v, null, {
    capa: v.modelo?.capa ?? "escuro",
    final: v.modelo?.final ?? "ambar",
  })[0];
  if (!capa) return null;
  return (
    <div style={{ opacity: pronto ? 1 : 0.6 }}>
      <QuadroEscalado q={capa} largura={largura} />
    </div>
  );
}
