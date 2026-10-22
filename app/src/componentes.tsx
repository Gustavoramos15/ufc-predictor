import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HORAS_DADOS_ANTIGOS } from "./config";
import { useDados } from "./dados";
import { dataHora, horasDesde } from "./formatar";
import { cores, espaco, fontes, gradientes, translucido } from "./tema";

// ---------------------------------------------------------------- ícones (traços do protótipo)

const ICONES = {
  eventos:
    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  raio: "M13 10V3L4 14h7v7l9-11h-7z",
  grafico:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  codigo: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  voltar: "M15 19l-7-7 7-7",
  seta: "M9 5l7 7-7 7",
  atualizar: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
};

export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, cor = cores.textoSuave, tamanho = 20 }: { nome: NomeIcone; cor?: string; tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d={ICONES[nome]} stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------- texto

export function Texto({ children, estilo, linhas }: { children: ReactNode; estilo?: TextStyle | TextStyle[]; linhas?: number }) {
  return (
    <Text style={[s.texto, estilo as any]} numberOfLines={linhas}>
      {children}
    </Text>
  );
}

export function TextoSuave({ children, estilo }: { children: ReactNode; estilo?: any }) {
  return <Text style={[s.suave, estilo]}>{children}</Text>;
}

/** Rótulo pequeno em maiúsculas (ex.: "PRÓXIMO CARD"). */
export function Rotulo({ children, cor = cores.vermelho, estilo }: { children: ReactNode; cor?: string; estilo?: any }) {
  return <Text style={[s.rotulo, { color: cor }, estilo]}>{children}</Text>;
}

export function Subtitulo({ children, direita }: { children: ReactNode; direita?: ReactNode }) {
  return (
    <View style={[s.linha, { alignItems: "center", marginTop: espaco.m, marginBottom: 2 }]}>
      <Text style={s.subtitulo}>{children}</Text>
      {direita}
    </View>
  );
}

/** Mantido para telas antigas. */
export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={s.titulo}>{children}</Text>;
}

// ---------------------------------------------------------------- cartões

export function CartaoVidro({
  children,
  estilo,
  gradiente = gradientes.cartao,
  borda,
}: {
  children: ReactNode;
  estilo?: ViewStyle | ViewStyle[];
  gradiente?: readonly [string, string, ...string[]];
  borda?: string;
}) {
  return (
    <LinearGradient
      colors={gradiente as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.cartao, borda ? { borderColor: borda } : null, estilo as any]}
    >
      {children}
    </LinearGradient>
  );
}

/** Mantido para compatibilidade: cartão simples no novo visual. */
export function Cartao({ children, estilo }: { children: ReactNode; estilo?: ViewStyle | ViewStyle[] }) {
  return <CartaoVidro estilo={estilo}>{children}</CartaoVidro>;
}

export function Caixa({ children, estilo }: { children: ReactNode; estilo?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.caixa, estilo as any]}>{children}</View>;
}

// ---------------------------------------------------------------- avatar e selos

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] ?? "";
  return (primeira + ultima).toUpperCase();
}

export function Avatar({ nome, canto, tamanho = 64 }: { nome: string; canto?: "a" | "b"; tamanho?: number }) {
  const interno = (
    <View
      style={{
        width: tamanho - 4,
        height: tamanho - 4,
        borderRadius: tamanho,
        backgroundColor: canto ? "#1A1D27" : "#202533",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: cores.texto, fontFamily: canto ? fontes.luta : fontes.negrito, fontSize: tamanho * 0.28 }}>
        {iniciais(nome)}
      </Text>
    </View>
  );
  if (!canto) return <View style={{ width: tamanho, height: tamanho, alignItems: "center", justifyContent: "center" }}>{interno}</View>;
  return (
    <LinearGradient
      colors={(canto === "a" ? gradientes.vermelho : gradientes.azul) as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho, alignItems: "center", justifyContent: "center" }}
    >
      {interno}
    </LinearGradient>
  );
}

export function Selo({ texto, cor, ponto, solido }: { texto: string; cor: string; ponto?: boolean; solido?: boolean }) {
  return (
    <View
      style={[
        s.selo,
        solido
          ? { backgroundColor: cor, borderColor: cor }
          : { backgroundColor: translucido(cor, 0.15), borderColor: translucido(cor, 0.3) },
      ]}
    >
      {ponto && <View style={[s.pontoSelo, { backgroundColor: cor }]} />}
      <Text style={[s.seloTexto, { color: solido ? "#000" : cor }]}>{texto}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- barras

/** Barra dividida com gradiente: vermelho = lutador A, azul = lutador B. */
export function BarraProbabilidade({ pa, altura = 8 }: { pa: number; altura?: number }) {
  return (
    <View style={[s.barra, { height: altura }]}>
      <LinearGradient colors={gradientes.barraA as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: Math.max(pa, 0.001) }} />
      <LinearGradient colors={gradientes.barraB as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: Math.max(1 - pa, 0.001) }} />
    </View>
  );
}

