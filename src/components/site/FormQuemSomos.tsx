import { CampoContador } from "@/components/site/CampoContador";
import { LIMITES, type BlocoQuemSomos } from "@/lib/paginasSite";

/** Quem somos (card CMS-4): título com destaque e texto. Foto e etiquetas ficam no site. */
export function FormQuemSomos({
  valor,
  aoMudar,
}: {
  valor: BlocoQuemSomos;
  aoMudar: (v: BlocoQuemSomos) => void;
}) {
  const L = LIMITES.quemSomos;
  return (
    <div className="flex flex-col gap-4">
      <CampoContador
        rotulo="Título"
        valor={valor.titulo}
        aoMudar={(titulo) => aoMudar({ ...valor, titulo })}
        limite={L.titulo}
        semDestaque
        ajuda={
          <>
            A parte entre <code>**</code> ganha o destaque colorido.
          </>
        }
      />
      <CampoContador
        rotulo="Texto"
        valor={valor.texto}
        aoMudar={(texto) => aoMudar({ ...valor, texto })}
        limite={L.texto}
        linhas={4}
      />
    </div>
  );
}
