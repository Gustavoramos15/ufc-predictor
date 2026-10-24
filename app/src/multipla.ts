// Montagem de múltiplas (duplas, triplas, quádruplas ou card todo) a partir das previsões do modelo.
import { metodoDoFavorito } from "./combinacoes";
import type { Evento } from "./tipos";

export type TipoPalpite = "vitoria" | "metodo";
export type Tamanho = 2 | 3 | 4 | "card";

export interface Perna {
  lutaId: string;
  numero: number;
  favorito: string;
  adversario: string;
  palpite: string; // ex.: "Temirov vence" ou "Temirov por KO/TKO"
  prob: number;
  oddJusta: number;
  oddCasa: number | null; // só existe para vitória (a ESPN não traz odds de método)
}

export interface Multipla {
  pernas: Perna[];
  prob: number;
  oddJusta: number;
  oddCasa: number | null; // produto das odds da casa, se todas as pernas tiverem
  valorEstimado: number | null; // prob × oddCasa − 1
  pernasSemOdd: number;
}

/** Palpite do modelo em cada luta com previsão: o favorito (e, no modo método, o método mais provável dele). */
export function pernasDoEvento(ev: Evento, tipo: TipoPalpite): Perna[] {
  const pernas: Perna[] = [];
  for (const l of ev.lutas) {
    const p = l.previsao;
    if (!p) continue;
    const m = metodoDoFavorito(p, l.lutador_a.nome, l.lutador_b.nome);
    const adversario = m.lado === "a" ? l.lutador_b.nome : l.lutador_a.nome;
    const prob = tipo === "vitoria" ? m.probVitoria : m.prob;
    const oddCasa = tipo === "vitoria" ? l.odds_casa?.[m.lado].atual ?? null : null;
    pernas.push({
      lutaId: l.id,
      numero: l.numero,
      favorito: m.nome,
      adversario,
      palpite: tipo === "vitoria" ? `${m.nome} vence` : `${m.nome} por ${m.metodo}`,
      prob,
      oddJusta: 1 / prob,
      oddCasa,
    });
  }
  return pernas;
}

/**
 * Combinação mais provável com N pernas: as N lutas de maior probabilidade
 * (o produto é máximo quando escolhemos as maiores). "card" = todas as lutas com previsão.
 */
export function montarMultipla(ev: Evento, tipo: TipoPalpite, tamanho: Tamanho): Multipla | null {
  const todas = pernasDoEvento(ev, tipo).sort((x, y) => y.prob - x.prob);
  const n = tamanho === "card" ? todas.length : tamanho;
  if (n < 2 || todas.length < n) return null;
  const pernas = todas.slice(0, n).sort((x, y) => y.numero - x.numero); // ordem do card (principal por último)
  const prob = pernas.reduce((t, p) => t * p.prob, 1);
  const semOdd = pernas.filter((p) => p.oddCasa == null).length;
  const oddCasa = semOdd === 0 ? pernas.reduce((t, p) => t * (p.oddCasa as number), 1) : null;
  return {
    pernas,
    prob,
    oddJusta: 1 / prob,
    oddCasa,
    valorEstimado: oddCasa != null ? prob * oddCasa - 1 : null,
    pernasSemOdd: semOdd,
  };
}

export function lutasComPrevisao(ev: Evento): number {
  return ev.lutas.filter((l) => l.previsao).length;
}
