import { Oswald_600SemiBold, Oswald_700Bold } from "@expo-google-fonts/oswald";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Icone, NomeIcone } from "./src/componentes";
import { ProvedorDados, useDados } from "./src/dados";
import type { Navegacao, Rota } from "./src/navegacao";
import { cores, fontes } from "./src/tema";
import { TelaConfronto } from "./src/telas/Confronto";
import { Aba, TelaEventos } from "./src/telas/Eventos";
import { TelaHistorico } from "./src/telas/Historico";
import { TelaModelo } from "./src/telas/Modelo";

type Guia = "eventos" | "luta" | "historico" | "modelo";
const GUIAS: { guia: Guia; rotulo: string; icone: NomeIcone }[] = [
  { guia: "eventos", rotulo: "Eventos", icone: "eventos" },
  { guia: "luta", rotulo: "Luta", icone: "raio" },
  { guia: "historico", rotulo: "Banca", icone: "grafico" },
  { guia: "modelo", rotulo: "Modelo", icone: "codigo" },
];

export default function App() {
  const [fontesProntas, erroFontes] = useFonts({
    Oswald_600SemiBold,
    Oswald_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <ProvedorDados>
        <SafeAreaView style={st.raiz} edges={["top", "bottom"]}>
          <StatusBar style="light" />
          {/* Se as fontes falharem, o app segue com a fonte padrão do sistema. */}
          {fontesProntas || erroFontes ? (
            <Conteudo />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={cores.vermelho} />
            </View>
          )}
        </SafeAreaView>
      </ProvedorDados>
    </SafeAreaProvider>
  );
}

function Conteudo() {
  const { dados } = useDados();
  const [pilha, setPilha] = useState<Rota[]>([{ tela: "eventos" }]);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("principal");
  const [ultimaLuta, setUltimaLuta] = useState<{ eventoId: string; lutaId: string } | null>(null);

  const nav: Navegacao = useMemo(
    () => ({
      abrir: (rota) => {
        if (rota.tela === "confronto") setUltimaLuta({ eventoId: rota.eventoId, lutaId: rota.lutaId });
        setPilha((p) => [...p, rota]);
      },
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

  /** Guia "Luta": a última luta aberta ou, se nenhuma, a luta principal do evento escolhido. */
  const abrirLuta = () => {
    let alvo = ultimaLuta;
    if (!alvo) {
      const eventos = [...dados.eventos.eventos].sort((a, b) => a.data.localeCompare(b.data));
      const ev = eventos.find((e) => e.id === eventoId) ?? eventos[0];
      const luta = ev ? ev.lutas.find((l) => l.numero === 1) ?? ev.lutas[0] : null;
      if (ev && luta) alvo = { eventoId: ev.id, lutaId: luta.id };
    }
    if (alvo) setPilha([{ tela: "eventos" }, { tela: "confronto", ...alvo }]);
  };

  const atual = pilha[pilha.length - 1];
  const guiaAtual: Guia = atual.tela === "confronto" ? "luta" : (pilha[0].tela as Guia);

  return (
    <>
      <View style={{ flex: 1 }}>
        {atual.tela === "eventos" && (
          <TelaEventos nav={nav} eventoId={eventoId} aoEscolherEvento={setEventoId} aba={aba} aoMudarAba={setAba} />
        )}
        {atual.tela === "confronto" && <TelaConfronto nav={nav} eventoId={atual.eventoId} lutaId={atual.lutaId} />}
        {atual.tela === "historico" && <TelaHistorico />}
        {atual.tela === "modelo" && <TelaModelo />}
      </View>
      <View style={st.abas}>
        {GUIAS.map(({ guia, rotulo, icone }) => {
          const ativa = guiaAtual === guia;
          const cor = ativa ? cores.vermelho : cores.textoSuave;
          return (
            <Pressable
              key={guia}
              style={st.aba}
              onPress={() => (guia === "luta" ? abrirLuta() : setPilha([{ tela: guia } as Rota]))}
            >
              <Icone nome={icone} cor={cor} tamanho={21} />
              <Text style={[st.abaTexto, { color: cor }]}>{rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const st = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  abas: {
    flexDirection: "row",
    height: 62,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,41,55,0.8)",
    backgroundColor: "rgba(16,19,27,0.97)",
    paddingHorizontal: 12,
  },
  aba: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  abaTexto: { fontFamily: fontes.negrito, fontSize: 12 },
});
