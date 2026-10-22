import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { confianca, metodoDoFavorito } from "../combinacoes";
import {
  Aviso,
  Avatar,
  BarraProbabilidade,
  BotaoPrincipal,
  CabecalhoTela,
  CartaoVidro,
  Pilula,
  Segmentado,
  Selo,
  StatusDados,
  TextoSuave,
  s,
} from "../componentes";
import { useDados } from "../dados";
import { categoria, dataEvento, odd, pct, sobrenome } from "../formatar";
import type { Navegacao } from "../navegacao";
import { LIMITE_VALOR, melhorValor } from "../odds";
import { cores, espaco, fontes, gradientes, translucido } from "../tema";
import type { Evento, Luta, Lutador, Segmento } from "../tipos";

export type Aba = "principal" | "preliminar" | "preliminar_antecipada";

const NOME_ABA: Record<Aba, string> = {
  principal: "Card principal",
  preliminar: "Preliminares",
  preliminar_antecipada: "Antecipadas",
};

function abaDaLuta(seg: Segmento): Aba {
  return seg === "principal" ? "principal" : seg === "preliminar_antecipada" ? "preliminar_antecipada" : "preliminar";
}

function cartel(l: Lutador): string {
  return l.carreira_mma?.cartel ?? l.cartel_espn ?? "—";
}

/** Selo de cada luta: valor estimado, equilíbrio ou falta de dados (sempre a partir dos dados reais). */
function seloDaLuta(l: Luta) {
  if (!l.previsao) return <Selo texto="⚠ DADOS LIMITADOS" cor={cores.textoMedio} />;
  const mv = melhorValor(l.previsao, l.odds_casa);
  if (mv && mv.valor > LIMITE_VALOR) {
    const nome = sobrenome(mv.lado === "a" ? l.lutador_a.nome : l.lutador_b.nome).toUpperCase();
    return <Selo texto={`+EV · ${nome}`} cor={cores.verdeClaro} ponto />;
  }
  const c = confianca(l.previsao.a.vitoria.prob);
  if (c.nivel === 0) return <Selo texto="LUTA EQUILIBRADA" cor={cores.ambarClaro} />;
  return <Selo texto={c.texto.toUpperCase()} cor={c.nivel === 2 ? cores.azulClaro : cores.textoSuave} />;
}

export function TelaEventos({
  nav,
  eventoId,
  aoEscolherEvento,
  aba,
  aoMudarAba,
}: {
  nav: Navegacao;
  eventoId: string | null;
  aoEscolherEvento: (id: string) => void;
  aba: Aba;
  aoMudarAba: (a: Aba) => void;
}) {
  const { dados, atualizando, atualizar } = useDados();
  const eventos = [...dados.eventos.eventos].sort((a, b) => a.data.localeCompare(b.data));
  const ev = eventos.find((e) => e.id === eventoId) ?? eventos[0];

  if (!ev) {
    return (
      <View style={{ flex: 1 }}>
        <CabecalhoTela rotulo="Próximo card" titulo="UFC Predictor" />
        <View style={s.conteudo}>
          <StatusDados />
          <Aviso>Nenhum evento futuro encontrado nos dados disponíveis.</Aviso>
        </View>
      </View>
    );
  }

  const lutas = [...ev.lutas].sort((a, b) => a.numero - b.numero);
  const principal = lutas.find((l) => l.numero === 1) ?? lutas[0];
  const contagem = (a: Aba) => lutas.filter((l) => abaDaLuta(l.segmento) === a).length;
  const abas = (["principal", "preliminar", "preliminar_antecipada"] as Aba[]).filter((a) => contagem(a) > 0);
  const abaAtual = abas.includes(aba) ? aba : abas[0] ?? "principal";
  const daAba = lutas.filter((l) => abaDaLuta(l.segmento) === abaAtual && l.id !== principal?.id);
  const indice = eventos.indexOf(ev);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.texto} />}
    >
      <CabecalhoTela rotulo={indice === 0 ? "Próximo card" : "Card futuro"} titulo={ev.nome} />
      <TextoSuave estilo={{ paddingHorizontal: 20, marginTop: -2 }}>{dataEvento(ev.data)}</TextoSuave>

      {eventos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {eventos.map((e) => (
            <Pilula key={e.id} texto={nomeCurto(e)} ativa={e.id === ev.id} aoTocar={() => aoEscolherEvento(e.id)} />
          ))}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: espaco.l, gap: espaco.m }}>
        <StatusDados />
        {principal && <Heroi luta={principal} ev={ev} nav={nav} />}

        {abas.length > 0 && (
          <Segmentado
            opcoes={abas.map((a) => ({ valor: a, rotulo: `${NOME_ABA[a]} (${contagem(a)})` }))}
            ativo={abaAtual}
            aoMudar={aoMudarAba}
          />
        )}
        {daAba.map((l) => (
          <CartaoLuta key={l.id} luta={l} aoTocar={() => nav.abrir({ tela: "confronto", eventoId: ev.id, lutaId: l.id })} />
        ))}
        {daAba.length === 0 && abaAtual === "principal" && (
          <TextoSuave>O card principal só tem a luta em destaque acima.</TextoSuave>
        )}
      </View>
    </ScrollView>
  );
}

