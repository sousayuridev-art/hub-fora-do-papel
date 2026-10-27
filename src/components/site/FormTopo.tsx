import { classeEntrada } from "@/components/hub/Campo";
import { CampoContador } from "@/components/site/CampoContador";
import { CHAMADA_FIXA, LIMITES, type BlocoTopo } from "@/lib/paginasSite";
import { cn } from "@/lib/utils";

const ajudaDestaque = (
  <>
    A parte entre <code>**</code> ganha o destaque colorido. Ex.:{" "}
    <code>**Sistemas sob medida**</code> para empresas…
  </>
);

/** Topo da página inicial (card CMS-4). A chamada e o destino dos links são fixos. */
export function FormTopo({
  valor,
  aoMudar,
}: {
  valor: BlocoTopo;
  aoMudar: (v: BlocoTopo) => void;
}) {
  const L = LIMITES.topo;
  const mudar = (campo: keyof BlocoTopo) => (v: string) => aoMudar({ ...valor, [campo]: v });
  return (
    <div className="flex flex-col gap-4">
      <CampoContador
        rotulo="Linha acima do título"
        valor={valor.linha}
        aoMudar={mudar("linha")}
        limite={L.linha}
      />
      <CampoContador
        rotulo="Título"
        valor={valor.titulo}
        aoMudar={mudar("titulo")}
        limite={L.titulo}
        linhas={2}
        semDestaque
        ajuda={ajudaDestaque}
      />
      <CampoContador
        rotulo="Texto de apoio"
        valor={valor.apoio}
        aoMudar={mudar("apoio")}
        limite={L.apoio}
        linhas={4}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] font-medium">Botão principal</span>
        <input
          value={CHAMADA_FIXA}
          disabled
          aria-label="Botão principal (fixo)"
          className={cn(classeEntrada, "h-11 bg-hub-fundo")}
        />
        <p className="text-[13px] text-hub-suave">Fixo: leva ao formulário de contato.</p>
      </div>
      <CampoContador
        rotulo="Link para quem precisa só de um site"
        valor={valor.link_sites}
        aoMudar={mudar("link_sites")}
        limite={L.link_sites}
        ajuda="O link sempre leva à frente de sites."
      />
    </div>
  );
}