/** Comparação de uma métrica: proporção de cada lado na soma dos dois. */
export function BarraMetrica({ rotulo, a, b, textoA, textoB }: { rotulo: string; a: number | null; b: number | null; textoA: string; textoB: string }) {
  const temAmbos = a != null && b != null && a + b > 0;
  const fa = temAmbos ? a! / (a! + b!) : 0.5;
  return (
    <View style={{ gap: 4 }}>
      <View style={[s.linha, { alignItems: "center" }]}>
        <Text style={[s.metricaValor, { color: cores.vermelhoClaro }]}>{textoA}</Text>
        <Text style={s.metricaRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
        <Text style={[s.metricaValor, { color: cores.azulClaro, textAlign: "right" }]}>{textoB}</Text>
      </View>
      <View style={[s.barra, { height: 8 }]}>
        {temAmbos ? (
          <>
            <View style={{ flex: Math.max(fa, 0.001), backgroundColor: cores.vermelho }} />
            <View style={{ flex: Math.max(1 - fa, 0.001), backgroundColor: cores.azul }} />
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: cores.cinzaEscuro }} />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- controles

export function Segmentado<T extends string>({
  opcoes,
  ativo,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string }[];
  ativo: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <View style={s.segmentado}>
      {opcoes.map((o) => {
        const sel = o.valor === ativo;
        return (
          <Pressable key={o.valor} onPress={() => aoMudar(o.valor)} style={[s.segmento, sel && s.segmentoAtivo]}>
            <Text style={[s.segmentoTexto, sel && { color: "#fff" }]} numberOfLines={1}>
              {o.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pilula({ texto, ativa, aoTocar }: { texto: string; ativa?: boolean; aoTocar: () => void }) {
  return (
    <Pressable onPress={aoTocar} style={[s.pilula, ativa && { backgroundColor: cores.destaque, borderColor: cores.destaque }]}>
      <Text style={[s.pilulaTexto, ativa && { color: "#fff" }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

export function BotaoPrincipal({ titulo, aoTocar }: { titulo: string; aoTocar: () => void }) {
  return (
    <Pressable onPress={aoTocar} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient colors={gradientes.botao as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.botaoPrincipal}>
        <Text style={s.botaoPrincipalTexto}>{titulo}</Text>
        <Icone nome="seta" cor="#fff" tamanho={14} />
      </LinearGradient>
    </Pressable>
  );
}

export function BotaoRedondo({ icone, aoTocar }: { icone: NomeIcone; aoTocar: () => void }) {
  return (
    <Pressable onPress={aoTocar} hitSlop={10} style={({ pressed }) => [s.botaoRedondo, pressed && { backgroundColor: "#202533" }]}>
      <Icone nome={icone} cor={cores.textoMedio} tamanho={16} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- avisos e cabeçalhos

type TipoAviso = "aviso" | "erro" | "info";

export function Aviso({ tipo = "aviso", children }: { tipo?: TipoAviso; children: ReactNode }) {
  const cor = { aviso: cores.ambarClaro, erro: cores.vermelhoClaro, info: cores.azulClaro }[tipo];
  return (
    <View style={[s.aviso, { backgroundColor: translucido(cor, 0.08), borderLeftColor: cor }]}>
      <Text style={[s.avisoTexto, { color: tipo === "info" ? cores.textoMedio : cor }]}>{children}</Text>
    </View>
  );
}

/** Cabeçalho de tela no estilo do protótipo: rótulo vermelho + título em Oswald. */
export function CabecalhoTela({ rotulo, titulo, direita }: { rotulo: string; titulo: string; direita?: ReactNode }) {
  return (
    <View style={s.cabecalhoTela}>
      <View style={{ flex: 1 }}>
        <Rotulo>{rotulo}</Rotulo>
        <Text style={s.tituloLuta} numberOfLines={2}>
          {titulo}
        </Text>
      </View>
      {direita}
    </View>
  );
}

/** Barra superior fixa com botão de voltar (telas internas). */
export function BarraVoltar({ titulo, voltar }: { titulo: string; voltar: () => void }) {
  return (
    <View style={s.barraVoltar}>
      <Pressable onPress={voltar} hitSlop={10} style={s.botaoVoltar}>
        <Icone nome="voltar" cor={cores.textoMedio} tamanho={16} />
      </Pressable>
      <Text style={s.barraVoltarTitulo}>{titulo}</Text>
      <View style={{ width: 28 }} />
    </View>
  );
}

/** Mostra quando os dados foram gerados, de onde vieram e se a atualização falhou. */
export function StatusDados() {
  const { dados, origem, baixadoEm, atualizando, erroAtualizacao, atualizar } = useDados();
  const [aberto, setAberto] = useState(false);
  const gerado = dados.meta.gerado_em;
  const horas = horasDesde(gerado);
  const antigo = horas != null && horas > HORAS_DADOS_ANTIGOS;
  const origemTexto = {
    embutido: "dados que vieram com o app",
    salvo: `cópia salva (baixada em ${dataHora(baixadoEm)})`,
    internet: "baixados agora da internet",
  }[origem];
  const avisos = dados.meta.avisos ?? [];
  const corPonto = erroAtualizacao || antigo ? cores.ambar : cores.verdeClaro;
  return (
    <View style={{ gap: espaco.s }}>
      <View style={s.status}>
        <View style={[s.pontoStatus, { backgroundColor: corPonto }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.statusTitulo}>Dados de {dataHora(gerado)}</Text>
          <TextoSuave estilo={{ fontSize: 12 }}>{origemTexto}</TextoSuave>
        </View>
        {atualizando ? <ActivityIndicator color={cores.texto} /> : <BotaoRedondo icone="atualizar" aoTocar={atualizar} />}
      </View>
      {erroAtualizacao && (
        <Aviso tipo={origem === "embutido" ? "erro" : "aviso"}>{erroAtualizacao} Exibindo os últimos dados disponíveis.</Aviso>
      )}
      {antigo && <Aviso>Estes dados têm mais de {Math.floor(horas! / 24)} dia(s). Cards podem ter mudado.</Aviso>}
      {!dados.meta.proximos_eventos.atualizado_com_sucesso && (
        <Aviso>A última busca de próximos eventos falhou; os cards podem estar desatualizados.</Aviso>
      )}
      {avisos.length > 0 && (
        <Pressable onPress={() => setAberto(!aberto)}>
          <Aviso tipo="info">
            {aberto ? "▾" : "▸"} {avisos.length} observação(ões) sobre os dados {aberto ? "" : "(toque para ver)"}
            {aberto && "\n\n• " + avisos.join("\n• ")}
          </Aviso>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- estilos

export const s = StyleSheet.create({
  texto: { color: cores.texto, fontFamily: fontes.regular, fontSize: 14 },
  forte: { color: cores.texto, fontFamily: fontes.negrito, fontSize: 14 },
  suave: { color: cores.textoSuave, fontFamily: fontes.regular, fontSize: 13 },
  rotulo: { fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  titulo: { color: cores.texto, fontFamily: fontes.negrito, fontSize: 18 },
  tituloLuta: { color: cores.texto, fontFamily: fontes.luta, fontSize: 21, letterSpacing: 0.6, textTransform: "uppercase" },
  numeroLuta: { color: cores.texto, fontFamily: fontes.luta, fontSize: 20 },
  subtitulo: {
    color: cores.textoMedio,
    fontFamily: fontes.negrito,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  linha: { flexDirection: "row", justifyContent: "space-between", gap: espaco.s },
  cartao: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: cores.borda, overflow: "hidden" },
  caixa: { backgroundColor: cores.painelAlt, borderRadius: 12, borderWidth: 1, borderColor: cores.cinzaEscuro, padding: 10 },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  pontoSelo: { width: 5, height: 5, borderRadius: 5 },
  seloTexto: { fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.3 },
  barra: { flexDirection: "row", borderRadius: 999, overflow: "hidden", backgroundColor: cores.cinzaEscuro },
  metricaValor: { fontFamily: fontes.negrito, fontSize: 12, minWidth: 64 },
  metricaRotulo: { flex: 1, textAlign: "center", color: cores.textoMedio, fontFamily: fontes.medio, fontSize: 12 },
  segmentado: {
    flexDirection: "row",
    backgroundColor: cores.painelAlt,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.cinzaEscuro,
  },
  segmento: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: "center" },
  segmentoAtivo: { backgroundColor: cores.destaque },
  segmentoTexto: { color: cores.textoSuave, fontFamily: fontes.semi, fontSize: 12 },
  pilula: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#161922",
    borderWidth: 1,
    borderColor: cores.cinzaEscuro,
  },
  pilulaTexto: { color: cores.textoSuave, fontFamily: fontes.semi, fontSize: 12 },
  botaoPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  botaoPrincipalTexto: { color: "#fff", fontFamily: fontes.negrito, fontSize: 13 },
  botaoRedondo: {
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: "#181C26",
    borderWidth: 1,
    borderColor: cores.cinzaEscuro,
    alignItems: "center",
    justifyContent: "center",
  },
  aviso: { borderLeftWidth: 3, borderRadius: 10, padding: 10 },
  avisoTexto: { fontFamily: fontes.regular, fontSize: 12.5, lineHeight: 18 },
  cabecalhoTela: { flexDirection: "row", alignItems: "center", gap: espaco.m, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  barraVoltar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaco.l,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31,41,55,0.6)",
    backgroundColor: cores.fundo,
  },
  botaoVoltar: { padding: 6, borderRadius: 8, backgroundColor: "rgba(31,41,55,0.8)" },
  barraVoltarTitulo: { color: cores.textoMedio, fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(22,25,34,0.75)",
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pontoStatus: { width: 8, height: 8, borderRadius: 8 },
  statusTitulo: { color: cores.textoMedio, fontFamily: fontes.semi, fontSize: 13 },
  conteudo: { padding: espaco.l, gap: espaco.m, paddingBottom: 40 },
});

