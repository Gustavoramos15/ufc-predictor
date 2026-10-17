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
