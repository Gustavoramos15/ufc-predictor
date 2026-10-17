import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Aviso, Cabecalho, Cartao, Subtitulo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataHora, dataSimples, num, pct } from "../formatar";
import { cores, espaco } from "../tema";
import type { Metricas } from "../tipos";

export function TelaModelo() {
  const { dados } = useDados();
  const v = dados.validacao;
  const m = dados.meta;

  return (
    <View style={{ flex: 1 }}>
      <Cabecalho titulo="Sobre o modelo" subtitulo="Como as previsões são feitas e quão boas elas foram" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <Aviso tipo="info">
          Este app estima probabilidades a partir de estatísticas. Não é recomendação de aposta, não usa odds de casas
          de apostas e nenhum resultado é garantido. Acertar o favorito não significa lucro.
        </Aviso>

        <Subtitulo>Como funciona</Subtitulo>
        <Cartao>
          <Text style={[s.texto, { lineHeight: 22 }]}>
            1. <Text style={st.b}>Elo</Text>: cada atleta tem uma nota de força que sobe ao vencer e cai ao perder,
            pesando a força do adversário.{"\n"}
            2. <Text style={st.b}>Regressão logística</Text>: combina a diferença de Elo com experiência, forma
            recente, golpes, defesa, quedas, controle, idade, envergadura e inatividade, sempre usando só lutas
            anteriores.{"\n"}
            3. <Text style={st.b}>Método</Text>: mistura como o atleta costuma vencer com como o adversário costuma
            perder. KO/TKO + finalização + decisão = probabilidade de vitória.{"\n"}
            4. <Text style={st.b}>Odd justa</Text> = 1 ÷ probabilidade.
          </Text>
        </Cartao>

        {v ? (
          <>
            <Subtitulo>Teste em lutas que o modelo nunca viu</Subtitulo>
            <TextoSuave>
              Treino: {v.periodos.treino} · Ajuste: {v.periodos.validacao} · Teste: {v.periodos.teste}. Critério:{" "}
              {v.teste.criterio}.
            </TextoSuave>
            <Cartao estilo={{ padding: 0 }}>
              <View style={[st.linha, st.cab]}>
                <Text style={[st.c1, s.suave]}>Modelo</Text>
                <Text style={[st.c, s.suave]}>Acerto</Text>
                <Text style={[st.c, s.suave]}>Log-loss</Text>
              </View>
              <LinhaMetrica nome="Este modelo" m={v.teste.modelo} forte />
              <LinhaMetrica nome="Só Elo" m={v.teste.so_elo} />
              <LinhaMetrica nome="Moeda 50/50" m={v.teste.moeda_50_50} />
              <View style={{ padding: espaco.m }}>
                <TextoSuave>
                  {v.teste.modelo.n} lutas. Log-loss mede a qualidade das probabilidades (menor é melhor).
                </TextoSuave>
              </View>
            </Cartao>

            <Subtitulo>Calibração</Subtitulo>
            <TextoSuave>Quando o modelo diz X%, com que frequência isso aconteceu?</TextoSuave>
            <Cartao estilo={{ padding: 0 }}>
              <View style={[st.linha, st.cab]}>
                <Text style={[st.c1, s.suave]}>Faixa</Text>
                <Text style={[st.c, s.suave]}>Previsto</Text>
                <Text style={[st.c, s.suave]}>Real</Text>
              </View>
              {v.teste.calibracao_todas_as_faixas.map((c) => (
                <View key={c.faixa} style={st.linha}>
                  <Text style={[st.c1, s.texto]}>
                    {c.faixa} <Text style={s.suave}>({c.n})</Text>
                  </Text>
                  <Text style={[st.c, s.texto]}>{pct(c.prob_media_prevista)}</Text>
                  <Text style={[st.c, s.texto]}>{pct(c.frequencia_real)}</Text>
                </View>
              ))}
            </Cartao>
            <TextoSuave>
              Se "Real" fica acima de "Previsto" nas faixas altas, o modelo está sendo conservador; se fica abaixo, está
              confiante demais. Faixas com poucas lutas (número entre parênteses) variam muito por acaso.
            </TextoSuave>

            <Subtitulo>Método de vitória</Subtitulo>
            <Cartao>
              <TextoSuave>
                Log-loss do método (dado o vencedor): {num(v.teste.metodo_dado_vencedor.log_loss_modelo, 3)} contra{" "}
                {num(v.teste.metodo_dado_vencedor.log_loss_media_da_divisao, 3)} usando só a média da categoria (
                {v.teste.metodo_dado_vencedor.n} lutas). Melhora pequena: prever o método é bem mais incerto que prever
                o vencedor.
              </TextoSuave>
            </Cartao>
          </>
        ) : (
          <Aviso>Relatório de validação indisponível nestes dados.</Aviso>
        )}

        <Subtitulo>Dados</Subtitulo>
        <Cartao>
          <TextoSuave>Histórico: {m.historico.fonte}</TextoSuave>
          <TextoSuave>
            {m.historico.total_lutas} lutas · luta mais recente {dataSimples(m.historico.luta_mais_recente)} · fonte
            atualizada em {dataHora(m.historico.atualizacao_da_fonte)}
          </TextoSuave>
          <TextoSuave estilo={{ marginTop: espaco.s }}>Próximos eventos: {m.proximos_eventos.fonte}</TextoSuave>
          <TextoSuave>Buscados em {dataHora(m.proximos_eventos.atualizado_em)}</TextoSuave>
          <TextoSuave estilo={{ marginTop: espaco.s }}>
            Modelo {m.modelo.versao}, treinado com lutas até {dataSimples(m.modelo.treinado_ate)}.
          </TextoSuave>
        </Cartao>
        <TextoSuave>
          Limitações: estreantes e atletas com menos de 2 lutas no UFC ficam sem previsão; homônimos no UFCStats não
          podem ser separados; lesões, cortes de peso e mudanças de categoria não aparecem nos dados.
        </TextoSuave>
      </ScrollView>
    </View>
  );
}

function LinhaMetrica({ nome, m, forte }: { nome: string; m: Metricas; forte?: boolean }) {
  const estilo = [s.texto, forte && { fontWeight: "700" as const }];
  return (
    <View style={st.linha}>
      <Text style={[st.c1, ...estilo]}>{nome}</Text>
      <Text style={[st.c, ...estilo]}>{pct(m.acuracia)}</Text>
      <Text style={[st.c, ...estilo]}>{num(m.log_loss, 3)}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  b: { fontWeight: "700" },
  linha: { flexDirection: "row", paddingHorizontal: espaco.m, paddingVertical: 9 },
  cab: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  c1: { flex: 1.5 },
  c: { flex: 1, textAlign: "right" },
});
