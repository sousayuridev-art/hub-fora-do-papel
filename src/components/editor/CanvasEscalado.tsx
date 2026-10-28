import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { usePuck } from "@/components/editor/usePuck";

/**
 * Mostra a página na largura real (1280 ou 390 px) e reduz para caber no espaço,
 * para os breakpoints do site valerem dentro do editor (card PC-4).
 */
export function CanvasEscalado({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });
  const largura = usePuck((s) => s.appState.ui.viewports.current.width);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setCaixa({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const alvo = typeof largura === "number" ? largura : caixa.w;
  const escala = caixa.w && alvo ? Math.min(1, caixa.w / alvo) : 1;
  const w = alvo || caixa.w;

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {caixa.w > 0 && (
        <div
          className="mx-auto h-full overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-20px_rgba(14,16,19,0.35)] ring-1 ring-black/5 transition-[width] duration-300"
          style={{ width: w * escala }}
        >
          <div
            style={{
              width: w,
              height: caixa.h / escala,
              transform: `scale(${escala})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
