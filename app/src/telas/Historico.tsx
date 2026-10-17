import { RefreshControl, ScrollView, Text, View } from "react-native";

import { Aviso, Cabecalho, Cartao, Subtitulo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataSimples, NOME_METODO, num, pct } from "../formatar";
import { avaliar, Avaliacao, resumir } from "../historico";
import { cores, espaco } from "../tema";
import type { PrevisaoRegistrada } from "../tipos";

const ROTULO: Record<Avaliacao, [string, string]> = {
  acertou: ["✔ Acertou o vencedor", cores.sucesso],
  errou: ["✘ Errou o vencedor", cores.erro],
  sem_favorito: ["Sem favorito (50%)", cores.textoSuave],
  nao_avaliavel: ["Empate / sem resultado", cores.textoSuave],
  aguardando: ["Aguardando resultado", cores.aviso],
};

export function TelaHistorico() {
  const { dados, atualizando, atualizar } = useDados();
  const lista = Object.values(dados.registro).sort((x, y) => y.data_evento.localeCompare(x.data_evento));
  const r = resumir(lista);

  const porEvento = new Map<string, PrevisaoRegistrada[]>();
  for (const p of lista) {
    const chave = `${p.data_evento}|${p.evento}`;
    porEvento.set(chave, [...(porEvento.get(chave) ?? []), p]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Cabecalho titulo="Histórico de previsões" subtitulo="Previsões feitas antes de cada evento × resultado real" />
      <ScrollView
        contentContainerStyle={s.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.texto} />}
      >
        <Cartao>
          <Text style={s.titulo}>
            {r.avaliadas ? `${pct(r.acertos / r.avaliadas)} de acerto` : "Ainda sem resultados"}
          </Text>
          <TextoSuave estilo={{ marginTop: espaco.xs }}>
            {r.acertos} acertos em {r.avaliadas} lutas avaliadas · {r.aguardando} aguardando resultado
          </TextoSuave>
          {r.logLoss != null && (
            <TextoSuave>
              Log-loss {num(r.logLoss, 3)} · Brier {num(r.brier, 3)} (moeda 50/50: 0,693 · 0,250; menor é melhor)
            </TextoSuave>
          )}
        </Cartao>
        {r.avaliadas < 50 && (
          <Aviso tipo="info">
            Com poucas lutas avaliadas, a taxa de acerto varia muito por acaso. A avaliação mais confiável do modelo
            está na aba Modelo
            {dados.validacao ? ` (teste com ${dados.validacao.teste.modelo.n} lutas passadas)` : ""}.
          </Aviso>
        )}
        <Aviso tipo="info">
          Os resultados reais vêm do UFCStats e costumam aparecer 1 ou 2 dias depois de cada evento.
        </Aviso>

        {lista.length === 0 && <Aviso>Nenhuma previsão registrada ainda.</Aviso>}
        {[...porEvento.entries()].map(([chave, prevs]) => (
          <View key={chave} style={{ gap: espaco.s }}>
            <Subtitulo>
              {prevs[0].evento} · {dataSimples(prevs[0].data_evento)}
            </Subtitulo>
            {prevs.map((p) => {
              const av = avaliar(p);
              const pa = p.previsao.a.vitoria.prob;
              const fav = pa >= 0.5 ? p.lutador_a : p.lutador_b;
              const [rotulo, cor] = ROTULO[av];
              const res = p.resultado_real;
              const vencedor = res?.vencedor === "a" ? p.lutador_a : res?.vencedor === "b" ? p.lutador_b : null;
              return (
                <Cartao key={`${p.evento_id}-${p.lutador_a}`}>
                  <Text style={s.forte}>
                    {p.lutador_a} <Text style={{ color: cores.textoSuave }}>vs</Text> {p.lutador_b}
                  </Text>
                  <TextoSuave>
                    Favorito do modelo: {fav} ({pct(Math.max(pa, 1 - pa))})
                  </TextoSuave>
                  {vencedor && res && (
                    <TextoSuave>
                      Resultado: {vencedor} por {NOME_METODO[res.metodo]} (round {res.round})
                    </TextoSuave>
                  )}
                  <Text style={{ color: cor, fontWeight: "700", marginTop: espaco.xs }}>{rotulo}</Text>
                </Cartao>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
