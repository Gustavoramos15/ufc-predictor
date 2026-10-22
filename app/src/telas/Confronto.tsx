import { ScrollView, StyleSheet, Text, View } from "react-native";

import { combinacoes, comoTermina, confianca, resultadoMaisProvavel } from "../combinacoes";
import {
  Aviso,
  Avatar,
  BarraMetrica,
  BarraProbabilidade,
  BarraVoltar,
  Caixa,
  CartaoVidro,
  Selo,
  Subtitulo,
  TextoSuave,
  s,
} from "../componentes";
import { useDados } from "../dados";
import { categoria, dataEvento, dataHora, dataSimples, num, odd, pct, sobrenome } from "../formatar";
import type { Navegacao } from "../navegacao";
import { LIMITE_VALOR, leituraValor, margemCasa, probCasaSemMargem, valorEstimado } from "../odds";
import { cores, espaco, fontes, gradientes, translucido } from "../tema";
import type { Lutador, OddsCasa, Previsao, PrevisaoLado } from "../tipos";

export function TelaConfronto({ nav, eventoId, lutaId }: { nav: Navegacao; eventoId: string; lutaId: string }) {
  const { dados } = useDados();
  const ev = dados.eventos.eventos.find((e) => e.id === eventoId);
  const luta = ev?.lutas.find((l) => l.id === lutaId);
  if (!ev || !luta) {
    return (
      <View style={{ flex: 1 }}>
        <BarraVoltar titulo="Análise de confronto" voltar={nav.voltar} />
        <View style={s.conteudo}>
          <Aviso>Esta luta não está mais nos dados atuais (pode ter sido cancelada ou alterada).</Aviso>
        </View>
      </View>
    );
  }
  const { lutador_a: a, lutador_b: b, previsao: p, odds_casa: o } = luta;

  return (
    <View style={{ flex: 1 }}>
      <BarraVoltar titulo="Análise de confronto" voltar={nav.voltar} />
      <ScrollView contentContainerStyle={s.conteudo}>
        <FaceOff a={a} b={b} categoriaTexto={categoria(luta.categoria)} evento={ev.nome} data={dataEvento(ev.data)} />

        {p ? (
          <BlocoPrevisao p={p} a={a.nome} b={b.nome} o={o} versao={dados.meta.modelo.versao} />
        ) : (
          <CartaoVidro estilo={{ borderLeftWidth: 4, borderLeftColor: cores.ambar }}>
            <CabecalhoBloco icone="⚠" titulo="Previsão do modelo" cor={cores.ambarClaro} />
            <TextoSuave estilo={{ marginTop: espaco.s, lineHeight: 19 }}>
              Sem previsão: o modelo só calcula probabilidades quando os dois atletas têm histórico suficiente no UFC.
              {luta.avisos.length ? "\n\n• " + luta.avisos.join("\n• ") : ""}
            </TextoSuave>
          </CartaoVidro>
        )}

        {o ? (
          <BlocoOdds o={o} p={p} a={a.nome} b={b.nome} />
        ) : (
          <CartaoVidro>
            <CabecalhoBloco icone="$" titulo="Análise de odds & valor" cor={cores.verdeClaro} />
            <TextoSuave estilo={{ marginTop: espaco.s }}>
              Nenhuma casa publicou odds desta luta na ESPN até a última atualização. Elas costumam aparecer perto do
              evento.
            </TextoSuave>
          </CartaoVidro>
        )}

        <Comparativo a={a} b={b} dataEvento={ev.data} />
      </ScrollView>
    </View>
  );
}

