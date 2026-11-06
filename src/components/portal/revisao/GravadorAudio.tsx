import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

import { tipoDoAudio } from "@/lib/revisao";

const LIMITE_SEGUNDOS = 120;

/**
 * "Prefere falar? Grave um áudio" (card RS-2): até 2 minutos, com ouvir, regravar e apagar.
 * Sem microfone liberado, avisa e a pessoa continua escrevendo.
 */
export function GravadorAudio({
  arquivo,
  temAudioSalvo,
  aoMudar,
}: {
  arquivo: File | null;
  /** O ajuste já tem um áudio enviado (ao editar). */
  temAudioSalvo: boolean;
  aoMudar: (f: File | null, apagouOSalvo: boolean) => void;
}) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!arquivo) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  useEffect(
    () => () => {
      if (relogio.current) window.clearInterval(relogio.current);
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  function parar() {
    if (relogio.current) window.clearInterval(relogio.current);
    relogio.current = null;
    if (gravador.current?.state === "recording") gravador.current.stop();
    setGravando(false);
  }

  async function gravar() {
    setAviso(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAviso("Este navegador não grava áudio. Escreva no campo acima.");
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(fluxo);
      const pedacos: Blob[] = [];
      r.ondataavailable = (ev) => {
        if (ev.data.size > 0) pedacos.push(ev.data);
      };
      r.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());
        const tipo = tipoDoAudio(r.mimeType || "audio/webm");
        if (!tipo) {
          setAviso("Não conseguimos gravar neste navegador. Escreva no campo acima.");
          return;
        }
        const ext = tipo === "audio/mp4" ? "m4a" : tipo.split("/")[1];
        aoMudar(new File(pedacos, `audio-do-ajuste.${ext}`, { type: tipo }), false);
      };
      gravador.current = r;
      r.start();
      setSegundos(0);
      setGravando(true);
      relogio.current = window.setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= LIMITE_SEGUNDOS) parar();
          return s + 1;
        });
      }, 1000);
    } catch {
      setAviso("O microfone não foi liberado. Você pode escrever no campo acima.");
    }
  }

  const tempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  if (gravando)
    return (
      <button
        type="button"
        onClick={parar}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sit-risco px-4 text-[15px] font-semibold text-sit-risco-t"
      >
        <Square className="size-4 fill-current" aria-hidden="true" /> Parar a gravação ·{" "}
        <span className="tabular-nums">{tempo}</span>
      </button>
    );

  if (url || temAudioSalvo)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-hub-borda bg-white p-2">
        {url ? (
          <audio controls src={url} className="h-11 min-w-0 flex-1" />
        ) : (
          <span className="flex-1 px-2 text-[14px] text-hub-suave">Áudio gravado</span>
        )}
        <button
          type="button"
          onClick={() => aoMudar(null, true)}
          aria-label="Apagar o áudio"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-sit-neutro text-hub-tinta"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => void gravar()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B9B9B2] bg-white px-4 text-[15px] font-medium text-hub-tinta hover:border-hub-tinta"
      >
        <Mic className="size-4" aria-hidden="true" /> Prefere falar? Grave um áudio
      </button>
      {aviso && <p className="text-[13.5px] text-sit-atencao-t">{aviso}</p>}
    </div>
  );
}
