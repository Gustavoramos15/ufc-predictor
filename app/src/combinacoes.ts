// Combinações de método ("vitória por KO ou decisão" etc.) calculadas a partir da previsão.
// Os métodos de um lutador são mutuamente exclusivos, então a probabilidade combinada é a soma exata.
import type { Previsao, PrevisaoLado } from "./tipos";

type ChaveMetodo = "ko_tko" | "finalizacao" | "decisao";

// [chave, nome no início da frase, nome no meio da frase]
export const METODOS: [ChaveMetodo, string, string][] = [
  ["ko_tko", "KO/TKO", "KO/TKO"],
  ["finalizacao", "Finalização", "finalização"],
  ["decisao", "Decisão", "decisão"],
];

export interface Opcao {
  rotulo: string;
  prob: number;
  odd: number | null;
}

function opcao(rotulo: string, prob: number): Opcao {
  return { rotulo, prob, odd: prob > 0 ? 1 / prob : null };
}

/** As três combinações de dois métodos de um lutador, da mais para a menos provável. */
export function combinacoes(lado: PrevisaoLado): Opcao[] {
  const lista: Opcao[] = [];
  for (let i = 0; i < METODOS.length; i++) {
    for (let j = i + 1; j < METODOS.length; j++) {
      const [ci, ri] = METODOS[i];
      const [cj, , rj] = METODOS[j];
      lista.push(opcao(`${ri} ou ${rj}`, lado[ci].prob + lado[cj].prob));
    }
  }
  return lista.sort((a, b) => b.prob - a.prob);
}

/** Mercados da luta como um todo (qualquer um dos dois lutadores). */
export function comoTermina(p: Previsao): Opcao[] {
  const decisao = p.a.decisao.prob + p.b.decisao.prob;
  const ko = p.a.ko_tko.prob + p.b.ko_tko.prob;
  const fin = p.a.finalizacao.prob + p.b.finalizacao.prob;
  return [
    opcao("Vai para a decisão", decisao),
    opcao("Termina antes (KO/TKO ou finalização)", ko + fin),
    opcao("Termina por KO/TKO (qualquer um)", ko),
    opcao("Termina por finalização (qualquer um)", fin),
  ];
}

/** O resultado individual (lutador + método) com maior probabilidade. */
export function resultadoMaisProvavel(p: Previsao, nomeA: string, nomeB: string) {
  let melhor = { nome: nomeA, metodo: METODOS[0][2], prob: -1 };
  for (const [lado, nome] of [["a", nomeA], ["b", nomeB]] as const) {
    for (const [chave, , rotulo] of METODOS) {
      if (p[lado][chave].prob > melhor.prob) melhor = { nome, metodo: rotulo, prob: p[lado][chave].prob };
    }
  }
  return melhor;
}

/** Grau de confiança na previsão do VENCEDOR (não do método). */
export function confianca(pa: number): { texto: string; nivel: 0 | 1 | 2 } {
  const margem = Math.abs(pa - 0.5);
  if (margem < 0.05) return { texto: "Luta equilibrada", nivel: 0 };
  if (margem < 0.15) return { texto: "Leve favorito", nivel: 1 };
  return { texto: "Favorito claro", nivel: 2 };
}