function CabecalhoBloco({ icone, titulo, cor, direita }: { icone: string; titulo: string; cor: string; direita?: string }) {
  return (
    <View style={[s.linha, { alignItems: "center" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[st.iconeBloco, { backgroundColor: translucido(cor, 0.2) }]}>
          <Text style={{ color: cor, fontSize: 12, fontFamily: fontes.negrito }}>{icone}</Text>
        </View>
        <Text style={st.tituloBloco}>{titulo}</Text>
      </View>
      {direita && (
        <View style={st.chipVersao}>
          <Text style={st.chipVersaoTexto}>{direita}</Text>
        </View>
      )}
    </View>
  );
}

function FaceOff({ a, b, categoriaTexto, evento, data }: { a: Lutador; b: Lutador; categoriaTexto: string; evento: string; data: string }) {
  return (
    <CartaoVidro>
      <View style={[s.linha, { alignItems: "flex-start" }]}>
        <LadoFaceOff l={a} canto="a" />
        <View style={{ alignItems: "center", paddingTop: 14 }}>
          <View style={st.vsCirculo}>
            <Text style={st.vsTexto}>VS</Text>
          </View>
          <Text style={st.faceInfo}>{categoriaTexto.toUpperCase()}</Text>
        </View>
        <LadoFaceOff l={b} canto="b" />
      </View>
      <TextoSuave estilo={{ textAlign: "center", fontSize: 12, marginTop: espaco.s }}>
        {evento} · {data}
      </TextoSuave>
    </CartaoVidro>
  );
}

function LadoFaceOff({ l, canto }: { l: Lutador; canto: "a" | "b" }) {
  const h = l.historico_ufc;
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Avatar nome={l.nome} canto={canto} />
      <Text style={[s.forte, { textAlign: "center", marginTop: 4 }]} numberOfLines={2}>
        {l.nome}
      </Text>
      {l.pais && <TextoSuave estilo={{ fontSize: 12 }}>{l.pais}</TextoSuave>}
      <Text style={st.cartel}>Cartel: {l.carreira_mma?.cartel ?? l.cartel_espn ?? "—"}</Text>
      <TextoSuave estilo={{ fontSize: 11.5 }}>
        UFC: {h ? `${h.vitorias}-${h.derrotas}${h.empates ? `-${h.empates}` : ""}` : "estreante"}
      </TextoSuave>
      {h && h.ultimos_5.length > 0 && (
        <View style={{ flexDirection: "row", gap: 3, marginTop: 4 }}>
          {h.ultimos_5.map((r, i) => (
            <View key={i} style={[st.forma, { backgroundColor: COR_RESULTADO[r] ?? cores.cinzaEscuro }]}>
              <Text style={st.formaTexto}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const COR_RESULTADO: Record<string, string> = { V: "#1F7A4D", D: "#8A2A2A", E: "#555B66", SR: "#555B66" };

function nivelTexto(p: number, maior: boolean): [string, string] {
  if (maior) return ["Mais provável", cores.verdeClaro];
  if (p >= 0.25) return ["Moderado", cores.textoSuave];
  return ["Baixo", cores.textoApagado];
}

function BlocoPrevisao({ p, a, b, o, versao }: { p: Previsao; a: string; b: string; o?: OddsCasa | null; versao: string }) {
  const favA = p.a.vitoria.prob >= 0.5;
  const fav = favA ? a : b;
  const pFav = favA ? p.a.vitoria.prob : p.b.vitoria.prob;
  const conf = confianca(p.a.vitoria.prob);
  const mp = resultadoMaisProvavel(p, a, b);
  const termina = comoTermina(p);
  const tiles: [string, number][] = [
    ["Decisão", termina[0].prob],
    ["KO / TKO", termina[2].prob],
    ["Finalização", termina[3].prob],
  ];
  const maior = Math.max(...tiles.map((t) => t[1]));
  const linhas: [string, "ko_tko" | "finalizacao" | "decisao" | "vitoria"][] = [
    ["KO/TKO", "ko_tko"],
    ["Finalização", "finalizacao"],
    ["Decisão", "decisao"],
    ["Vitória (total)", "vitoria"],
  ];

  return (
    <>
      <CartaoVidro estilo={{ borderLeftWidth: 4, borderLeftColor: cores.vermelho }}>
        <CabecalhoBloco icone="⚡" titulo="Previsão do modelo" cor={cores.vermelhoClaro} direita={versao} />

        <Caixa estilo={[s.linha, { alignItems: "center", marginTop: espaco.m, backgroundColor: "#12151D" }]}>
          <View style={{ flex: 1 }}>
            <TextoSuave estilo={{ fontSize: 12 }}>Vencedor projetado · {conf.texto.toLowerCase()}</TextoSuave>
            <Text style={[s.forte, { color: favA ? cores.vermelhoClaro : cores.azulClaro, fontSize: 15 }]} numberOfLines={1}>
              {fav}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <TextoSuave estilo={{ fontSize: 12 }}>Probabilidade</TextoSuave>
            <Text style={st.numeroGrande}>{pct(pFav)}</Text>
          </View>
        </Caixa>

        <View style={{ marginTop: espaco.m }}>
          <BarraProbabilidade pa={p.a.vitoria.prob} altura={10} />
          <View style={[s.linha, { marginTop: 4 }]}>
            <Text style={[st.legenda, { color: cores.vermelhoClaro }]}>
              {sobrenome(a)} {pct(p.a.vitoria.prob)}
            </Text>
            <Text style={[st.legenda, { color: cores.azulClaro, textAlign: "right" }]}>
              {pct(p.b.vitoria.prob)} {sobrenome(b)}
            </Text>
          </View>
        </View>

        <Text style={[st.miniTitulo, { marginTop: espaco.m }]}>Como a luta termina (qualquer lutador)</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          {tiles.map(([rotulo, prob]) => {
            const [nivel, cor] = nivelTexto(prob, prob === maior);
            return (
              <Caixa key={rotulo} estilo={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
                <TextoSuave estilo={{ fontSize: 12 }}>{rotulo}</TextoSuave>
                <Text style={[st.tileNumero, { color: prob === maior ? cores.verdeClaro : cores.texto }]}>{pct(prob, 0)}</Text>
                <Text style={[st.tileNivel, { color: cor }]}>{nivel}</Text>
              </Caixa>
            );
          })}
        </View>

        {o?.total_rounds && (
          <Caixa estilo={[s.linha, { alignItems: "center", marginTop: 8 }]}>
            <Text style={[s.texto, { fontSize: 12.5, color: cores.textoMedio }]}>
              Rounds (casa): {num(o.total_rounds.linha, 1)}
            </Text>
            <Text style={st.chipRounds}>
              mais {odd(o.total_rounds.mais)} · menos {odd(o.total_rounds.menos)}
            </Text>
          </Caixa>
        )}

        <Caixa estilo={{ marginTop: 8 }}>
          <TextoSuave estilo={{ fontSize: 12 }}>Resultado individual mais provável</TextoSuave>
          <Text style={[s.forte, { marginTop: 2 }]}>
            {mp.nome} por {mp.metodo} · {pct(mp.prob)}{" "}
            <Text style={[s.suave, { fontSize: 12 }]}>(odd justa {odd(1 / mp.prob)})</Text>
          </Text>
        </Caixa>
      </CartaoVidro>

      <Subtitulo>Método de vitória e odd justa</Subtitulo>
      <CartaoVidro estilo={{ padding: 0 }}>
        <View style={[st.tabLinha, st.tabCabecalho]}>
          <Text style={[st.tabRotulo, s.suave]}>Resultado</Text>
          <Text style={[st.tabNum, { color: cores.vermelhoClaro, fontFamily: fontes.negrito }]} numberOfLines={1}>
            {sobrenome(a)}
          </Text>
          <Text style={[st.tabNum, { color: cores.azulClaro, fontFamily: fontes.negrito }]} numberOfLines={1}>
            {sobrenome(b)}
          </Text>
        </View>
        {linhas.map(([rotulo, chave]) => (
          <View key={chave} style={[st.tabLinha, chave === "vitoria" && { backgroundColor: "rgba(255,255,255,0.03)" }]}>
            <Text style={[st.tabRotulo, s.texto, { fontSize: 13 }, chave === "vitoria" && { fontFamily: fontes.negrito }]}>
              {rotulo}
            </Text>
            {(["a", "b"] as const).map((lado) => (
              <View key={lado} style={st.tabNumCaixa}>
                <Text style={[s.forte, { textAlign: "right" }]}>{pct(p[lado][chave].prob)}</Text>
                <TextoSuave estilo={{ textAlign: "right", fontSize: 11.5 }}>odd {odd(p[lado][chave].odd_justa)}</TextoSuave>
              </View>
            ))}
          </View>
        ))}
      </CartaoVidro>

      <Subtitulo>Métodos combinados</Subtitulo>
      <TextoSuave estilo={{ fontSize: 12 }}>
        Soma exata de dois métodos do mesmo lutador (ex.: "vence por KO/TKO ou decisão").
      </TextoSuave>
      <Combinacoes nome={a} lado={p.a} cor={cores.vermelho} />
      <Combinacoes nome={b} lado={p.b} cor={cores.azul} />

      <Aviso tipo="info">
        Probabilidades estimadas por um modelo estatístico (Elo + regressão logística) a partir do histórico. Odd justa
        = 1 ÷ probabilidade: não é cotação de casa de apostas nem recomendação de aposta. O modelo acerta o vencedor bem
        melhor do que o método. Empates, DQ e lutas sem resultado não estão incluídos.
      </Aviso>
    </>
  );
}

function Combinacoes({ nome, lado, cor }: { nome: string; lado: PrevisaoLado; cor: string }) {
  const lista = combinacoes(lado);
  return (
    <CartaoVidro estilo={{ padding: 0, borderLeftWidth: 3, borderLeftColor: cor }}>
      <View style={[st.tabLinha, st.tabCabecalho]}>
        <Text style={[s.forte, { color: cor }]}>{nome} vence por…</Text>
      </View>
      {lista.map((c, i) => (
        <View key={c.rotulo} style={[st.tabLinha, i === 0 && { backgroundColor: "rgba(255,255,255,0.03)" }]}>
          <View style={{ flex: 2.4 }}>
            <Text style={[s.texto, { fontSize: 13 }, i === 0 && { fontFamily: fontes.negrito }]}>{c.rotulo}</Text>
            {i === 0 && <Text style={{ color: cor, fontSize: 11, fontFamily: fontes.negrito }}>MAIS PROVÁVEL</Text>}
          </View>
          <View style={st.tabNumCaixa}>
            <Text style={[s.forte, { textAlign: "right" }]}>{pct(c.prob)}</Text>
            <TextoSuave estilo={{ textAlign: "right", fontSize: 11.5 }}>odd {odd(c.odd)}</TextoSuave>
          </View>
        </View>
      ))}
    </CartaoVidro>
  );
}

function BlocoOdds({ o, p, a, b }: { o: OddsCasa; p: Previsao | null; a: string; b: string }) {
  const margem = margemCasa(o);
  return (
    <CartaoVidro gradiente={gradientes.valor} borda={translucido(cores.verde, 0.3)}>
      <View style={[s.linha, { alignItems: "center" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: cores.verdeClaro }} />
          <Text style={[st.tituloBloco, { color: "#6EE7B7" }]}>Análise de odds & valor</Text>
        </View>
        <TextoSuave estilo={{ fontSize: 12 }}>ESPN / {o.casa ?? "casa"}</TextoSuave>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: espaco.m }}>
        {(["a", "b"] as const).map((lado) => {
          const nome = lado === "a" ? a : b;
          const oc = o[lado];
          const pm = p ? p[lado].vitoria.prob : null;
          const valor = pm != null ? valorEstimado(pm, oc.atual) : null;
          const leitura = leituraValor(valor);
          const ev = valor != null && valor > LIMITE_VALOR;
          return (
            <View key={lado} style={[st.oddCaixa, ev && { borderColor: translucido(cores.verde, 0.6) }]}>
              {ev && (
                <View style={st.cantoEv}>
                  <Text style={st.cantoEvTexto}>+EV</Text>
                </View>
              )}
              <Text style={[st.oddNome, { color: lado === "a" ? cores.vermelhoClaro : cores.azulClaro }]} numberOfLines={1}>
                {sobrenome(nome)}
              </Text>
              <View style={[s.linha, { marginTop: 4 }]}>
                <View>
                  <TextoSuave estilo={{ fontSize: 11 }}>Odd casa</TextoSuave>
                  <Text style={[st.oddValor, ev && { color: "#6EE7B7" }]}>{odd(oc.atual)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <TextoSuave estilo={{ fontSize: 11 }}>Odd justa</TextoSuave>
                  <Text style={[st.oddValor, { color: pm != null ? cores.verdeClaro : cores.textoApagado }]}>
                    {pm != null ? odd(1 / pm) : "—"}
                  </Text>
                </View>
              </View>
              <View style={st.oddRodape}>
                <TextoSuave estilo={{ fontSize: 11 }}>
                  Casa s/ margem: {pct(probCasaSemMargem(o, lado))}
                  {oc.abertura != null && oc.abertura !== oc.atual ? ` · abriu ${odd(oc.abertura)}` : ""}
                </TextoSuave>
                {leitura ? (
                  <Text style={[st.leitura, { color: COR_LEITURA[leitura] }]}>
                    {TEXTO_LEITURA[leitura]} ({valor! >= 0 ? "+" : ""}
                    {pct(valor!)})
                  </Text>
                ) : (
                  <TextoSuave estilo={{ fontSize: 11 }}>Sem previsão do modelo</TextoSuave>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <TextoSuave estilo={{ fontSize: 11.5, marginTop: espaco.m, lineHeight: 17 }}>
        Margem da casa: {pct(margem)} · consultado em {dataHora(o.consultado_em)}. "+EV" = odd da casa ao menos 5% acima
        da odd justa. Só vale se a probabilidade do modelo estiver certa; o modelo ainda não foi testado contra odds
        reais. Não é recomendação de aposta nem garantia de lucro.
      </TextoSuave>
    </CartaoVidro>
  );
}

const COR_LEITURA = { acima: cores.verdeClaro, proxima: cores.textoSuave, abaixo: cores.vermelhoClaro };
const TEXTO_LEITURA = { acima: "Odd acima da justa", proxima: "Próxima da justa", abaixo: "Abaixo da justa" };

// ---------------------------------------------------------------- comparativo

type Campo = "golpes_sig_por_min" | "precisao_golpes" | "quedas_por_15min" | "precisao_quedas";

/** Estatística do UFC; sem ela, a média fora do UFC (ESPN). O segundo valor indica se veio de fora. */
function stat(l: Lutador, campo: Campo): [number | null, boolean] {
  const doUfc = l.estatisticas?.[campo];
  if (doUfc != null && (l.estatisticas?.minutos_com_estatisticas ?? 0) > 0) return [doUfc, false];
  const fora = l.medias_fora_ufc?.[campo];
  return fora != null ? [fora, true] : [null, false];
}

function diasParado(l: Lutador, dataEv: string): number | null {
  const u = l.historico_ufc?.ultima_luta;
  if (!u) return null;
  const d = (new Date(dataEv).getTime() - new Date(`${u}T00:00:00Z`).getTime()) / 86400000;
  return isNaN(d) ? null : Math.max(0, Math.round(d));
}

function Comparativo({ a, b, dataEvento: dataEv }: { a: Lutador; b: Lutador; dataEvento: string }) {
  const metricas: { rotulo: string; va: number | null; vb: number | null; fa: string; fb: string }[] = [];
  const add = (rotulo: string, va: number | null | undefined, vb: number | null | undefined, f: (x: number) => string, foraA = false, foraB = false) =>
    metricas.push({
      rotulo,
      va: va ?? null,
      vb: vb ?? null,
      fa: va != null ? f(va) + (foraA ? "*" : "") : "—",
      fb: vb != null ? f(vb) + (foraB ? "*" : "") : "—",
    });
  const g = (l: Lutador, c: Campo) => stat(l, c);
  add("Elo (força estimada)", a.estatisticas?.elo, b.estatisticas?.elo, (x) => String(x));
  add("Golpes sig./min", g(a, "golpes_sig_por_min")[0], g(b, "golpes_sig_por_min")[0], (x) => num(x), g(a, "golpes_sig_por_min")[1], g(b, "golpes_sig_por_min")[1]);
  add("Golpes sofridos/min", a.estatisticas?.golpes_sig_sofridos_por_min, b.estatisticas?.golpes_sig_sofridos_por_min, (x) => num(x));
  add("Precisão de golpes", g(a, "precisao_golpes")[0], g(b, "precisao_golpes")[0], (x) => pct(x, 0), g(a, "precisao_golpes")[1], g(b, "precisao_golpes")[1]);
  add("Defesa de golpes", a.estatisticas?.defesa_golpes, b.estatisticas?.defesa_golpes, (x) => pct(x, 0));
  add("Quedas / 15 min", g(a, "quedas_por_15min")[0], g(b, "quedas_por_15min")[0], (x) => num(x), g(a, "quedas_por_15min")[1], g(b, "quedas_por_15min")[1]);
  add("Precisão de quedas", g(a, "precisao_quedas")[0], g(b, "precisao_quedas")[0], (x) => pct(x, 0), g(a, "precisao_quedas")[1], g(b, "precisao_quedas")[1]);
  add("Defesa de quedas", a.estatisticas?.defesa_quedas, b.estatisticas?.defesa_quedas, (x) => pct(x, 0));
  add("Controle / 15 min (s)", a.estatisticas?.controle_por_15min_s, b.estatisticas?.controle_por_15min_s, (x) => {
    const t = Math.round(x);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  });
  add("Finalizações tent./15 min", a.estatisticas?.tentativas_finalizacao_por_15min, b.estatisticas?.tentativas_finalizacao_por_15min, (x) => num(x));
  add("Envergadura", a.estatisticas?.envergadura_cm, b.estatisticas?.envergadura_cm, (x) => `${x} cm`);
  add("Idade", a.estatisticas?.idade, b.estatisticas?.idade, (x) => `${Math.floor(x)} anos`);
  add("Inatividade (dias)", diasParado(a, dataEv), diasParado(b, dataEv), (x) => `${x} dias`);

  const linhasTexto: [string, (l: Lutador) => string][] = [
    ["Lutas no UFC", (l) => String(l.historico_ufc?.lutas ?? 0)],
    ["Vitórias UFC KO/fin./dec.", (l) => {
      const v = l.historico_ufc?.vitorias_por_metodo;
      return v ? `${v["KO/TKO"]}/${v.FINALIZACAO}/${v.DECISAO}` : "—";
    }],
    ["Derrotas UFC KO/fin./dec.", (l) => {
      const d = l.historico_ufc?.derrotas_por_metodo;
      return d ? `${d["KO/TKO"]}/${d.FINALIZACAO}/${d.DECISAO}` : "—";
    }],
    ["Cartel no MMA", (l) => l.carreira_mma?.cartel ?? l.cartel_espn ?? "—"],
    ["Vitórias MMA KO/fin./outro", (l) => {
      const v = l.carreira_mma?.vitorias_por_metodo;
      return v ? `${v.ko_tko}/${v.finalizacao}/${v.decisao_ou_outro}` : "—";
    }],
    ["Minutos analisados (UFC)", (l) => num(l.estatisticas?.minutos_com_estatisticas, 0)],
    ["Última luta no UFC", (l) => dataSimples(l.historico_ufc?.ultima_luta)],
  ];

  const comFora = [a, b].filter((l) => l.medias_fora_ufc && !(l.estatisticas?.minutos_com_estatisticas ?? 0));

  return (
    <>
      <CartaoVidro>
        <View style={[s.linha, { alignItems: "center", marginBottom: espaco.m }]}>
          <Text style={st.tituloBloco}>Comparativo de métricas</Text>
          <TextoSuave estilo={{ fontSize: 11.5 }}>Base UFCStats</TextoSuave>
        </View>
        <View style={{ gap: 12 }}>
          {metricas.map((m) => (
            <BarraMetrica key={m.rotulo} rotulo={m.rotulo} a={m.va} b={m.vb} textoA={m.fa} textoB={m.fb} />
          ))}
        </View>
        <TextoSuave estilo={{ fontSize: 11.5, marginTop: espaco.m }}>
          A barra mostra a proporção de cada lado na soma — não indica quem é "melhor" (em golpes sofridos e
          inatividade, menor costuma ser melhor).
        </TextoSuave>
      </CartaoVidro>

      <CartaoVidro estilo={{ padding: 0 }}>
        {linhasTexto.map(([rotulo, f], i) => (
          <View key={rotulo} style={[st.tabLinha, i % 2 === 1 && { backgroundColor: "rgba(255,255,255,0.03)" }]}>
            <Text style={[st.tabNum, { textAlign: "left", color: cores.vermelhoClaro, fontFamily: fontes.semi }]}>{f(a)}</Text>
            <Text style={[st.tabRotulo, s.suave, { textAlign: "center", fontSize: 12 }]}>{rotulo}</Text>
            <Text style={[st.tabNum, { color: cores.azulClaro, fontFamily: fontes.semi }]}>{f(b)}</Text>
          </View>
        ))}
        <View style={{ padding: espaco.m, gap: 6 }}>
          <TextoSuave estilo={{ fontSize: 11.5 }}>
            Estatísticas do UFC: UFCStats. Cartel no MMA: ESPN (todas as organizações). Poucos minutos analisados tornam as
            médias pouco confiáveis.
          </TextoSuave>
          {comFora.map((l) => (
            <TextoSuave key={l.nome} estilo={{ fontSize: 11.5 }}>
              * {l.nome}: médias fora do UFC em {l.medias_fora_ufc!.lutas_com_estatisticas} luta(s) com estatísticas na ESPN (
              {num(l.medias_fora_ufc!.minutos_com_estatisticas, 1)} min): {[...new Set(l.medias_fora_ufc!.eventos)].join("; ")}.
              Nível de adversário diferente do UFC.
            </TextoSuave>
          ))}
        </View>
      </CartaoVidro>
    </>
  );
}

const st = StyleSheet.create({
  iconeBloco: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tituloBloco: { color: cores.texto, fontFamily: fontes.negrito, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  chipVersao: { backgroundColor: "rgba(31,41,55,0.8)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipVersaoTexto: { color: cores.textoSuave, fontFamily: fontes.medio, fontSize: 11 },
  vsCirculo: {
    width: 34,
    height: 34,
    borderRadius: 34,
    backgroundColor: translucido(cores.vermelho, 0.2),
    borderWidth: 1,
    borderColor: translucido(cores.vermelho, 0.3),
    alignItems: "center",
    justifyContent: "center",
  },
  vsTexto: { color: cores.vermelhoClaro, fontFamily: fontes.luta, fontSize: 12 },
  faceInfo: { color: cores.textoApagado, fontFamily: fontes.semi, fontSize: 11, marginTop: 6, textAlign: "center", maxWidth: 80 },
  cartel: { color: cores.verdeClaro, fontFamily: fontes.semi, fontSize: 12, marginTop: 2 },
  forma: { width: 20, height: 18, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  formaTexto: { color: "#fff", fontSize: 10, fontFamily: fontes.negrito },
  numeroGrande: { color: cores.texto, fontFamily: fontes.luta, fontSize: 22 },
  legenda: { fontFamily: fontes.semi, fontSize: 12, flex: 1 },
  miniTitulo: { color: cores.textoSuave, fontFamily: fontes.semi, fontSize: 12 },
  tileNumero: { fontFamily: fontes.luta, fontSize: 18, marginTop: 2 },
  tileNivel: { fontFamily: fontes.medio, fontSize: 11 },
  chipRounds: {
    color: cores.texto,
    fontFamily: fontes.negrito,
    fontSize: 12,
    backgroundColor: cores.cinzaEscuro,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  tabLinha: { flexDirection: "row", alignItems: "center", paddingHorizontal: espaco.m, paddingVertical: 10 },
  tabCabecalho: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  tabRotulo: { flex: 1.4, paddingHorizontal: 4 },
  tabNum: { flex: 1, textAlign: "right", color: cores.texto, fontSize: 13, paddingHorizontal: 4, fontFamily: fontes.regular },
  tabNumCaixa: { flex: 1, paddingHorizontal: 4 },
  oddCaixa: {
    flex: 1,
    backgroundColor: "#0B1511",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: translucido(cores.verde, 0.3),
    padding: 10,
    overflow: "hidden",
  },
  cantoEv: { position: "absolute", top: 0, right: 0, backgroundColor: cores.verde, paddingHorizontal: 6, borderBottomLeftRadius: 6 },
  cantoEvTexto: { color: "#000", fontFamily: fontes.extra, fontSize: 11 },
  oddNome: { fontFamily: fontes.semi, fontSize: 12.5 },
  oddValor: { color: cores.texto, fontFamily: fontes.luta, fontSize: 19 },
  oddRodape: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: cores.cinzaEscuro, gap: 2 },
  leitura: { fontFamily: fontes.semi, fontSize: 11.5 },
});
