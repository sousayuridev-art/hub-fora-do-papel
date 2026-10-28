import { Foto } from "./Foto";
import { linkSeguro } from "./link";

export type CapaProps = {
  chamada: string;
  titulo: string;
  texto: string;
  botao: string;
  link: string;
  foto: string;
  descricaoFoto: string;
  formato: "lado" | "centro";
};

export function Capa({
  chamada,
  titulo,
  texto,
  botao,
  link,
  foto,
  descricaoFoto,
  formato,
}: CapaProps) {
  const centro = formato === "centro";
  return (
    <section className="px-6 py-16 md:px-12 md:py-24">
      <div
        className={
          centro
            ? "mx-auto max-w-3xl text-center"
            : "mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2"
        }
      >
        <div className="min-w-0">
          {chamada && (
            <p className="text-sm font-semibold" style={{ color: "var(--site-cor)" }}>
              {chamada}
            </p>
          )}
          <h1 className="mt-4 break-words text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-900 md:text-6xl">
            {titulo}
          </h1>
          {texto && (
            <p className="mt-5 break-words text-lg leading-relaxed text-neutral-600">{texto}</p>
          )}
          {botao && (
            <a
              href={linkSeguro(link)}
              className="mt-8 inline-flex min-h-12 items-center rounded-full px-7 text-sm font-semibold text-white shadow-lg"
              style={{ background: "var(--site-cor)" }}
            >
              {botao}
            </a>
          )}
        </div>
        {!centro && (
          <div className="aspect-[4/5] overflow-hidden rounded-[28px] shadow-2xl shadow-neutral-900/10">
            <Foto src={foto} alt={descricaoFoto || "Foto da capa"} />
          </div>
        )}
      </div>
    </section>
  );
}
