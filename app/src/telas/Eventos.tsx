import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Aviso, Cabecalho, Cartao, StatusDados, Subtitulo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataEvento } from "../formatar";
import type { Navegacao } from "../navegacao";
import { cores, espaco } from "../tema";

export function TelaEventos({ nav }: { nav: Navegacao }) {
  const { dados, atualizando, atualizar } = useDados();
  const eventos = [...dados.eventos.eventos].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <View style={{ flex: 1 }}>
      <Cabecalho titulo="UFC Predictor" subtitulo="Próximos eventos" />
      <ScrollView
        contentContainerStyle={s.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.texto} />}
      >
        <StatusDados />
        <Subtitulo>Eventos</Subtitulo>
        {eventos.length === 0 && <Aviso>Nenhum evento futuro encontrado nos dados disponíveis.</Aviso>}
        {eventos.map((ev) => {
          const comPrevisao = ev.lutas.filter((l) => l.previsao).length;
          const principal = ev.lutas.find((l) => l.numero === 1) ?? ev.lutas[0];
          return (
            <Pressable key={ev.id} onPress={() => nav.abrir({ tela: "evento", eventoId: ev.id })}>
              {({ pressed }) => (
                <Cartao estilo={pressed ? { backgroundColor: cores.cartaoAlt } : undefined}>
                  <Text style={[s.titulo, { fontSize: 17 }]}>{ev.nome}</Text>
                  <TextoSuave estilo={{ marginTop: 2 }}>{dataEvento(ev.data)}</TextoSuave>
                  {principal && (
                    <Text style={[s.texto, { marginTop: espaco.s }]}>
                      <Text style={{ color: cores.vermelho, fontWeight: "700" }}>{principal.lutador_a.nome}</Text>
                      <Text style={{ color: cores.textoSuave }}> vs </Text>
                      <Text style={{ color: cores.azul, fontWeight: "700" }}>{principal.lutador_b.nome}</Text>
                    </Text>
                  )}
                  <TextoSuave estilo={{ marginTop: espaco.s }}>
                    {ev.lutas.length} lutas · {comPrevisao} com previsão
                    {comPrevisao < ev.lutas.length ? ` · ${ev.lutas.length - comPrevisao} sem dados suficientes` : ""}
                  </TextoSuave>
                </Cartao>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
