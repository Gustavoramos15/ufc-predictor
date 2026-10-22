import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Aviso, CabecalhoTela, CartaoVidro, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataHora, dataSimples, num, pct } from "../formatar";
import { cores, espaco, fontes, gradientes, translucido } from "../tema";
import type { Metricas } from "../tipos";

const NOMES: Record<string, string> = {
  elo: "Elo (força pelos adversários)",
  experiencia: "Experiência no UFC",
  forma_recente: "Forma recente (últimas 5)",
  golpes_por_min: "Golpes sig. acertados/min",
  golpes_sofridos_por_min: "Golpes sig. sofridos/min",
  precisao_golpes: "Precisão de golpes",
  defesa_golpes: "Defesa de golpes",
  quedas_por_15min: "Quedas a cada 15 min",
  precisao_quedas: "Precisão de quedas",
  defesa_quedas: "Defesa de quedas",
  controle: "Tempo de controle",
  tentativas_finalizacao_por_15min: "Tentativas de finalização",
  knockdowns_por_15min: "Knockdowns",
  taxa_vitorias_antes_do_fim: "Vitórias antes do fim",
  taxa_derrotas_antes_do_fim: "Derrotas antes do fim",
  idade: "Idade",
  envergadura: "Envergadura",
  inatividade: "Inatividade",
};

const CORES_BARRA = [cores.vermelho, cores.ambar, cores.azul, cores.roxo, cores.ciano];

