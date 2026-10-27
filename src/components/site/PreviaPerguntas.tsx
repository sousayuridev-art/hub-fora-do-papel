import { gruposPerguntas, type BlocoPergunta } from "@/lib/paginasSite";

function Lista({ itens }: { itens: BlocoPergunta[] }) {
  return (
    <div className="flex flex-col border-t border-[#e2e2dc]">
      {itens.map((p, i) => (
        <details key={i} className="border-b border-[#e2e2dc] py-3">
          <summary className="min-h-11 cursor-pointer break-words py-2 text-[17px] font-semibold">
            {p.pergunta || "Pergunta"}
          </summary>
          <p className="break-words text-[16px] text-[#2a2d33]">{p.resposta}</p>
        </details>
      ))}
    </div>
  );
}

/** Perguntas: as marcadas para a página inicial e todas em /perguntas, por grupo. */
export function PreviaPerguntas({ valor }: { valor: BlocoPergunta[] }) {
  return (
    <section className="flex flex-col gap-8 p-5 sm:p-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[12.5px] text-[#4a4d54]">PÁGINA INICIAL</p>
        <Lista itens={valor.filter((p) => p.inicio)} />
      </div>
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[12.5px] text-[#4a4d54]">PÁGINA /PERGUNTAS</p>
        {gruposPerguntas.map((g) => (
          <div key={g.id} className="flex flex-col gap-2">
            <h3 className="text-[22px] font-bold tracking-[-0.02em]">{g.rotulo}</h3>
            <Lista itens={valor.filter((p) => p.grupo === g.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}
