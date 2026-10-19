import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Link2,
  Presentation,
  Type,
} from "lucide-react";

import type { Material } from "@/lib/materiais";

/** Ícone pelo tipo do material, em caixa âmbar clara. */
export function IconeMaterial({ m }: { m: Pick<Material, "tipo" | "mime"> }) {
  const mime = m.mime ?? "";
  const Icone =
    m.tipo === "texto"
      ? Type
      : m.tipo === "link"
        ? Link2
        : mime === "application/pdf" || mime.includes("word") || mime === "text/plain"
          ? FileText
          : mime.startsWith("image/")
            ? FileImage
            : mime.includes("sheet") || mime.includes("excel") || mime === "text/csv"
              ? FileSpreadsheet
              : mime.includes("presentation") || mime.includes("powerpoint")
                ? Presentation
                : mime.startsWith("video/")
                  ? FileVideo
                  : mime.startsWith("audio/")
                    ? FileAudio
                    : mime === "application/zip"
                      ? FileArchive
                      : File;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF1D6] text-[#7A4200]">
      <Icone className="size-5" aria-hidden="true" />
    </span>
  );
}
