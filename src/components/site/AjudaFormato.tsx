import { Info } from "lucide-react";

/** Ajuda curta sobre links e destaque dentro dos textos (mesma regra do site). */
export function AjudaFormato() {
  return (
    <div className="flex gap-3 rounded-xl bg-sit-info p-3.5 text-[13.5px] leading-relaxed text-sit-info-t">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        Para um link, escreva <code className="font-semibold">[texto do link](/caminho)</code>, por
        exemplo <code className="font-semibold">[fale com a gente](/contato)</code>. Link para outro
        site começa com https://. Para destacar, use{" "}
        <code className="font-semibold">**texto**</code>.
      </p>
    </div>
  );
}
