import { Check, Info, Star } from "lucide-react";

import { Recolhivel } from "@/components/proposta-publica/Recolhivel";
import { TituloSecao } from "@/components/proposta-publica/TituloSecao";
import type { DocumentoPublico } from "@/lib/propostas";

/** 01 O que ouvimos de você */
export function SecaoOuvimos({ doc }: { doc: DocumentoPublico }) {
  if (doc.ouvimos.length === 0 && !doc.ouvimos_conclusao) return null;
  return (
    <section id="ouvimos" aria-labelledby="ouvimos-t" className="flex flex-col gap-5">
      <TituloSecao numero={1} id="ouvimos">
        O que ouvimos de você
      </TituloSecao>
      {doc.ouvimos.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-3">
          {doc.ouvimos.map((f, i) => (
            <li
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5"
            >
              <span aria-hidden="true" className="h-1 w-6 rounded-full bg-[#FFB020]" />
              <blockquote className="font-titulo text-[17px] font-semibold leading-snug md:text-[19px]">
                “{f}”
              </blockquote>
            </li>
          ))}
        </ul>
      )}
      {doc.ouvimos_conclusao && (
        <p className="flex gap-3 rounded-2xl border border-hub-borda bg-white p-5 text-[15px]">
          <Info className="mt-0.5 size-5 shrink-0 text-hub-suave" aria-hidden="true" />
          {doc.ouvimos_conclusao}
        </p>
      )}
    </section>
  );
}

/** 02 O que vamos fazer */
export function SecaoFazer({ doc }: { doc: DocumentoPublico }) {
  const destaque = doc.itens.filter((i) => i.destaque);
  const outros = doc.itens.filter((i) => !i.destaque);
  return (
    <section id="fazer" aria-labelledby="fazer-t" className="flex flex-col gap-5">
      <TituloSecao numero={2} id="fazer">
        O que vamos fazer
      </TituloSecao>
      {destaque.map((it) => (
        <div key={it.nome} className="flex gap-4 rounded-2xl bg-hub-tinta p-6 text-white">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFB020]">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[13.5px] font-medium text-[#C9CBD0]">O coração do projeto</span>
            <h3 className="font-titulo text-[20px] font-bold">{it.nome}</h3>
            {it.descricao && <p className="text-[15px] text-[#C9CBD0]">{it.descricao}</p>}
          </div>
        </div>
      ))}
      <ul className="grid gap-3 md:grid-cols-2">
        {outros.map((it) => (
          <li key={it.nome} className="flex gap-3 rounded-2xl border border-hub-borda bg-white p-5">
            <Check className="mt-1 size-5 shrink-0 text-sit-ok-t" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold">{it.nome}</h3>
              {it.descricao && <p className="text-[14.5px] text-hub-suave">{it.descricao}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 03 O que não está incluído */
export function SecaoFora({ doc }: { doc: DocumentoPublico }) {
  return (
    <section id="fora" aria-labelledby="fora-t" className="flex flex-col gap-4">
      <TituloSecao numero={3} id="fora">
        O que não está incluído
      </TituloSecao>
      <p className="text-[15px] text-hub-suave">
        Deixar isso claro agora evita surpresa depois. Se algum destes itens fizer sentido, ele vira
        um serviço adicional, com valor combinado antes.
      </p>
      <Recolhivel quantidade={doc.fora.length}>
        <ul className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
          {doc.fora.map((f) => (
            <li
              key={f.item}
              className="grid gap-1 border-b border-hub-borda p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6"
            >
              <span className="font-semibold">{f.item}</span>
              {f.motivo && <span className="text-[14.5px] text-hub-suave">{f.motivo}</span>}
            </li>
          ))}
        </ul>
      </Recolhivel>
    </section>
  );
}

/** 04 Como vamos trabalhar */
export function SecaoTrabalhar({ doc }: { doc: DocumentoPublico }) {
  const cartoes = [
    {
      rotulo: "Aprovações",
      titulo: "Você aprova cada parte",
      texto: "Cada entrega chega para você ver e aprovar antes de seguirmos.",
    },
    {
      rotulo: "Pedidos de ajuste",
      titulo: "Pedidos num só lugar",
      texto:
        "Se pedir algo dentro do combinado, fazemos sem custo. Se ficar fora, mostramos o valor antes de começar.",
    },
    {
      rotulo: "Contato",
      titulo: "Um responsável do início ao fim",
      texto: `${doc.responsavel} acompanha o projeto e responde pelo WhatsApp.`,
    },
  ];
  return (
    <section id="trabalhar" aria-labelledby="trabalhar-t" className="flex flex-col gap-5">
      <TituloSecao numero={4} id="trabalhar">
        Como vamos trabalhar
      </TituloSecao>
      {doc.fases.length > 0 && (
        <Recolhivel quantidade={doc.fases.length}>
          <ol className="flex flex-col gap-0 rounded-2xl border border-hub-borda bg-white p-5 md:flex-row md:p-6">
            {doc.fases.map((f, i) => (
              <li
                key={`${f.nome}-${i}`}
                className="flex flex-1 items-start gap-3 py-2 md:flex-col md:items-center md:py-0 md:text-center"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 size-4 shrink-0 rounded-full border-2 ${
                    i === doc.fases.length - 1
                      ? "border-[#FFB020] bg-[#FFB020]"
                      : "border-hub-tinta bg-white"
                  }`}
                />
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{f.nome}</span>
                  {f.quando && <span className="text-[13px] text-hub-suave">{f.quando}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Recolhivel>
      )}
      <ul className="grid gap-3 md:grid-cols-3">
        {cartoes.map((c) => (
          <li
            key={c.rotulo}
            className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5"
          >
            <span className="text-[13.5px] font-medium text-hub-suave">{c.rotulo}</span>
            <h3 className="font-titulo text-[17px] font-bold">{c.titulo}</h3>
            <p className="text-[14.5px] text-hub-suave">{c.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
