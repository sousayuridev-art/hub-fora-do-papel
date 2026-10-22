import { z } from "zod";

/**
 * Parâmetro `volta` das telas de entrada: só caminho do próprio Hub.
 * Recusa "//outro.site", "/\outro.site" e caracteres de controle (o navegador apaga TAB e
 * quebra de linha da URL, e "/\t/outro.site" viraria "//outro.site").
 */
export const caminhoInterno = z
  .string()
  .regex(/^\/(?![/\\])/, "caminho interno")
  .refine(
    (v) => ![...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === "\\"),
    "caminho interno",
  )
  .optional()
  .catch(undefined);

/** Tela de entrada certa para quem ia para `volta`: área do gestor ou entrada dos clientes. */
export function entradaPara(volta: string | undefined): "/gestor" | "/entrar" {
  return /^\/(app|seguranca)(\/|\?|$)/.test(volta ?? "") ? "/gestor" : "/entrar";
}
