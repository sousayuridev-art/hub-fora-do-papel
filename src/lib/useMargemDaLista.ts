import { useLayoutEffect, useRef, useState } from "react";

/**
 * Distância do topo da página até a lista, para o `useWindowVirtualizer` (lista que rola com a
 * página, sem rolagem interna). Mede de novo quando algo acima dela muda de altura.
 */
export function useMargemDaLista<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [margem, setMargem] = useState(0);
  useLayoutEffect(() => {
    const medir = () => {
      if (ref.current) setMargem(ref.current.getBoundingClientRect().top + window.scrollY);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(document.body);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);
  return { ref, margem };
}