export function TelaModelo() {
  const { dados } = useDados();
  const v = dados.validacao;
  const m = dados.meta;
  const coef = Object.entries(v?.coeficientes ?? {}).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const somaAbs = coef.reduce((t, [, c]) => t + Math.abs(c), 0) || 1;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <CabecalhoTela rotulo="Metodologia" titulo="Modelo logístico" />
      <View style={{ paddingHorizontal: espaco.l, gap: espaco.m, paddingTop: espaco.s }}>
        <CartaoVidro>
          <TituloCartao cor={cores.azulClaro}>Como funciona o cálculo</TituloCartao>
          <Text style={st.paragrafo}>
            O <Text style={st.b}>{m.modelo.versao}</Text> combina o <Text style={st.b}>Elo</Text> de cada atleta (força
            ajustada pela qualidade dos adversários) com {coef.length || 18} variáveis do histórico no UFC, sempre usando
            só lutas anteriores. Atletas com pouco histórico são puxados para a média geral, para evitar conclusões a
            partir de amostras pequenas. O método de vitória mistura como o atleta costuma vencer com como o adversário
            costuma perder.
          </Text>
        </CartaoVidro>

        {coef.length > 0 && (
          <CartaoVidro>
            <TituloCartao>Pesos das variáveis no modelo atual</TituloCartao>
            <View style={{ gap: 10, marginTop: espaco.s }}>
              {coef.slice(0, 10).map(([nome, c], i) => {
                const peso = Math.abs(c) / somaAbs;
                const cor = CORES_BARRA[i % CORES_BARRA.length];
                return (
                  <View key={nome}>
                    <View style={[s.linha, { marginBottom: 4 }]}>
                      <Text style={st.itemPeso} numberOfLines={1}>
                        {NOMES[nome] ?? nome}
                      </Text>
                      <Text style={[st.valorPeso, { color: cor }]}>
                        {pct(peso, 0)} {c >= 0 ? "▲" : "▼"}
                      </Text>
                    </View>
                    <View style={st.trilho}>
                      <View style={{ width: `${Math.min(100, (Math.abs(c) / Math.abs(coef[0][1])) * 100)}%`, height: "100%", backgroundColor: cor }} />
                    </View>
                  </View>
                );
              })}
            </View>
            <TextoSuave estilo={{ fontSize: 11.5, marginTop: espaco.m }}>
              Peso = tamanho relativo do coeficiente (variáveis padronizadas). ▲ quem tem o valor maior é favorecido; ▼ quem
              tem o valor menor é favorecido. Variáveis parecidas dividem peso entre si, então a leitura é aproximada.
              {coef.length > 10 ? ` Mostrando as 10 maiores de ${coef.length}.` : ""}
            </TextoSuave>
          </CartaoVidro>
        )}

        <CartaoVidro gradiente={gradientes.valor} estilo={{ borderLeftWidth: 2, borderLeftColor: cores.verde }}>
          <TituloCartao cor={cores.verdeClaro}>Definição de aposta de valor (+EV)</TituloCartao>
          <Text style={st.paragrafo}>
            Quando a casa oferece uma odd acima da <Text style={st.b}>odd justa</Text> do modelo, a aposta teria valor
            esperado positivo <Text style={st.b}>se</Text> a probabilidade do modelo estiver correta. O app só marca +EV
            com folga de 5%, porque diferenças menores estão dentro do erro do modelo.
          </Text>
          <View style={st.formula}>
            <Text style={st.formulaTexto}>Valor (+EV) = (Probabilidade do modelo × Odd da casa) − 1 &gt; 0</Text>
          </View>
        </CartaoVidro>

        {v ? (
          <>
            <CartaoVidro estilo={{ padding: 0 }}>
              <View style={{ padding: 14, paddingBottom: 6 }}>
                <TituloCartao>Teste em lutas nunca vistas</TituloCartao>
                <TextoSuave estilo={{ fontSize: 12, marginTop: 4 }}>
                  Treino {v.periodos.treino} · ajuste {v.periodos.validacao} · teste {v.periodos.teste}. Critério:{" "}
                  {v.teste.criterio}.
                </TextoSuave>
              </View>
              <View style={[st.linhaTab, st.cab]}>
                <Text style={[st.c1, s.suave]}>Modelo</Text>
                <Text style={[st.c, s.suave]}>Acerto</Text>
                <Text style={[st.c, s.suave]}>Log-loss</Text>
              </View>
              <LinhaMetrica nome="Este modelo" m={v.teste.modelo} forte />
              <LinhaMetrica nome="Só Elo" m={v.teste.so_elo} />
              <LinhaMetrica nome="Moeda 50/50" m={v.teste.moeda_50_50} />
              <TextoSuave estilo={{ fontSize: 11.5, padding: 14, paddingTop: 6 }}>
                {v.teste.modelo.n} lutas. Log-loss mede a qualidade das probabilidades (menor é melhor).
              </TextoSuave>
            </CartaoVidro>

            <CartaoVidro estilo={{ padding: 0 }}>
              <View style={{ padding: 14, paddingBottom: 6 }}>
                <TituloCartao>Calibração</TituloCartao>
                <TextoSuave estilo={{ fontSize: 12, marginTop: 4 }}>
                  Quando o modelo diz X%, com que frequência aconteceu?
                </TextoSuave>
              </View>
              <View style={[st.linhaTab, st.cab]}>
                <Text style={[st.c1, s.suave]}>Faixa (lutas)</Text>
                <Text style={[st.c, s.suave]}>Previsto</Text>
                <Text style={[st.c, s.suave]}>Real</Text>
              </View>
              {v.teste.calibracao_todas_as_faixas.map((c) => (
                <View key={c.faixa} style={st.linhaTab}>
                  <Text style={[st.c1, s.texto, { fontSize: 13 }]}>
                    {c.faixa} <Text style={s.suave}>({c.n})</Text>
                  </Text>
                  <Text style={[st.c, s.texto, { fontSize: 13 }]}>{pct(c.prob_media_prevista)}</Text>
                  <Text style={[st.c, s.texto, { fontSize: 13 }]}>{pct(c.frequencia_real)}</Text>
                </View>
              ))}
              <TextoSuave estilo={{ fontSize: 11.5, padding: 14, paddingTop: 6 }}>
                Real acima do previsto nas faixas altas = modelo conservador; abaixo = confiante demais. Faixas com poucas
                lutas variam muito por acaso.
              </TextoSuave>
            </CartaoVidro>

            <CartaoVidro>
              <TituloCartao>Método de vitória</TituloCartao>
              <Text style={[st.paragrafo, { marginTop: 4 }]}>
                Log-loss {num(v.teste.metodo_dado_vencedor.log_loss_modelo, 3)} contra{" "}
                {num(v.teste.metodo_dado_vencedor.log_loss_media_da_divisao, 3)} usando só a média da categoria (
                {v.teste.metodo_dado_vencedor.n} lutas). Melhora pequena: prever o método é bem mais incerto que prever o
                vencedor.
              </Text>
            </CartaoVidro>
          </>
        ) : (
          <Aviso>Relatório de validação indisponível nestes dados.</Aviso>
        )}

        <CartaoVidro>
          <TituloCartao>Fontes de dados</TituloCartao>
          <View style={{ gap: 4, marginTop: 4 }}>
            <TextoSuave estilo={{ fontSize: 12 }}>Histórico: {m.historico.fonte}</TextoSuave>
            <TextoSuave estilo={{ fontSize: 12 }}>
              {m.historico.total_lutas} lutas · mais recente {dataSimples(m.historico.luta_mais_recente)} · fonte atualizada
              em {dataHora(m.historico.atualizacao_da_fonte)}
            </TextoSuave>
            <TextoSuave estilo={{ fontSize: 12 }}>
              Próximos eventos, odds e cartel completo: {m.proximos_eventos.fonte} · {dataHora(m.proximos_eventos.atualizado_em)}
            </TextoSuave>
            <TextoSuave estilo={{ fontSize: 12 }}>
              Modelo treinado com lutas até {dataSimples(m.modelo.treinado_ate)}.
            </TextoSuave>
          </View>
        </CartaoVidro>
        <Aviso tipo="info">
          Não é recomendação de aposta e nenhum resultado é garantido. Estreantes e atletas com menos de 2 lutas no UFC
          ficam sem previsão; lesões, corte de peso e mudança de categoria não aparecem nos dados.
        </Aviso>
      </View>
    </ScrollView>
  );
}

