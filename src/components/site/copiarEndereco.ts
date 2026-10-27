import { erro, ok } from "@/lib/notify";

/** Copia o endereço público da imagem (para colar na capa ou num texto). */
export async function copiarEndereco(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    ok("Endereço copiado.");
  } catch {
    erro("Não foi possível copiar. Abra a imagem e copie o endereço à mão.");
  }
}
