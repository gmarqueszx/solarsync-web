import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Largura em pixels do elemento, acompanhada por `ResizeObserver`.
 *
 * ⚠️ É o que permite ao SVG ter um `viewBox` do tamanho real em vez de
 * `preserveAspectRatio="none"`. Com o viewBox esticado, o eixo X e o eixo Y ganham escalas
 * diferentes e **todo círculo vira elipse** — foi exatamente o que deformava os pontos do
 * gráfico de ritmo do dashboard, e não há como corrigir por CSS depois.
 */
export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [largura, setLargura] = useState(0);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    setLargura(elemento.clientWidth);

    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(entradas => {
      const medida = entradas[0]?.contentRect.width;
      if (medida !== undefined) setLargura(medida);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, largura] as const;
}
