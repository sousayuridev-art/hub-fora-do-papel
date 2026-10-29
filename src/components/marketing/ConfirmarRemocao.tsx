import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Peca } from "@/lib/marketing";

/** Remover peça é definitivo (versões e histórico juntos): pede confirmação. */
export function ConfirmarRemocao({
  peca,
  aoCancelar,
  aoConfirmar,
}: {
  peca: Peca | null;
  aoCancelar: () => void;
  aoConfirmar: (p: Peca) => void;
}) {
  return (
    <AlertDialog open={!!peca} onOpenChange={(a) => !a && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{peca?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            A peça sai do quadro com as {peca?.versoes.length ?? 0} versões e o histórico. Não dá
            para desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11 bg-sit-risco-t text-white hover:bg-[#7E160E]"
            onClick={() => peca && aoConfirmar(peca)}
          >
            Remover peça
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
