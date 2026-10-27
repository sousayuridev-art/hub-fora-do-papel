/**
 * CMS-1 · Importação dos artigos do site para o banco do Hub.
 *
 * Lê os artigos do repositório do site (src/data/artigos.ts e src/data/conteudo/<slug>.ts)
 * e escreve uma migração SQL que chama public._site_importar_artigo para cada um.
 * A migração é idempotente: upsert por site + slug, sempre como publicado.
 *
 * Uso:
 *   bun scripts/importar-site.ts [arquivo-de-saida.sql]
 * Variáveis:
 *   SITE_DIR  pasta do repositório do site (padrão: ../fora-do-papel-blueprint)
 *   DOMINIO   domínio do site no Hub (padrão: www.foradopapel.com.br)
 * Sem arquivo de saída, grava supabase/migrations/<agora>_importar_artigos_site.sql.
 * O banco de produção recebe a migração pelo fluxo normal (docs/banco-de-producao.md).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type ArtigoSite = {
  slug: string;
  categoria: string;
  titulo: string;
  tituloSeo: string;
  descricao: string;
  resumo: string;
  dataIso: string;
  leitura: string;
  autor: string;
  capa: string;
};

type ModuloArtigos = {
  artigos: ArtigoSite[];
  conteudos: Record<string, () => Promise<{ default: unknown }>>;
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
    process.argv[2] ?? `supabase/migrations/${carimbo(new Date())}_importar_artigos_site.sql`,
  );
  const modulo = (await import(
    pathToFileURL(resolve(pastaSite, "src/data/artigos.ts")).href
  )) as ModuloArtigos;

  const linhas: string[] = [
    "-- =====================================================================",
    "-- CMS-1 · Importação dos artigos do site (gerado por scripts/importar-site.ts; não edite à mão)",
    `-- Origem: fora-do-papel-blueprint/src/data (${modulo.artigos.length} artigos) · domínio ${dominio}`,
    "-- Idempotente: upsert por site + slug, sempre publicado. Rodar de novo não duplica.",
    "-- =====================================================================",
  ];

  for (const [indice, artigo] of modulo.artigos.entries()) {
    const carregar = modulo.conteudos[artigo.slug];
    if (!carregar) throw new Error(`Artigo sem corpo: ${artigo.slug}`);
    const corpo = (await carregar()).default;
    // Meio-dia em Brasília: a data não muda em nenhum fuso
    const publicadoEm = `${artigo.dataIso}T12:00:00-03:00`;
    const dados = {
      slug: artigo.slug,
      categoria: artigo.categoria,
      titulo: artigo.titulo,
      titulo_seo: artigo.tituloSeo,
      descricao: artigo.descricao,
      resumo: artigo.resumo,
      capa: artigo.capa,
      corpo,
      leitura: artigo.leitura,
      autor: artigo.autor,
      ordem: indice + 1,
      publicado_em: publicadoEm,
    };
    linhas.push(
      "",
      `-- ${indice + 1}. ${artigo.slug}`,
      `select public._site_importar_artigo(${literal(dominio)}, ${literal(JSON.stringify(dados))}::jsonb);`,
    );
  }

  writeFileSync(saida, `${linhas.join("\n")}\n`);
  console.log(`${modulo.artigos.length} artigos → ${saida}`);
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
