// Quais eventos aparecem no app e em que situação estão.
import type { Evento } from "./tipos";

const HORAS_VISIVEL_APOS_FIM = 24;

/** Eventos em ordem de data, sem os que terminaram há mais de 24h (mesma regra do pipeline). */
export function eventosVisiveis(lista: Evento[], agora = Date.now()): Evento[] {
  return [...lista]
    .filter((e) => {
      const fim = e.fim_estimado ? new Date(e.fim_estimado).getTime() : NaN;
      return isNaN(fim) || agora < fim + HORAS_VISIVEL_APOS_FIM * 3600000;
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

export type Situacao = "futuro" | "ao_vivo" | "encerrado";

export function situacaoEvento(e: Evento, agora = Date.now()): Situacao {
  if (e.status === "STATUS_FINAL") return "encerrado";
  const inicio = new Date(e.data).getTime();
  const fim = e.fim_estimado ? new Date(e.fim_estimado).getTime() : NaN;
  if (!isNaN(fim) && agora >= fim) return "encerrado";
  if (e.status === "STATUS_IN_PROGRESS" || (!isNaN(inicio) && agora >= inicio)) return "ao_vivo";
  return "futuro";
}
