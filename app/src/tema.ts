// Visual baseado no protótipo ufc_predictor_prototype.html (tema escuro, vidro, vermelho/azul por canto).
export const cores = {
  fundo: "#0D0F14",
  fundoProfundo: "#08090C",
  painel: "#13161F",
  painelAlt: "#141722",
  cartao: "#181B24",
  cartaoTopo: "#1D212C",
  cartaoBase: "#12151D",
  borda: "rgba(255,255,255,0.07)",
  bordaForte: "rgba(255,255,255,0.14)",
  cinzaEscuro: "#1F2937", // gray-800
  texto: "#F3F4F6",
  textoMedio: "#D1D5DB", // gray-300
  textoSuave: "#9CA3AF", // gray-400
  textoApagado: "#6B7280", // gray-500
  // Canto A (vermelho) e canto B (azul): só identificação visual.
  vermelho: "#EF4444",
  vermelhoClaro: "#F87171",
  vermelhoEscuro: "#DC2626",
  azul: "#3B82F6",
  azulClaro: "#60A5FA",
  azulEscuro: "#2563EB",
  verde: "#10B981",
  verdeClaro: "#34D399",
  ambar: "#F59E0B",
  ambarClaro: "#FBBF24",
  roxo: "#A855F7",
  ciano: "#06B6D4",
  destaque: "#DC2626",
  // Compatibilidade com nomes antigos
  cartaoAlt: "#20232C",
  aviso: "#FBBF24",
  avisoFundo: "rgba(245,158,11,0.12)",
  erro: "#F87171",
  erroFundo: "rgba(239,68,68,0.12)",
  sucesso: "#34D399",
  info: "#60A5FA",
  infoFundo: "rgba(59,130,246,0.12)",
};

/** Fundo translúcido de uma cor (ex.: selos). */
export function translucido(hex: string, alfa: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

export const gradientes = {
  cartao: ["#1D212C", "#12151D"] as const,
  heroi: ["#221015", "#161922", "#12141A"] as const,
  valor: ["#10241A", "#12151E"] as const,
  vermelho: ["#EF4444", "#F59E0B"] as const, // anel do avatar A
  azul: ["#3B82F6", "#4F46E5"] as const, // anel do avatar B
  botao: ["#DC2626", "#B91C1C"] as const,
  barraA: ["#DC2626", "#F87171"] as const,
  barraB: ["#60A5FA", "#2563EB"] as const,
  logo: ["#DC2626", "#F59E0B"] as const,
};

// Fontes carregadas em App.tsx. Em Android, use sempre fontFamily (não fontWeight) com fontes próprias.
export const fontes = {
  regular: "PlusJakartaSans_400Regular",
  medio: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  negrito: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
  luta: "Oswald_700Bold",
  lutaSemi: "Oswald_600SemiBold",
};

export const espaco = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
