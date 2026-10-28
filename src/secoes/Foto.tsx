/** Foto da seção ou um fundo na cor do site enquanto não há foto. */
export function Foto({ src, alt }: { src?: string | undefined; alt: string }) {
  if (src)
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  return (
    <div
      role="img"
      aria-label={`${alt} (sem foto ainda)`}
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(140deg, var(--site-suave) 0%, #ffffff 55%, var(--site-suave) 100%)",
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
        style={{ background: "var(--site-cor)" }}
      />
      <div
        className="absolute bottom-6 left-6 h-16 w-16 rounded-2xl opacity-20"
        style={{ background: "var(--site-cor)" }}
      />
    </div>
  );
}
