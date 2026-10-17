import { ScrollView, StyleSheet, Text, View } from "react-native";

import { combinacoes, comoTermina, confianca, resultadoMaisProvavel } from "../combinacoes";
import { Aviso, BarraProbabilidade, Cabecalho, Cartao, Subtitulo, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { categoria, dataEvento, dataHora, dataSimples, num, odd, pct } from "../formatar";
import type { Navegacao } from "../navegacao";
import { leituraValor, margemCasa, probCasaSemMargem, valorEstimado } from "../odds";
import { cores, espaco } from "../tema";
import type { Lutador, OddsCasa, Previsao, PrevisaoLado } from "../tipos";

export function TelaConfronto({ nav, eventoId, lutaId }: { nav: Navegacao; eventoId: string; lutaId: string }) {
  const { dados } = useDados();
  const ev = dados.eventos.eventos.find((e) => e.id === eventoId);
  const luta = ev?.lutas.find((l) => l.id === lutaId);
  if (!ev || !luta) {
    return (
      <View style={{ flex: 1 }}>
        <Cabecalho titulo="Confronto" voltar={nav.voltar} />
        <View style={s.conteudo}>
          <Aviso>Esta luta não está mais nos dados atuais (pode ter sido cancelada ou alterada).</Aviso>
        </View>
      </View>
    );
  }
  const { lutador_a: a, lutador_b: b, previsao } = luta;

  return (
    <View style={{ flex: 1 }}>
      <Cabecalho titulo={`${a.nome} vs ${b.nome}`} subtitulo={`${categoria(luta.categoria)} · ${ev.nome}`} voltar={nav.voltar} />
      <ScrollView contentContainerStyle={s.conteudo}>
        <TextoSuave>{dataEvento(ev.data)}</TextoSuave>
        <View style={[s.linha, { gap: espaco.m }]}>
          <CartaoLutador l={a} cor={cores.vermelho} />
          <CartaoLutador l={b} cor={cores.azul} />
        </View>

        {previsao ? (
          <BlocoPrevisao p={previsao} a={a.nome} b={b.nome} />
        ) : (
          <>
            <Subtitulo>Previsão</Subtitulo>
            <Aviso>
              Sem previsão para esta luta. O modelo só calcula probabilidades quando há dados suficientes dos dois
              atletas.{luta.avisos.length ? "\n\n• " + luta.avisos.join("\n• ") : ""}
            </Aviso>
          </>
        )}

        {luta.odds_casa ? (
          <BlocoOdds o={luta.odds_casa} p={previsao} a={a.nome} b={b.nome} />
        ) : (
          <>
            <Subtitulo>Odds da casa</Subtitulo>
            <TextoSuave>
              Nenhuma casa publicou odds desta luta na ESPN até a última atualização. Elas costumam aparecer perto do
              evento.
            </TextoSuave>
          </>
        )}

        <Subtitulo>Comparação</Subtitulo>
        <Comparacao a={a} b={b} />
      </ScrollView>
    </View>
  );
}

function CartaoLutador({ l, cor }: { l: Lutador; cor: string }) {
  const h = l.historico_ufc;
  return (
    <Cartao estilo={{ flex: 1, borderTopWidth: 4, borderTopColor: cor }}>
      <Text style={[s.forte, { fontSize: 16 }]}>{l.nome}</Text>
      {l.pais && <TextoSuave>{l.pais}</TextoSuave>}
      <TextoSuave estilo={{ marginTop: espaco.s }}>
        Cartel no MMA: {l.carreira_mma?.cartel ?? l.cartel_espn ?? "—"}
      </TextoSuave>
      {l.carreira_mma && l.carreira_mma.vitorias > 0 && (
        <TextoSuave>
          Vitórias: {l.carreira_mma.vitorias_por_metodo.ko_tko} KO/TKO · {l.carreira_mma.vitorias_por_metodo.finalizacao}{" "}
          fin. · {l.carreira_mma.vitorias_por_metodo.decisao_ou_outro} dec./outro
        </TextoSuave>
      )}
      <TextoSuave>
        No UFC: {h ? `${h.vitorias}-${h.derrotas}${h.empates ? `-${h.empates}` : ""}` : "sem lutas registradas"}
      </TextoSuave>
      {h && h.ultimos_5.length > 0 && (
        <View style={{ flexDirection: "row", gap: 4, marginTop: espaco.s, flexWrap: "wrap" }}>
          {h.ultimos_5.map((r, i) => (
            <View key={i} style={[st.forma, { backgroundColor: COR_RESULTADO[r] ?? cores.cartaoAlt }]}>
              <Text style={st.formaTexto}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </Cartao>
  );
}

const COR_RESULTADO: Record<string, string> = { V: "#1F7A4D", D: "#8A2A2A", E: "#555B66", SR: "#555B66" };

function BlocoPrevisao({ p, a, b }: { p: Previsao; a: string; b: string }) {
  const linhas: [string, "vitoria" | "ko_tko" | "finalizacao" | "decisao"][] = [
    ["KO/TKO", "ko_tko"],
    ["Finalização", "finalizacao"],
    ["Decisão", "decisao"],
    ["Vitória (total)", "vitoria"],
  ];
  const maisProvavel = resultadoMaisProvavel(p, a, b);
  const conf = confianca(p.a.vitoria.prob);
  return (
    <>
      <Subtitulo>Probabilidade de vitória</Subtitulo>
      <BarraProbabilidade pa={p.a.vitoria.prob} alta />
      <View style={s.linha}>
        <TextoSuave estilo={{ color: cores.vermelho }}>{a}</TextoSuave>
        <TextoSuave estilo={{ color: cores.azul }}>{b}</TextoSuave>
      </View>

      <Subtitulo>Método de vitória e odd justa</Subtitulo>
      <Cartao estilo={{ padding: 0 }}>
        <View style={[st.tabLinha, st.tabCabecalho]}>
          <Text style={[st.tabCelula, st.tabRotulo, s.suave]}>Resultado</Text>
          <Text style={[st.tabCelula, st.tabNum, { color: cores.vermelho }]}>{a.split(" ").slice(-1)}</Text>
          <Text style={[st.tabCelula, st.tabNum, { color: cores.azul }]}>{b.split(" ").slice(-1)}</Text>
        </View>
        {linhas.map(([rotulo, chave]) => (
          <View key={chave} style={[st.tabLinha, chave === "vitoria" && { backgroundColor: cores.cartaoAlt }]}>
            <Text style={[st.tabCelula, st.tabRotulo, s.texto, chave === "vitoria" && { fontWeight: "700" }]}>
              {rotulo}
            </Text>
            {(["a", "b"] as const).map((lado) => (
              <View key={lado} style={[st.tabCelula, st.tabNum]}>
                <Text style={[s.forte, { textAlign: "right" }]}>{pct(p[lado][chave].prob)}</Text>
                <TextoSuave estilo={{ textAlign: "right" }}>odd {odd(p[lado][chave].odd_justa)}</TextoSuave>
              </View>
            ))}
          </View>
        ))}
      </Cartao>
      <Cartao estilo={{ gap: espaco.xs }}>
        <TextoSuave>Resultado individual mais provável</TextoSuave>
        <Text style={[s.forte, { fontSize: 16 }]}>
          {maisProvavel.nome} por {maisProvavel.metodo} · {pct(maisProvavel.prob)}
          <Text style={s.suave}> (odd justa {odd(1 / maisProvavel.prob)})</Text>
        </Text>
        <TextoSuave>
          Previsão do vencedor: {conf.texto.toLowerCase()} ({pct(Math.max(p.a.vitoria.prob, p.b.vitoria.prob))}).
        </TextoSuave>
      </Cartao>

      <Subtitulo>Métodos combinados</Subtitulo>
      <TextoSuave>
        Soma de dois métodos do mesmo lutador (ex.: "vence por KO/TKO ou decisão"). Destaque = combinação mais provável
        daquele lutador.
      </TextoSuave>
      <CombinacoesLutador nome={a} lado={p.a} cor={cores.vermelho} />
      <CombinacoesLutador nome={b} lado={p.b} cor={cores.azul} />

      <Subtitulo>Como a luta termina</Subtitulo>
      <Cartao estilo={{ padding: 0 }}>
        {comoTermina(p).map((o, i) => (
          <View key={o.rotulo} style={[st.tabLinha, i % 2 === 1 && { backgroundColor: cores.cartaoAlt }]}>
            <Text style={[st.tabCelula, st.tabRotulo, s.texto, { flex: 2.4 }]}>{o.rotulo}</Text>
            <View style={[st.tabCelula, st.tabNum]}>
              <Text style={[s.forte, { textAlign: "right" }]}>{pct(o.prob)}</Text>
              <TextoSuave estilo={{ textAlign: "right" }}>odd {odd(o.odd)}</TextoSuave>
            </View>
          </View>
        ))}
      </Cartao>

      <Aviso tipo="info">
        Probabilidades estimadas por um modelo estatístico (Elo + regressão logística) a partir do histórico. A odd
        justa é 1 ÷ probabilidade: não é cotação de casa de apostas, não é recomendação de aposta e não garante nenhum
        resultado. O modelo acerta o vencedor bem melhor do que o método; combinações de método são menos confiáveis.
        Empates, DQ e lutas sem resultado não estão incluídos.
      </Aviso>
    </>
  );
}

function CombinacoesLutador({ nome, lado, cor }: { nome: string; lado: PrevisaoLado; cor: string }) {
  const lista = combinacoes(lado);
  return (
    <Cartao estilo={{ padding: 0, borderLeftWidth: 4, borderLeftColor: cor }}>
      <View style={[st.tabLinha, st.tabCabecalho]}>
        <Text style={[s.forte, { color: cor }]}>{nome} vence por…</Text>
      </View>
      {lista.map((o, i) => (
        <View key={o.rotulo} style={[st.tabLinha, i === 0 && { backgroundColor: cores.cartaoAlt }]}>
          <View style={[st.tabCelula, { flex: 2.4 }]}>
            <Text style={[s.texto, i === 0 && { fontWeight: "700" }]}>{o.rotulo}</Text>
            {i === 0 && <Text style={{ color: cor, fontSize: 12, fontWeight: "700" }}>MAIS PROVÁVEL</Text>}
          </View>
          <View style={[st.tabCelula, st.tabNum]}>
            <Text style={[s.forte, { textAlign: "right" }]}>{pct(o.prob)}</Text>
            <TextoSuave estilo={{ textAlign: "right" }}>odd {odd(o.odd)}</TextoSuave>
          </View>
        </View>
      ))}
    </Cartao>
  );
}

function BlocoOdds({ o, p, a, b }: { o: OddsCasa; p: Previsao | null; a: string; b: string }) {
  const margem = margemCasa(o);
  const lados = [
    { lado: "a" as const, nome: a, cor: cores.vermelho },
    { lado: "b" as const, nome: b, cor: cores.azul },
  ];
  return (
    <>
      <Subtitulo>Odds da casa ({o.casa ?? "casa não informada"})</Subtitulo>
      <Cartao estilo={{ padding: 0 }}>
        {lados.map(({ lado, nome, cor }, i) => {
          const oc = o[lado];
          const pModelo = p ? p[lado].vitoria.prob : null;
          const valor = pModelo != null ? valorEstimado(pModelo, oc.atual) : null;
          const leitura = leituraValor(valor);
          return (
            <View key={lado} style={[st.blocoOdd, i === 1 && { borderTopWidth: 1, borderTopColor: cores.borda }]}>
              <Text style={[s.forte, { color: cor }]}>{nome} vence</Text>
              <View style={[s.linha, { marginTop: espaco.xs }]}>
                <View>
                  <TextoSuave>Odd da casa</TextoSuave>
                  <Text style={[s.forte, { fontSize: 20 }]}>{odd(oc.atual)}</Text>
                  {oc.abertura != null && oc.abertura !== oc.atual && (
                    <TextoSuave>abriu em {odd(oc.abertura)}</TextoSuave>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <TextoSuave>Casa (sem margem): {pct(probCasaSemMargem(o, lado))}</TextoSuave>
                  <TextoSuave>
                    Modelo: {pModelo != null ? `${pct(pModelo)} · odd justa ${odd(1 / pModelo)}` : "sem previsão"}
                  </TextoSuave>
                </View>
              </View>
              {leitura && (
                <Text style={{ color: COR_LEITURA[leitura], fontWeight: "700", marginTop: espaco.s }}>
                  {TEXTO_LEITURA[leitura]} ({valor! >= 0 ? "+" : ""}
                  {pct(valor!)} de valor estimado pelo modelo)
                </Text>
              )}
            </View>
          );
        })}
      </Cartao>
      {o.total_rounds && (
        <TextoSuave>
          Total de rounds: mais de {num(o.total_rounds.linha, 1)} a {odd(o.total_rounds.mais)} · menos de{" "}
          {num(o.total_rounds.linha, 1)} a {odd(o.total_rounds.menos)} (o modelo não estima rounds).
        </TextoSuave>
      )}
      <Aviso tipo="info">
        Odds consultadas em {dataHora(o.consultado_em)} via ESPN e podem ter mudado. Margem da casa: {pct(margem)}.
        "Valor estimado" só existe se a probabilidade do modelo estiver correta; o modelo nunca foi testado contra odds
        reais, então isto não é recomendação de aposta nem garantia de lucro.
      </Aviso>
    </>
  );
}

const COR_LEITURA = { acima: cores.sucesso, proxima: cores.textoSuave, abaixo: cores.erro };
const TEXTO_LEITURA = {
  acima: "Odd da casa acima da odd justa",
  proxima: "Odd da casa próxima da odd justa",
  abaixo: "Odd da casa abaixo da odd justa",
};

type Linha = [string, (l: Lutador) => string];

/** Usa a estatística do UFC; se não houver, a média fora do UFC (ESPN), marcada com "*". */
function stat(l: Lutador, campo: "golpes_sig_por_min" | "precisao_golpes" | "quedas_por_15min" | "precisao_quedas",
              formato: (x: number) => string): string {
  const doUfc = l.estatisticas?.[campo];
  if (doUfc != null && (l.estatisticas?.minutos_com_estatisticas ?? 0) > 0) return formato(doUfc);
  const fora = l.medias_fora_ufc?.[campo];
  return fora != null ? `${formato(fora)}*` : "—";
}

const LINHAS: Linha[] = [
  ["Elo (força estimada)", (l) => (l.estatisticas ? String(l.estatisticas.elo) : "—")],
  ["Lutas no UFC", (l) => (l.historico_ufc ? String(l.historico_ufc.lutas) : "0")],
  ["Vitórias por KO/TKO", (l) => String(l.historico_ufc?.vitorias_por_metodo["KO/TKO"] ?? "—")],
  ["Vitórias por finalização", (l) => String(l.historico_ufc?.vitorias_por_metodo.FINALIZACAO ?? "—")],
  ["Vitórias por decisão", (l) => String(l.historico_ufc?.vitorias_por_metodo.DECISAO ?? "—")],
  ["Derrotas por KO/TKO", (l) => String(l.historico_ufc?.derrotas_por_metodo["KO/TKO"] ?? "—")],
  ["Derrotas por finalização", (l) => String(l.historico_ufc?.derrotas_por_metodo.FINALIZACAO ?? "—")],
  ["Cartel no MMA (todas as org.)", (l) => l.carreira_mma?.cartel ?? l.cartel_espn ?? "—"],
  ["Vitórias MMA por KO/TKO", (l) => String(l.carreira_mma?.vitorias_por_metodo.ko_tko ?? "—")],
  ["Vitórias MMA por finalização", (l) => String(l.carreira_mma?.vitorias_por_metodo.finalizacao ?? "—")],
  ["Vitórias MMA por dec./outro", (l) => String(l.carreira_mma?.vitorias_por_metodo.decisao_ou_outro ?? "—")],
  ["Golpes sig. acertados/min", (l) => stat(l, "golpes_sig_por_min", (x) => num(x))],
  ["Golpes sig. sofridos/min", (l) => num(l.estatisticas?.golpes_sig_sofridos_por_min)],
  ["Precisão de golpes", (l) => stat(l, "precisao_golpes", (x) => pct(x, 0))],
  ["Defesa de golpes", (l) => pct(l.estatisticas?.defesa_golpes, 0)],
  ["Quedas a cada 15 min", (l) => stat(l, "quedas_por_15min", (x) => num(x))],
  ["Precisão de quedas", (l) => stat(l, "precisao_quedas", (x) => pct(x, 0))],
  ["Defesa de quedas", (l) => pct(l.estatisticas?.defesa_quedas, 0)],
  ["Controle a cada 15 min", (l) => segundos(l.estatisticas?.controle_por_15min_s)],
  ["Tent. finalização/15 min", (l) => num(l.estatisticas?.tentativas_finalizacao_por_15min)],
  ["Idade", (l) => (l.estatisticas?.idade != null ? `${Math.floor(l.estatisticas.idade)} anos` : "—")],
  ["Envergadura", (l) => (l.estatisticas?.envergadura_cm ? `${l.estatisticas.envergadura_cm} cm` : "—")],
  ["Minutos analisados", (l) => num(l.estatisticas?.minutos_com_estatisticas, 0)],
  ["Última luta no UFC", (l) => dataSimples(l.historico_ufc?.ultima_luta)],
];

function segundos(x: number | null | undefined): string {
  if (x == null) return "—";
  const t = Math.round(x);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function Comparacao({ a, b }: { a: Lutador; b: Lutador }) {
  return (
    <Cartao estilo={{ padding: 0 }}>
      {LINHAS.map(([rotulo, f], i) => (
        <View key={rotulo} style={[st.tabLinha, i % 2 === 1 && { backgroundColor: cores.cartaoAlt }]}>
          <Text style={[st.tabCelula, st.tabNum, { textAlign: "left", color: cores.vermelho, fontWeight: "600" }]}>
            {f(a)}
          </Text>
          <Text style={[st.tabCelula, st.tabRotulo, s.suave, { textAlign: "center" }]}>{rotulo}</Text>
          <Text style={[st.tabCelula, st.tabNum, { color: cores.azul, fontWeight: "600" }]}>{f(b)}</Text>
        </View>
      ))}
      <View style={{ padding: espaco.m }}>
        <TextoSuave>
          Números brutos do histórico no UFC (fonte: UFCStats). Atletas com poucos minutos analisados têm médias pouco
          confiáveis. Cartel no MMA: ESPN, inclui outras organizações.
        </TextoSuave>
        {[a, b]
          .filter((l) => l.medias_fora_ufc && !(l.estatisticas?.minutos_com_estatisticas ?? 0))
          .map((l) => (
            <TextoSuave key={l.nome} estilo={{ marginTop: espaco.s }}>
              * {l.nome}: médias fora do UFC em {l.medias_fora_ufc!.lutas_com_estatisticas} luta(s) com estatísticas na
              ESPN ({l.medias_fora_ufc!.minutos_com_estatisticas.toString().replace(".", ",")} min):{" "}
              {[...new Set(l.medias_fora_ufc!.eventos)].join("; ")}. Nível de adversário diferente do UFC; poucas lutas
              tornam as médias instáveis.
            </TextoSuave>
          ))}
      </View>
    </Cartao>
  );
}

const st = StyleSheet.create({
  blocoOdd: { padding: espaco.m },
  forma: { width: 26, height: 22, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  formaTexto: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tabLinha: { flexDirection: "row", alignItems: "center", paddingHorizontal: espaco.m, paddingVertical: 10 },
  tabCabecalho: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  tabCelula: { paddingHorizontal: 4 },
  tabRotulo: { flex: 1.4 },
  tabNum: { flex: 1, textAlign: "right", color: cores.texto },
});
