import { Sigla } from "@/components/hub/Selo";
import { sigla, telefone } from "@/lib/formatar";
import { rotuloOrigem, type ClienteLinha } from "@/lib/funil";

/** Cartão "Contato principal" da ficha. */
export function ClienteContato({ c, aoEditar }: { c: ClienteLinha; aoEditar?: () => void }) {
  const linhas: [string, string | null][] = [
    ["WhatsApp", c.whatsapp ? telefone(c.whatsapp) : null],
    ["E-mail", c.email],
    [
      "Origem",
      rotuloOrigem[c.origin] +
        (c.ad_name ? ` · ${c.ad_name}` : "") +
        (c.referred_by ? ` · ${c.referred_by}` : ""),
    ],
    ["Site atual", c.current_site],
  ];
  return (
    <section
      aria-labelledby="titulo-contato"
      className="rounded-2xl border border-hub-borda bg-white"
    >
      <h2 id="titulo-contato" className="px-5 pt-4 font-titulo text-lg font-bold">
        Contato principal
      </h2>
      <div className="flex items-center gap-3 border-b border-hub-borda px-5 py-4">
        <Sigla texto={sigla(c.contact_name)} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{c.contact_name}</span>
          {c.contact_role && (
            <span className="truncate text-[13.5px] text-hub-suave">{c.contact_role}</span>
          )}
        </div>
      </div>
      <dl>
        {linhas
          .filter(([, v]) => v)
          .map(([rotulo, valor]) => (
            <div
              key={rotulo}
              className="grid grid-cols-[96px_1fr] gap-3 border-b border-hub-borda px-5 py-3 last:border-b-0"
            >
              <dt className="font-rotulo text-[12.5px] uppercase tracking-[0.08em] text-hub-suave">
                {rotulo}
              </dt>
              <dd className="min-w-0 break-words text-[14.5px]">{valor}</dd>
            </div>
          ))}
      </dl>
      {aoEditar && (
        <button
          type="button"
          onClick={aoEditar}
          className="inline-flex min-h-11 items-center border-t border-hub-borda px-5 text-[14.5px] font-medium text-[#1E3FA8] underline underline-offset-4 w-full"
        >
          Editar ficha
        </button>
      )}
    </section>
  );
}
