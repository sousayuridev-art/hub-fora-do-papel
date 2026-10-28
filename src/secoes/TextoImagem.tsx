import { Foto } from "./Foto";

export type TextoImagemProps = {
  titulo: string;
  texto: string;
  foto: string;
  descricaoFoto: string;
  lado: "esquerda" | "direita";
};

export function TextoImagem({ titulo, texto, foto, descricaoFoto, lado }: TextoImagemProps) {
  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
        <div
          className={`aspect-[4/3] overflow-hidden rounded-3xl ${lado === "direita" ? "md:order-2" : ""}`}
        >
          <Foto src={foto} alt={descricaoFoto || titulo} />
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
            {titulo}
          </h2>
          <p className="mt-4 whitespace-pre-line break-words text-base leading-relaxed text-neutral-600 md:text-lg">
            {texto}
          </p>
        </div>
      </div>
    </section>
  );
}
