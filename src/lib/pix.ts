/**
 * Pix copia e cola (BR Code estático, padrão EMV do Banco Central) com valor.
 * Gerado no navegador a partir da chave da agência; não passa por intermediário.
 */

function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

/** Sem acento e só caracteres aceitos pelo padrão. */
function limpar(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-/]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do código. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixCopiaECola(v: {
  chave: string;
  nome: string;
  cidade: string;
  valorCents: number;
  identificador: string;
}): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", v.chave.trim());
  const txid = v.identificador.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", (v.valorCents / 100).toFixed(2)) +
    campo("58", "BR") +
    campo("59", limpar(v.nome, 25) || "RECEBEDOR") +
    campo("60", limpar(v.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
