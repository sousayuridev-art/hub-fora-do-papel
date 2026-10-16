import { Button } from "@/components/ui/button";

/** Rodapé padrão dos painéis: Cancelar + ação (âmbar). */
export function BotoesPainel({
  rotulo,
  aoConfirmar,
  aoCancelar,
  desabilitado = false,
  perigo = false,
}: {
  rotulo: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  desabilitado?: boolean;
  perigo?: boolean;
}) {
  return (
    <>
      <Button variant="outline" className="h-11" onClick={aoCancelar}>
        Cancelar
      </Button>
      <Button
        className={
          perigo
            ? "h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]"
            : "h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
        }
        disabled={desabilitado}
        onClick={aoConfirmar}
      >
        {rotulo}
      </Button>
    </>
  );
}
