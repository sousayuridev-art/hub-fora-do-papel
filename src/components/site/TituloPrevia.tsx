import { partesDoTitulo } from "@/lib/paginasSite";

const forteClaro =
  "font-extrabold bg-[linear-gradient(92deg,#0b0e14_0%,#1e3a9e_50%,#3b5bff_100%)] bg-clip-text text-transparent [box-decoration-break:clone]";
const forteEscuro =
  "font-extrabold bg-[linear-gradient(92deg,#fff_0%,#a9bcff_55%,#ffb020_100%)] bg-clip-text text-transparent [box-decoration-break:clone]";

/** Título com a parte entre `**` em destaque, como no site (classes i-gt e i-gt-esc). */
export function TituloPrevia({ texto, escuro = false }: { texto: string; escuro?: boolean }) {
  const { antes, forte, depois } = partesDoTitulo(texto);
  return (
    <>
      {antes && <span className="font-light">{antes}</span>}
      {forte && <span className={escuro ? forteEscuro : forteClaro}>{forte}</span>}
      {depois && <span className="font-light">{depois}</span>}
    </>
  );
}
