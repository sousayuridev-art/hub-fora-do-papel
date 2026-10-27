/**
 * CMS-4 · Importação dos textos das páginas do site para o banco do Hub.
 *
 * Lê a reserva do repositório do site (src/data/paginas.ts: topo, frentes, perguntas,
 * projetos reais e quem somos, no formato de site_blocos) e escreve uma migração SQL que
 * chama public._site_importar_bloco para cada chave.
 * A migração é idempotente e NÃO apaga edições: a chave só é gravada (como publicada) se
 * ainda não existe no site (`on conflict do nothing`). Para trocar um texto já importado,
 * use o Hub (Conteúdo do site → Páginas).
 *
 * Uso:
 *   bun scripts/importar-paginas.ts [arquivo-de-saida.sql]
 * Variáveis:
 *   SITE_DIR  pasta do repositório do site (padrão: ../fora-do-papel-blueprint)
 *   DOMINIO   domínio do site no Hub (padrão: www.foradopapel.com.br)
 * Sem arquivo de saída, grava supabase/migrations/<agora>_importar_paginas_site.sql.
 * O banco de produção recebe a migração pelo fluxo normal (docs/banco-de-producao.md).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { problemasDoBloco, type ChaveBloco } from "../src/lib/paginasSite";

type ModuloPaginas = {
  blocosReserva: Record<ChaveBloco, unknown>;
  CHAVES_BLOCOS: ChaveBloco[];
};

const raiz = resolve(import.meta.dir, "..");
const pastaSite = resolve(raiz, process.env["SITE_DIR"] ?? "../fora-do-papel-blueprint");
const dominio = process.env["DOMINIO"] ?? "www.foradopapel.com.br";

function carimbo(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Texto SQL entre aspas simples (standard_conforming_strings ligado no Supabase). */
function literal(texto: string): string {
  return `'${texto.replaceAll("'", "''")}'`;
}

async function main(): Promise<void> {
  const saida = resolve(
    raiz,
    process.argv[2] ?? `supabase/migrations/${carimbo(new Date())}_importar_paginas_site.sql`,
  );
  const modulo = (await import(
    pathToFileURL(resolve(pastaSite, "src/data/paginas.ts")).href
  )) as ModuloPaginas;

  const linhas: string[] = [
    "-- =====================================================================",
    "-- CMS-4 · Importação dos textos das páginas do site (gerado por scripts/importar-paginas.ts; não edite à mão)",
    `-- Origem: fora-do-papel-blueprint/src/data/paginas.ts (${modulo.CHAVES_BLOCOS.length} chaves) · domínio ${dominio}`,
    "-- Idempotente e sem apagar edições: grava publicado só a chave que ainda não existe (on conflict do nothing).",
    "-- =====================================================================",
  ];

  for (const chave of modulo.CHAVES_BLOCOS) {
    const valor = modulo.blocosReserva[chave];
    // Mesmas regras do banco: falha aqui em vez de falhar na migração.
    const problemas = problemasDoBloco(chave, valor);
    if (problemas.length) throw new Error(`${chave}: ${problemas.join("; ")}`);
    linhas.push(
      "",
      `-- ${chave}`,
      `select public._site_importar_bloco(${literal(dominio)}, ${literal(chave)}, ${literal(JSON.stringify(valor))}::jsonb);`,
    );
  }

  writeFileSync(saida, `${linhas.join("\n")}\n`);
  console.log(`${modulo.CHAVES_BLOCOS.length} chaves → ${saida}`);
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
