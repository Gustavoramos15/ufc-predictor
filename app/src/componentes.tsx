import { ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { HORAS_DADOS_ANTIGOS } from "./config";
import { useDados } from "./dados";
import { dataHora, horasDesde, pct } from "./formatar";
import { cores, espaco } from "./tema";

export function Cartao({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[s.cartao, estilo]}>{children}</View>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={s.titulo}>{children}</Text>;
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <Text style={s.subtitulo}>{children}</Text>;
}

export function TextoSuave({ children, estilo }: { children: ReactNode; estilo?: any }) {
  return <Text style={[s.suave, estilo]}>{children}</Text>;
}

type TipoAviso = "aviso" | "erro" | "info";

export function Aviso({ tipo = "aviso", children }: { tipo?: TipoAviso; children: ReactNode }) {
  const cor = { aviso: cores.aviso, erro: cores.erro, info: cores.info }[tipo];
  const fundo = { aviso: cores.avisoFundo, erro: cores.erroFundo, info: cores.infoFundo }[tipo];
  return (
    <View style={[s.aviso, { backgroundColor: fundo, borderLeftColor: cor }]}>
      <Text style={[s.avisoTexto, { color: cor }]}>{children}</Text>
    </View>
  );
}

/** Barra dividida: parte vermelha = lutador A, azul = lutador B. */
export function BarraProbabilidade({ pa, alta = false }: { pa: number; alta?: boolean }) {
  const altura = alta ? 28 : 8;
  return (
    <View>
      <View style={[s.barra, { height: altura }]}>
        <View style={{ flex: Math.max(pa, 0.001), backgroundColor: cores.vermelho, justifyContent: "center" }}>
          {alta && <Text style={[s.barraTexto, { textAlign: "left" }]}>{pct(pa)}</Text>}
        </View>
        <View style={{ flex: Math.max(1 - pa, 0.001), backgroundColor: cores.azul, justifyContent: "center" }}>
          {alta && <Text style={[s.barraTexto, { textAlign: "right" }]}>{pct(1 - pa)}</Text>}
        </View>
      </View>
      {!alta && (
        <View style={s.linha}>
          <Text style={[s.barraLegenda, { color: cores.vermelho }]}>{pct(pa, 0)}</Text>
          <Text style={[s.barraLegenda, { color: cores.azul }]}>{pct(1 - pa, 0)}</Text>
        </View>
      )}
    </View>
  );
}

export function Botao({ titulo, onPress, desativado }: { titulo: string; onPress: () => void; desativado?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desativado}
      style={({ pressed }) => [s.botao, (pressed || desativado) && { opacity: 0.6 }]}
    >
      <Text style={s.botaoTexto}>{titulo}</Text>
    </Pressable>
  );
}

/** Mostra de onde vieram os dados, quando foram gerados e se a última tentativa de atualizar falhou. */
export function StatusDados() {
  const { dados, origem, baixadoEm, atualizando, erroAtualizacao, atualizar } = useDados();
  const [aberto, setAberto] = useState(false);
  const gerado = dados.meta.gerado_em;
  const horas = horasDesde(gerado);
  const antigo = horas != null && horas > HORAS_DADOS_ANTIGOS;
  const origemTexto = {
    embutido: "dados que vieram junto com o app",
    salvo: `cópia salva no celular (baixada em ${dataHora(baixadoEm)})`,
    internet: "baixados agora da internet",
  }[origem];
  const avisos = dados.meta.avisos ?? [];
  return (
    <View style={{ gap: espaco.s }}>
      <Cartao>
        <View style={[s.linha, { alignItems: "center" }]}>
          <View style={{ flex: 1 }}>
            <TextoSuave>Dados gerados em</TextoSuave>
            <Text style={s.forte}>{dataHora(gerado)}</Text>
            <TextoSuave>Fonte: {origemTexto}</TextoSuave>
          </View>
          {atualizando ? (
            <ActivityIndicator color={cores.texto} />
          ) : (
            <Botao titulo="Atualizar" onPress={atualizar} />
          )}
        </View>
      </Cartao>
      {erroAtualizacao && (
        <Aviso tipo={origem === "embutido" ? "erro" : "aviso"}>
          {erroAtualizacao} Exibindo os últimos dados disponíveis.
        </Aviso>
      )}
      {antigo && (
        <Aviso>Estes dados têm mais de {Math.floor(horas! / 24)} dia(s). Cards e escalações podem ter mudado.</Aviso>
      )}
      {!dados.meta.proximos_eventos.atualizado_com_sucesso && (
        <Aviso>A última busca de próximos eventos falhou; os cards exibidos podem estar desatualizados.</Aviso>
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

export function Cabecalho({ titulo, subtitulo, voltar }: { titulo: string; subtitulo?: string; voltar?: () => void }) {
  return (
    <View style={s.cabecalho}>
      {voltar && (
        <Pressable onPress={voltar} hitSlop={12} style={s.voltar}>
          <Text style={s.voltarTexto}>‹</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.cabecalhoTitulo} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo && <TextoSuave>{subtitulo}</TextoSuave>}
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: espaco.l,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  titulo: { color: cores.texto, fontSize: 18, fontWeight: "700" },
  subtitulo: {
    color: cores.textoSuave,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: espaco.l,
    marginBottom: espaco.s,
  },
  suave: { color: cores.textoSuave, fontSize: 13 },
  forte: { color: cores.texto, fontSize: 15, fontWeight: "600" },
  texto: { color: cores.texto, fontSize: 15 },
  linha: { flexDirection: "row", justifyContent: "space-between", gap: espaco.s },
  aviso: { borderLeftWidth: 4, borderRadius: 8, padding: espaco.m },
  avisoTexto: { fontSize: 13, lineHeight: 19 },
  barra: { flexDirection: "row", borderRadius: 6, overflow: "hidden", backgroundColor: cores.cartaoAlt },
  barraTexto: { color: "#fff", fontWeight: "700", fontSize: 13, paddingHorizontal: espaco.s },
  barraLegenda: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  botao: { backgroundColor: cores.destaque, paddingHorizontal: espaco.l, paddingVertical: espaco.s, borderRadius: 10 },
  botaoTexto: { color: "#fff", fontWeight: "700" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.m,
    paddingHorizontal: espaco.l,
    paddingVertical: espaco.m,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  cabecalhoTitulo: { color: cores.texto, fontSize: 20, fontWeight: "800" },
  voltar: { paddingRight: espaco.s },
  voltarTexto: { color: cores.texto, fontSize: 34, lineHeight: 34, fontWeight: "300" },
  conteudo: { padding: espaco.l, gap: espaco.m, paddingBottom: 40 },
});
