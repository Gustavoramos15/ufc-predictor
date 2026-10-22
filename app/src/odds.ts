// Comparação entre a odd da casa e a probabilidade do modelo.
import type { OddsCasa } from "./tipos";

/** Margem da casa: quanto a soma das probabilidades implícitas passa de 100%. */
export function margemCasa(o: OddsCasa): number | null {
  if (!o.a.atual || !o.b.atual) return null;
  return 1 / o.a.atual + 1 / o.b.atual - 1;
}

/** Probabilidade implícita da casa sem a margem (normalizada para somar 100%). */
export function probCasaSemMargem(o: OddsCasa, lado: "a" | "b"): number | null {
  if (!o.a.atual || !o.b.atual) return null;
  const ia = 1 / o.a.atual;
  const ib = 1 / o.b.atual;
  return (lado === "a" ? ia : ib) / (ia + ib);
}

/**
 * Valor esperado de 1 unidade apostada, SE a probabilidade do modelo estiver certa:
 * prob × odd − 1. Positivo = odd da casa acima da odd justa do modelo.
 */
export function valorEstimado(probModelo: number, oddCasa: number | null): number | null {
  return oddCasa ? probModelo * oddCasa - 1 : null;
}

/** O lado com maior valor estimado (quando há previsão e odds). */
export function melhorValor(
  p: { a: { vitoria: { prob: number } }; b: { vitoria: { prob: number } } } | null | undefined,
  o: OddsCasa | null | undefined,
): { lado: "a" | "b"; valor: number; odd: number } | null {
  if (!p || !o || !o.a.atual || !o.b.atual) return null;
  const va = valorEstimado(p.a.vitoria.prob, o.a.atual)!;
  const vb = valorEstimado(p.b.vitoria.prob, o.b.atual)!;
  return va >= vb ? { lado: "a", valor: va, odd: o.a.atual } : { lado: "b", valor: vb, odd: o.b.atual };
}

/** Limite para o selo "+EV": abaixo disso a diferença está dentro do erro do modelo. */
export const LIMITE_VALOR = 0.05;

export type Leitura = "acima" | "proxima" | "abaixo";

/** Faixa de ±5% para não dar destaque a diferenças pequenas, que estão dentro do erro do modelo. */
export function leituraValor(v: number | null): Leitura | null {
  if (v == null) return null;
  if (v > 0.05) return "acima";
  if (v < -0.05) return "abaixo";
  return "proxima";
}
