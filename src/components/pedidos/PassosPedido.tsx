/** Os 3 passos de todo pedido (topo da tela de Pedidos). */
export function PassosPedido({ horaCents }: { horaCents: string }) {
  const passos = [
    {
      titulo: "Classificar",
      texto: "Dentro do combinado, horas da mensalidade ou serviço adicional.",
    },
    {
      titulo: "Estimar horas",
      texto: `O valor do serviço adicional sai da hora de referência (${horaCents}), com mínimo de 1 h.`,
    },
    {
      titulo: "Enviar ao cliente",
      texto: "Serviço adicional: o cliente decide no portal. Nada começa sem resposta.",
    },
  ];
  return (
    <ol className="grid overflow-hidden rounded-2xl border border-hub-borda bg-white md:grid-cols-3">
      {passos.map((p, i) => (
        <li
          key={p.titulo}
          className="flex gap-3 border-hub-borda p-5 max-md:border-b max-md:last:border-b-0 md:border-r md:last:border-r-0"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1D6] font-rotulo text-[13px] font-semibold text-[#7A4200]">
            {i + 1}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">{p.titulo}</span>
            <span className="text-[14px] text-hub-suave">{p.texto}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
