export type RodapeProps = {
  nome: string;
  endereco: string;
  instagram: string;
  whatsapp: string;
};

export function Rodape({ nome, endereco, instagram, whatsapp }: RodapeProps) {
  return (
    <footer className="mt-8 border-t border-neutral-200 px-6 py-12 md:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="break-words text-xl font-semibold text-neutral-900">{nome}</p>
          {endereco && <p className="mt-1 break-words text-sm text-neutral-500">{endereco}</p>}
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-600">
          {instagram && <span>Instagram {instagram}</span>}
          {whatsapp && <span>WhatsApp {whatsapp}</span>}
        </div>
      </div>
    </footer>
  );
}
