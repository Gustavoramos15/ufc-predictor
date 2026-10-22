// Formatação em português do Brasil.
import type { Metodo, Segmento } from "./tipos";

export function pct(p: number | null | undefined, casas = 1): string {
  if (p == null) return "—";
  const v = p * 100;
  // Probabilidades muito pequenas não aparecem como "0,0%", o que daria a ideia de impossível.
  if (v > 0 && v < 0.1) return "<0,1%";
  return `${v.toFixed(casas).replace(".", ",")}%`;
}

export function odd(o: number | null | undefined): string {
  if (o == null) return "—";
  if (o >= 1000) return "999+";
  return o.toFixed(2).replace(".", ",");
}

export function num(x: number | null | undefined, casas = 2): string {
  return x == null ? "—" : x.toFixed(casas).replace(".", ",");
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "data desconhecida";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (isNaN(d.getTime())) return iso;
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

export function dataEvento(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const texto = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${texto} · ${hora}`;
}

export function dataSimples(isoData: string | null | undefined): string {
  if (!isoData) return "—";
  const [a, m, d] = isoData.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function horasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : (Date.now() - t) / 3600000;
}

export const NOME_SEGMENTO: Record<Segmento, string> = {
  principal: "Card principal",
  preliminar: "Preliminares",
  preliminar_antecipada: "Card inicial",
  desconhecido: "Card não informado",
};

export const NOME_METODO: Record<Metodo, string> = {
  "KO/TKO": "KO/TKO",
  FINALIZACAO: "Finalização",
  DECISAO: "Decisão",
  OUTRO: "Outro",
};

const CATEGORIAS: Record<string, string> = {
  strawweight: "Palha",
  flyweight: "Mosca",
  bantamweight: "Galo",
  featherweight: "Pena",
  lightweight: "Leve",
  welterweight: "Meio-médio",
  middleweight: "Médio",
  "light heavyweight": "Meio-pesado",
  heavyweight: "Pesado",
  "catch weight": "Peso combinado",
};

export function categoria(c: string | null | undefined): string {
  if (!c) return "Categoria não informada";
  const s = c.toLowerCase().trim();
  const feminino = s.startsWith("w ") || s.includes("women");
  const base = s.replace(/^w /, "").replace("women's ", "");
  const nome = CATEGORIAS[base] ?? c;
  return feminino ? `${nome} (fem.)` : nome;
}

/** "Finalização ou decisão" -> "finalização ou decisão"; "KO/TKO ou decisão" fica igual. */
export function primeiraMinuscula(texto: string): string {
  return texto.startsWith("KO/TKO") ? texto : texto.charAt(0).toLowerCase() + texto.slice(1);
}

export function sobrenome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? partes.slice(1).join(" ") : nome;
}
