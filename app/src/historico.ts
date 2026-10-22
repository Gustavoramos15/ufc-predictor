// Avaliação das previsões registradas antes de cada evento, comparadas com o resultado real.
import type { PrevisaoRegistrada } from "./tipos";

export type Avaliacao = "acertou" | "errou" | "sem_favorito" | "nao_avaliavel" | "aguardando";

export function avaliar(p: PrevisaoRegistrada): Avaliacao {
  const r = p.resultado_real;
  if (!r) return "aguardando";
  if (r.vencedor !== "a" && r.vencedor !== "b") return "nao_avaliavel"; // empate ou sem resultado
  const pa = p.previsao.a.vitoria.prob;
  if (pa === 0.5) return "sem_favorito";
  const favorito = pa > 0.5 ? "a" : "b";
  return favorito === r.vencedor ? "acertou" : "errou";
}

/**
 * Simulação de 1 unidade apostada, usando a odd da casa REGISTRADA antes da luta.
 * Estratégia "favorito": no lado que o modelo acha mais provável.
 * Estratégia "valor": no lado com valor estimado acima do limite (+EV), se houver.
 * Retorna null quando não há odds registradas ou o resultado ainda não saiu.
 */
export type Estrategia = "favorito" | "valor";

export interface Aposta {
  lado: "a" | "b";
  odd: number;
  valorEstimado: number;
  unidades: number | null; // null = aguardando resultado; 0 = devolvida (empate/sem resultado)
}

export function apostaSimulada(p: PrevisaoRegistrada, estrategia: Estrategia, limiteValor = 0.05): Aposta | null {
  const o = p.odds_casa;
  if (!o || !o.a.atual || !o.b.atual) return null;
  const pa = p.previsao.a.vitoria.prob;
  const va = pa * o.a.atual - 1;
  const vb = (1 - pa) * o.b.atual - 1;
  let lado: "a" | "b";
  if (estrategia === "favorito") {
    if (pa === 0.5) return null;
    lado = pa > 0.5 ? "a" : "b";
  } else {
    const melhor = va >= vb ? "a" : "b";
    if ((melhor === "a" ? va : vb) <= limiteValor) return null;
    lado = melhor;
  }
  const odd = lado === "a" ? o.a.atual : o.b.atual;
  const r = p.resultado_real;
  let unidades: number | null = null;
  if (r) unidades = r.vencedor === lado ? odd - 1 : r.vencedor === "a" || r.vencedor === "b" ? -1 : 0;
  return { lado, odd, valorEstimado: lado === "a" ? va : vb, unidades };
}

export interface ResumoApostas {
  apostas: number; // com resultado
  acertos: number;
  unidades: number;
  roi: number | null; // unidades / apostas
  aguardando: number;
}

export function resumirApostas(lista: PrevisaoRegistrada[], estrategia: Estrategia): ResumoApostas {
  let apostas = 0, acertos = 0, unidades = 0, aguardando = 0;
  for (const p of lista) {
    const a = apostaSimulada(p, estrategia);
    if (!a) continue;
    if (a.unidades == null) {
      aguardando++;
      continue;
    }
    apostas++;
    unidades += a.unidades;
    if (a.unidades > 0) acertos++;
  }
  return { apostas, acertos, unidades, roi: apostas ? unidades / apostas : null, aguardando };
}

export interface Resumo {
  total: number;
  avaliadas: number;
  acertos: number;
  aguardando: number;
  logLoss: number | null;
  brier: number | null;
}

export function resumir(lista: PrevisaoRegistrada[]): Resumo {
  let acertos = 0, avaliadas = 0, aguardando = 0, ll = 0, brier = 0, nProb = 0;
  for (const p of lista) {
    const av = avaliar(p);
    if (av === "aguardando") aguardando++;
    if (av === "acertou" || av === "errou" || av === "sem_favorito") {
      avaliadas++;
      if (av === "acertou") acertos++;
      const pVencedor = p.resultado_real!.vencedor === "a" ? p.previsao.a.vitoria.prob : p.previsao.b.vitoria.prob;
      ll -= Math.log(Math.max(pVencedor, 1e-12));
      brier += (1 - pVencedor) ** 2;
      nProb++;
    }
  }
  return {
    total: lista.length,
    avaliadas,
    acertos,
    aguardando,
    logLoss: nProb ? ll / nProb : null,
    brier: nProb ? brier / nProb : null,
  };
}
