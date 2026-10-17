import { Pressable, ScrollView, Text, View } from "react-native";

import { Aviso, BarraProbabilidade, Cabecalho, Cartao, Subtitulo, TextoSuave, s } from "../componentes";
import { combinacoes, confianca, resultadoMaisProvavel } from "../combinacoes";
import { useDados } from "../dados";
import { categoria, dataEvento, NOME_SEGMENTO, odd, pct, primeiraMinuscula, sobrenome } from "../formatar";
import type { Navegacao } from "../navegacao";
import { cores, espaco } from "../tema";
import type { Previsao, Segmento } from "../tipos";

const COR_CONFIANCA = [cores.textoSuave, cores.info, cores.sucesso];

function ResumoPrevisao({ p, a, b }: { p: Previsao; a: string; b: string }) {
  const mp = resultadoMaisProvavel(p, a, b);
  const fav = p.a.vitoria.prob >= 0.5 ? { nome: a, lado: p.a } : { nome: b, lado: p.b };
  const combo = combinacoes(fav.lado)[0];
  const conf = confianca(p.a.vitoria.prob);
  return (
    <View style={{ marginTop: espaco.s, gap: 2 }}>
      <Text style={{ color: COR_CONFIANCA[conf.nivel], fontSize: 12, fontWeight: "700" }}>
        {conf.texto.toUpperCase()}
      </Text>
      <TextoSuave>
        Mais provável: {sobrenome(mp.nome)} por {mp.metodo} ({pct(mp.prob)})
      </TextoSuave>
      <TextoSuave>
        Combinação do favorito: {sobrenome(fav.nome)} por {primeiraMinuscula(combo.rotulo)} ({pct(combo.prob)} · odd{" "}
        {odd(combo.odd)})
      </TextoSuave>
    </View>
  );
}

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
                        <>
                          <BarraProbabilidade pa={l.previsao.a.vitoria.prob} />
                          <ResumoPrevisao p={l.previsao} a={l.lutador_a.nome} b={l.lutador_b.nome} />
                        </>
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