function TituloCartao({ children, cor = cores.textoMedio }: { children: string; cor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: cor }} />
      <Text style={[st.tituloCartao, { color: cor === cores.textoMedio ? cores.textoMedio : cor }]}>{children}</Text>
    </View>
  );
}

function LinhaMetrica({ nome, m, forte }: { nome: string; m: Metricas; forte?: boolean }) {
  const f = forte ? { fontFamily: fontes.negrito } : {};
  return (
    <View style={st.linhaTab}>
      <Text style={[st.c1, s.texto, { fontSize: 13 }, f]}>{nome}</Text>
      <Text style={[st.c, s.texto, { fontSize: 13 }, f]}>{pct(m.acuracia)}</Text>
      <Text style={[st.c, s.texto, { fontSize: 13 }, f]}>{num(m.log_loss, 3)}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  b: { fontFamily: fontes.negrito, color: cores.texto },
  paragrafo: { color: cores.textoMedio, fontFamily: fontes.regular, fontSize: 13, lineHeight: 20, marginTop: espaco.s },
  tituloCartao: { fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  itemPeso: { flex: 1, color: cores.textoMedio, fontFamily: fontes.regular, fontSize: 12.5 },
  valorPeso: { fontFamily: fontes.negrito, fontSize: 12 },
  trilho: { height: 6, backgroundColor: cores.cinzaEscuro, borderRadius: 999, overflow: "hidden" },
  formula: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#0B1511",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: translucido(cores.verde, 0.2),
  },
  formulaTexto: { color: "#6EE7B7", fontFamily: fontes.semi, fontSize: 12 },
  linhaTab: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8 },
  cab: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  c1: { flex: 1.5 },
  c: { flex: 1, textAlign: "right" },
});
