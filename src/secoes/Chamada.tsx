import { linkSeguro } from "./link";
export type ChamadaProps = {
  titulo: string;
  texto: string;
  botao: string;
  link: string;
  fundo: "cor" | "escuro";
};

export function Chamada({ titulo, texto, botao, link, fundo }: ChamadaProps) {
  return (
    <section className="px-6 py-12 md:px-12">
      <div
        className="mx-auto max-w-6xl rounded-[32px] px-8 py-14 text-center md:px-16"
        style={{ background: fundo === "escuro" ? "#141414" : "var(--site-cor)" }}
      >
        <h2 className="mx-auto max-w-2xl break-words text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {titulo}
        </h2>
        {texto && <p className="mx-auto mt-4 max-w-xl break-words text-white/80">{texto}</p>}
        {botao && (
          <a
            href={linkSeguro(link)}
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-neutral-900"
          >
            {botao}
          </a>
        )}
      </div>
    </section>
  );
}
