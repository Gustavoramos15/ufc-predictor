import { Pressable, ScrollView, Text, View } from "react-native";

import { Aviso, BarraProbabilidade, Cabecalho, Cartao, Subtitulo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { categoria, dataEvento, NOME_SEGMENTO } from "../formatar";
import type { Navegacao } from "../navegacao";
import { cores, espaco } from "../tema";
import type { Segmento } from "../tipos";

const ORDEM: Segmento[] = ["principal", "preliminar", "preliminar_antecipada", "desconhecido"];

export function TelaEvento({ nav, eventoId }: { nav: Navegacao; eventoId: string }) {
  const { dados } = useDados();
  const ev = dados.eventos.eventos.find((e) => e.id === eventoId);
  if (!ev) {
    return (
      <View style={{ flex: 1 }}>
        <Cabecalho titulo="Evento" voltar={nav.voltar} />
        <View style={s.conteudo}>
          <Aviso>Este evento não está mais nos dados atuais.</Aviso>
        </View>
      </View>
    );
  }
  const lutas = [...ev.lutas].sort((a, b) => a.numero - b.numero);

  return (
    <View style={{ flex: 1 }}>
      <Cabecalho titulo={ev.nome} subtitulo={dataEvento(ev.data)} voltar={nav.voltar} />
      <ScrollView contentContainerStyle={s.conteudo}>
        {ORDEM.map((seg) => {
          const doSegmento = lutas.filter((l) => l.segmento === seg);
          if (!doSegmento.length) return null;
          return (
            <View key={seg} style={{ gap: espaco.m }}>
              <Subtitulo>{NOME_SEGMENTO[seg]}</Subtitulo>
              {doSegmento.map((l) => (
                <Pressable key={l.id} onPress={() => nav.abrir({ tela: "confronto", eventoId: ev.id, lutaId: l.id })}>
                  {({ pressed }) => (
                    <Cartao estilo={pressed ? { backgroundColor: cores.cartaoAlt } : undefined}>
                      <TextoSuave>
                        {l.numero === 1 ? "Luta principal · " : ""}
                        {categoria(l.categoria)}
                      </TextoSuave>
                      <View style={[s.linha, { marginTop: espaco.xs, marginBottom: espaco.s }]}>
                        <Text style={[s.forte, { color: cores.vermelho, flex: 1 }]}>{l.lutador_a.nome}</Text>
                        <Text style={[s.forte, { color: cores.azul, flex: 1, textAlign: "right" }]}>
                          {l.lutador_b.nome}
                        </Text>
                      </View>
                      {l.previsao ? (
                        <BarraProbabilidade pa={l.previsao.a.vitoria.prob} />
                      ) : (
                        <Text style={{ color: cores.aviso, fontSize: 13 }}>Sem previsão: dados insuficientes</Text>
                      )}
                    </Cartao>
                  )}
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
