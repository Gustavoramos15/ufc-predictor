import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ProvedorDados } from "./src/dados";
import type { Navegacao, Rota } from "./src/navegacao";
import { cores } from "./src/tema";
import { TelaConfronto } from "./src/telas/Confronto";
import { TelaEvento } from "./src/telas/Evento";
import { TelaEventos } from "./src/telas/Eventos";
import { TelaHistorico } from "./src/telas/Historico";
import { TelaModelo } from "./src/telas/Modelo";

type Aba = "eventos" | "historico" | "modelo";
const ABAS: { aba: Aba; rotulo: string }[] = [
  { aba: "eventos", rotulo: "Eventos" },
  { aba: "historico", rotulo: "Histórico" },
  { aba: "modelo", rotulo: "Modelo" },
];

export default function App() {
  const [pilha, setPilha] = useState<Rota[]>([{ tela: "eventos" }]);

  const nav: Navegacao = useMemo(
    () => ({
      abrir: (rota) => setPilha((p) => [...p, rota]),
      voltar: () => setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p)),
    }),
    [],
  );

  // Botão "voltar" do Android: volta uma tela; na tela inicial, deixa o Android fechar o app.
  const aoVoltar = useCallback(() => {
    if (pilha.length > 1) {
      nav.voltar();
      return true;
    }
    if (pilha[0].tela !== "eventos") {
      setPilha([{ tela: "eventos" }]);
      return true;
    }
    return false;
  }, [pilha, nav]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", aoVoltar);
    return () => sub.remove();
  }, [aoVoltar]);

  const atual = pilha[pilha.length - 1];
  const abaAtual = pilha[0].tela as Aba;

  return (
    <SafeAreaProvider>
      <ProvedorDados>
        <SafeAreaView style={st.raiz} edges={["top", "bottom"]}>
          <StatusBar style="light" />
          <View style={{ flex: 1 }}>
            {atual.tela === "eventos" && <TelaEventos nav={nav} />}
            {atual.tela === "evento" && <TelaEvento nav={nav} eventoId={atual.eventoId} />}
            {atual.tela === "confronto" && (
              <TelaConfronto nav={nav} eventoId={atual.eventoId} lutaId={atual.lutaId} />
            )}
            {atual.tela === "historico" && <TelaHistorico />}
            {atual.tela === "modelo" && <TelaModelo />}
          </View>
          <View style={st.abas}>
            {ABAS.map(({ aba, rotulo }) => {
              const ativa = abaAtual === aba;
              return (
                <Pressable key={aba} style={st.aba} onPress={() => setPilha([{ tela: aba }])}>
                  <View style={[st.marcador, ativa && { backgroundColor: cores.destaque }]} />
                  <Text style={[st.abaTexto, ativa && { color: cores.texto, fontWeight: "700" }]}>{rotulo}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </ProvedorDados>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  abas: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.cartao,
  },
  aba: { flex: 1, alignItems: "center", paddingTop: 0, paddingBottom: 12 },
  marcador: { height: 3, width: 36, borderRadius: 2, marginBottom: 9, backgroundColor: "transparent" },
  abaTexto: { color: cores.textoSuave, fontSize: 14 },
});
