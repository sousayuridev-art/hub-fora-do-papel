import { useQuery } from "@tanstack/react-query";

import { chavesTrafego, nomesDeCampanhas } from "@/lib/trafego";

export const idSugestoesCampanhas = "campanhas-cadastradas";

/** Lista de sugestões (datalist) com as campanhas de Tráfego pago, para "Qual anúncio". */
export function SugestoesCampanhas({ ativo }: { ativo: boolean }) {
  const nomes = useQuery({
    queryKey: chavesTrafego.campanhas,
    queryFn: nomesDeCampanhas,
    enabled: ativo,
  });
  return (
    <datalist id={idSugestoesCampanhas}>
      {(nomes.data ?? []).map((n) => (
        <option key={n.name} value={n.name} />
      ))}
    </datalist>
  );
}