function nomeCurto(e: Evento): string {
  const d = new Date(e.data);
  const dia = isNaN(d.getTime()) ? "" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} · `;
  const nome = e.nome.replace("UFC Fight Night:", "UFC FN:");
  return `${dia}${nome.length > 26 ? nome.slice(0, 25) + "…" : nome}`;
}

function Heroi({ luta, ev, nav }: { luta: Luta; ev: Evento; nav: Navegacao }) {
  const { lutador_a: a, lutador_b: b, previsao: p, odds_casa: o } = luta;
  const mv = melhorValor(p, o);
  const abrir = () => nav.abrir({ tela: "confronto", eventoId: ev.id, lutaId: luta.id });
  return (
    <CartaoVidro gradiente={gradientes.heroi} borda={translucido(cores.vermelho, 0.25)}>
      <View style={st.brilho} />
      <View style={[s.linha, { alignItems: "center", marginBottom: espaco.s }]}>
        <Selo texto={`LUTA PRINCIPAL • ${categoria(luta.categoria).toUpperCase()}`} cor={cores.vermelhoClaro} ponto />
        <TextoSuave estilo={{ fontSize: 12 }}>{dataEvento(ev.data).split(" · ")[1] ?? ""}</TextoSuave>
      </View>

      <View style={[s.linha, { alignItems: "flex-start", marginVertical: espaco.s }]}>
        <LadoHeroi l={a} canto="a" oddCasa={o?.a.atual} />
        <View style={{ alignItems: "center", gap: 4, paddingHorizontal: 2, paddingTop: 20, maxWidth: 110 }}>
          <Text style={st.vs}>VS</Text>
          {mv && mv.valor > LIMITE_VALOR ? (
            <Selo texto={`+EV · ${sobrenome(mv.lado === "a" ? a.nome : b.nome).toUpperCase()}`} cor={cores.verdeClaro} />
          ) : p ? (
            <Selo texto={confianca(p.a.vitoria.prob).texto.toUpperCase()} cor={cores.textoSuave} />
          ) : null}
        </View>
        <LadoHeroi l={b} canto="b" oddCasa={o?.b.atual} />
      </View>

      {p ? (
        <View style={st.divisor}>
          <View style={[s.linha, { marginBottom: 6 }]}>
            <Text style={[st.legenda, { color: cores.vermelhoClaro }]}>
              {sobrenome(a.nome)} ({pct(p.a.vitoria.prob)})
            </Text>
            <Text style={[st.legenda, { color: cores.azulClaro, textAlign: "right" }]}>
              {sobrenome(b.nome)} ({pct(p.b.vitoria.prob)})
            </Text>
          </View>
          <BarraProbabilidade pa={p.a.vitoria.prob} />
          <TextoSuave estilo={{ fontSize: 12, marginTop: 6, textAlign: "center" }}>
            {(() => {
              const m = metodoDoFavorito(p, a.nome, b.nome);
              return `Favorito: ${sobrenome(m.nome)} · método mais provável: ${m.metodo} (${pct(m.prob)})`;
            })()}
          </TextoSuave>
        </View>
      ) : (
        <View style={st.divisor}>
          <Aviso>Sem previsão: falta histórico suficiente no UFC de um dos atletas.</Aviso>
        </View>
      )}

      <View style={{ marginTop: espaco.m }}>
        <BotaoPrincipal titulo="Ver análise detalhada" aoTocar={abrir} />
      </View>
    </CartaoVidro>
  );
}

function LadoHeroi({ l, canto, oddCasa }: { l: Lutador; canto: "a" | "b"; oddCasa?: number | null }) {
  const cor = canto === "a" ? cores.vermelhoClaro : cores.azulClaro;
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
      <Avatar nome={l.nome} canto={canto} />
      <Text style={[s.forte, { fontSize: 14, textAlign: "center" }]} numberOfLines={2}>
        {l.nome}
      </Text>
      <TextoSuave estilo={{ fontSize: 12 }}>{cartel(l)}</TextoSuave>
      {oddCasa != null && (
        <View style={[st.oddPilula, { backgroundColor: translucido(cor, 0.15) }]}>
          <Text style={[st.oddTexto, { color: cor }]}>Odd {odd(oddCasa)}</Text>
        </View>
      )}
    </View>
  );
}

function CartaoLuta({ luta, aoTocar }: { luta: Luta; aoTocar: () => void }) {
  const { lutador_a: a, lutador_b: b, previsao: p, odds_casa: o } = luta;
  const mp = p ? metodoDoFavorito(p, a.nome, b.nome) : null;
  return (
    <Pressable onPress={aoTocar}>
      {({ pressed }) => (
        <CartaoVidro
          estilo={[
            { padding: 13 },
            !p ? { borderLeftWidth: 3, borderLeftColor: cores.ambar } : {},
            pressed ? { borderColor: cores.bordaForte } : {},
          ]}
        >
          <View style={[s.linha, { alignItems: "center", marginBottom: 10 }]}>
            <Text style={st.categoria}>
              {luta.numero === 1 ? "LUTA PRINCIPAL • " : ""}
              {categoria(luta.categoria).toUpperCase()}
            </Text>
            {seloDaLuta(luta)}
          </View>

          <View style={[s.linha, { alignItems: "center", gap: 6 }]}>
            <LadoLista l={a} odd={o?.a.atual} />
            <View style={{ alignItems: "center", paddingHorizontal: 2 }}>
              <Text style={[st.vs, { fontSize: 12 }]}>VS</Text>
            </View>
            <LadoLista l={b} odd={o?.b.atual} direita />
          </View>

          {p && (
            <View style={{ marginTop: 10 }}>
              <BarraProbabilidade pa={p.a.vitoria.prob} altura={6} />
              <View style={[s.linha, { marginTop: 4 }]}>
                <Text style={[st.legendaPeq, { color: cores.vermelhoClaro }]}>{pct(p.a.vitoria.prob)}</Text>
                <Text style={[st.legendaPeq, { color: cores.textoSuave, flex: 1, textAlign: "center" }]} numberOfLines={1}>
                  {mp ? `${sobrenome(mp.nome)} vence por ${mp.metodo} (${pct(mp.prob, 0)})` : ""}
                </Text>
                <Text style={[st.legendaPeq, { color: cores.azulClaro }]}>{pct(p.b.vitoria.prob)}</Text>
              </View>
            </View>
          )}
        </CartaoVidro>
      )}
    </Pressable>
  );
}

function LadoLista({ l, odd: oddCasa, direita }: { l: Lutador; odd?: number | null; direita?: boolean }) {
  const semDados = l.status_dados !== "ok";
  const sub = semDados
    ? l.status_dados === "nao_encontrado"
      ? "estreia no UFC"
      : l.status_dados === "ambiguo"
        ? "nome ambíguo"
        : "< 2 lutas UFC"
    : cartel(l);
  return (
    <View style={[{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }, direita && { flexDirection: "row-reverse" }]}>
      <Avatar nome={l.nome} tamanho={34} />
      <View style={{ flex: 1, alignItems: direita ? "flex-end" : "flex-start" }}>
        <Text style={[s.forte, { fontSize: 13, textAlign: direita ? "right" : "left" }]} numberOfLines={2}>
          {l.nome}
        </Text>
        <Text style={[st.sub, semDados && { color: cores.ambarClaro }]} numberOfLines={1}>
          {sub}
          {oddCasa != null ? ` • ${odd(oddCasa)}` : ""}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: espaco.l, paddingVertical: espaco.m },
  brilho: {
    position: "absolute",
    top: -48,
    right: -48,
    width: 144,
    height: 144,
    borderRadius: 144,
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  vs: { color: cores.textoApagado, fontFamily: fontes.luta, fontSize: 14, fontStyle: "italic" },
  divisor: { marginTop: espaco.s, paddingTop: espaco.s, borderTopWidth: 1, borderTopColor: "rgba(31,41,55,0.8)" },
  legenda: { fontFamily: fontes.semi, fontSize: 12, flex: 1 },
  legendaPeq: { fontFamily: fontes.semi, fontSize: 11.5 },
  oddPilula: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  oddTexto: { fontFamily: fontes.negrito, fontSize: 12 },
  categoria: { color: cores.textoSuave, fontFamily: fontes.medio, fontSize: 11.5, flex: 1 },
  sub: { color: cores.textoSuave, fontFamily: fontes.regular, fontSize: 11.5 },
});
