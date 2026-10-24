import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Aviso, CabecalhoTela, CartaoVidro, Pilula, Segmentado, Selo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataEvento, odd, pct } from "../formatar";
import { lutasComPrevisao, montarMultipla, Tamanho, TipoPalpite } from "../multipla";
import type { Navegacao } from "../navegacao";
import { LIMITE_VALOR } from "../odds";
import { cores, espaco, fontes, gradientes, translucido } from "../tema";

const TAMANHOS: { valor: Tamanho; rotulo: string; n?: number }[] = [
  { valor: 2, rotulo: "Dupla", n: 2 },
  { valor: 3, rotulo: "Tripla", n: 3 },
  { valor: 4, rotulo: "Quádrupla", n: 4 },
  { valor: "card", rotulo: "Card todo" },
];

export interface EstadoMultipla {
  tipo: TipoPalpite;
  tamanho: Tamanho;
}

export function TelaMultipla({
  nav,
  eventoId,
  aoEscolherEvento,
  estado,
  aoMudar,
}: {
  nav: Navegacao;
  eventoId: string | null;
  aoEscolherEvento: (id: string) => void;
  estado: EstadoMultipla;
  aoMudar: (e: EstadoMultipla) => void;
}) {
  const { dados } = useDados();
  const eventos = [...dados.eventos.eventos].sort((a, b) => a.data.localeCompare(b.data));
  const ev = eventos.find((e) => e.id === eventoId) ?? eventos[0];

  if (!ev) {
    return (
      <View style={{ flex: 1 }}>
        <CabecalhoTela rotulo="Montador" titulo="Múltipla" />
        <View style={s.conteudo}>
          <Aviso>Nenhum evento futuro nos dados disponíveis.</Aviso>
        </View>
      </View>
    );
  }

  const disponiveis = lutasComPrevisao(ev);
  const m = montarMultipla(ev, estado.tipo, estado.tamanho);
  const ehValor = m?.valorEstimado != null && m.valorEstimado > LIMITE_VALOR;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <CabecalhoTela rotulo="Montador do modelo" titulo="Múltipla" />

      {eventos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {eventos.map((e) => (
            <Pilula key={e.id} texto={nomeCurto(e.nome, e.data)} ativa={e.id === ev.id} aoTocar={() => aoEscolherEvento(e.id)} />
          ))}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: espaco.l, gap: espaco.m }}>
        <TextoSuave estilo={{ fontSize: 12 }}>
          {ev.nome} · {dataEvento(ev.data)} · {disponiveis} luta(s) com previsão
        </TextoSuave>

        <Segmentado
          opcoes={[
            { valor: "vitoria", rotulo: "Só vitória" },
            { valor: "metodo", rotulo: "Método de vitória" },
          ]}
          ativo={estado.tipo}
          aoMudar={(tipo) => aoMudar({ ...estado, tipo })}
        />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {TAMANHOS.map((t) => {
            const possivel = t.n ? disponiveis >= t.n : disponiveis >= 2;
            const rotulo = t.valor === "card" ? `${t.rotulo} (${disponiveis})` : t.rotulo;
            return (
              <View key={String(t.valor)} style={!possivel ? { opacity: 0.35 } : undefined}>
                <Pilula
                  texto={rotulo}
                  ativa={estado.tamanho === t.valor}
                  aoTocar={() => possivel && aoMudar({ ...estado, tamanho: t.valor })}
                />
              </View>
            );
          })}
        </View>

        {!m ? (
          <Aviso>
            Este evento tem só {disponiveis} luta(s) com previsão, poucas para esta múltipla. Escolha um tamanho menor
            ou outro evento.
          </Aviso>
        ) : (
          <>
            <CartaoVidro gradiente={gradientes.heroi} borda={translucido(cores.vermelho, 0.25)}>
              <View style={[s.linha, { alignItems: "center" }]}>
                <Text style={st.tituloBloco}>
                  {TAMANHOS.find((t) => t.valor === estado.tamanho)?.rotulo} · {estado.tipo === "vitoria" ? "vitória" : "método"}
                </Text>
                {ehValor && <Selo texto="+EV" cor={cores.verdeClaro} ponto />}
              </View>

              <View style={[s.linha, { marginTop: espaco.m }]}>
                <Numero rotulo="Probabilidade" valor={probMultipla(m.prob)} cor={cores.texto} />
                <Numero rotulo="Odd justa" valor={oddMultipla(m.oddJusta)} cor={cores.verdeClaro} />
                <Numero
                  rotulo="Odd da casa"
                  valor={oddMultipla(m.oddCasa)}
                  cor={m.oddCasa != null ? cores.texto : cores.textoApagado}
                />
              </View>

              <View style={st.rodape}>
                {m.oddCasa != null ? (
                  <Text style={[st.leitura, { color: ehValor ? cores.verdeClaro : m.valorEstimado! < -LIMITE_VALOR ? cores.vermelhoClaro : cores.textoSuave }]}>
                    {ehValor ? "Odd da casa acima da justa" : m.valorEstimado! < -LIMITE_VALOR ? "Odd da casa abaixo da justa" : "Odd da casa próxima da justa"} (
                    {m.valorEstimado! >= 0 ? "+" : ""}
                    {pct(m.valorEstimado!)} de valor estimado)
                    {m.pernas.length >= 3 && (
                      <Text style={{ color: cores.textoSuave, fontFamily: fontes.regular, fontSize: 12 }}>
                        {"\n"}Com {m.pernas.length} seleções, o erro do modelo em cada luta se multiplica: este valor é bem
                        menos confiável do que o de uma luta isolada.
                      </Text>
                    )}
                  </Text>
                ) : (
                  <TextoSuave estilo={{ fontSize: 12 }}>
                    {estado.tipo === "metodo"
                      ? "A ESPN não traz odds de método; compare a odd justa com a da sua casa."
                      : `${m.pernasSemOdd} luta(s) ainda sem odds da casa; compare a odd justa com a da sua casa.`}
                  </TextoSuave>
                )}
              </View>
            </CartaoVidro>

            <Text style={st.secao}>Seleções ({m.pernas.length})</Text>
            {m.pernas.map((p, i) => (
              <Pressable key={p.lutaId} onPress={() => nav.abrir({ tela: "confronto", eventoId: ev.id, lutaId: p.lutaId })}>
                {({ pressed }) => (
                  <CartaoVidro estilo={[{ padding: 12 }, pressed ? { borderColor: cores.bordaForte } : {}]}>
                    <View style={[s.linha, { alignItems: "center" }]}>
                      <View style={st.indice}>
                        <Text style={st.indiceTexto}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.forte, { fontSize: 14 }]} numberOfLines={1}>
                          {p.palpite}
                        </Text>
                        <TextoSuave estilo={{ fontSize: 12 }}>
                          contra {p.adversario}
                          {p.numero === 1 ? " · luta principal" : ""}
                        </TextoSuave>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.forte, { fontSize: 14 }]}>{pct(p.prob)}</Text>
                        <TextoSuave estilo={{ fontSize: 11.5 }}>
                          justa {odd(p.oddJusta)}
                          {p.oddCasa != null ? ` · casa ${odd(p.oddCasa)}` : ""}
                        </TextoSuave>
                      </View>
                    </View>
                  </CartaoVidro>
                )}
              </Pressable>
            ))}

            <Aviso tipo="info">
              Montada com o palpite do modelo em cada luta: o favorito
              {estado.tipo === "metodo" ? " pelo método mais provável dele" : ""}. Para dupla, tripla e quádrupla entram as
              lutas de maior probabilidade do evento, que formam a combinação mais provável. A probabilidade da múltipla é
              a multiplicação das probabilidades de cada luta, considerando lutas diferentes como independentes. Basta um
              erro para perder a múltipla inteira: quanto mais seleções, menor a chance.
              {estado.tipo === "metodo" ? " O modelo acerta o método bem menos do que o vencedor." : ""} Não é recomendação de
              aposta nem garantia de lucro.
            </Aviso>
            {disponiveis < ev.lutas.length && (
              <TextoSuave estilo={{ fontSize: 12 }}>
                {ev.lutas.length - disponiveis} luta(s) do evento ficaram de fora por falta de dados suficientes (ex.:
                estreantes).
              </TextoSuave>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** Odd sem limite (múltiplas longas passam de 1.000): separador de milhar à brasileira. */
function oddMultipla(x: number | null): string {
  if (x == null) return "—";
  if (x < 1000) return odd(x);
  return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Probabilidade com casas suficientes para não virar "0%" em múltiplas longas. */
function probMultipla(p: number): string {
  if (p >= 0.001) return pct(p);
  return `1 em ${oddMultipla(1 / p)}`;
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <TextoSuave estilo={{ fontSize: 11.5 }}>{rotulo}</TextoSuave>
      <Text style={[st.numero, { color: cor }]}>{valor}</Text>
    </View>
  );
}

function nomeCurto(nome: string, data: string): string {
  const d = new Date(data);
  const dia = isNaN(d.getTime()) ? "" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} · `;
  const n = nome.replace("UFC Fight Night:", "UFC FN:");
  return `${dia}${n.length > 26 ? n.slice(0, 25) + "…" : n}`;
}

const st = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: espaco.l, paddingVertical: espaco.m },
  tituloBloco: { color: cores.texto, fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  numero: { fontFamily: fontes.luta, fontSize: 22, marginTop: 2 },
  rodape: { marginTop: espaco.m, paddingTop: espaco.s, borderTopWidth: 1, borderTopColor: "rgba(31,41,55,0.8)" },
  leitura: { fontFamily: fontes.semi, fontSize: 12.5 },
  secao: { color: cores.textoMedio, fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  indice: {
    width: 26,
    height: 26,
    borderRadius: 26,
    backgroundColor: translucido(cores.vermelho, 0.18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  indiceTexto: { color: cores.vermelhoClaro, fontFamily: fontes.luta, fontSize: 13 },
});
