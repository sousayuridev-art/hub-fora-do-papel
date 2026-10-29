import { cn } from "@/lib/utils";

const siglas: Record<string, string> = {
  instagram: "IG",
  linkedin: "IN",
  tiktok: "TT",
  youtube: "YT",
};

/** Sigla do canal num quadradinho (sem logos de marca no Hub). */
export function SiglaCanal({
  canal,
  nome,
  publicada = false,
  className,
}: {
  canal: string;
  nome?: string | null;
  publicada?: boolean;
  className?: string;
}) {
  return (
    <span
      title={nome ?? canal}
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-rotulo text-[12.5px] font-medium",
        publicada
          ? "bg-sit-ok text-sit-ok-t"
          : "border border-hub-borda bg-[#F1F1EC] text-hub-tinta",
        className,
      )}
    >
      {siglas[canal] ?? canal.slice(0, 2).toUpperCase()}
      <span className="sr-only">
        {" "}
        {nome ?? canal}
        {publicada ? " (publicada)" : ""}
      </span>
    </span>
  );
}
