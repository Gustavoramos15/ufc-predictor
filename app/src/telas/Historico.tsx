import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Aviso, CabecalhoTela, CartaoVidro, Pilula, TextoSuave, s } from "../componentes";
import { useDados } from "../dados";
import { dataSimples, num, pct, sobrenome } from "../formatar";
import { apostaSimulada, avaliar, Avaliacao, resumir, resumirApostas } from "../historico";
import { cores, espaco, fontes, translucido } from "../tema";
import type { PrevisaoRegistrada } from "../tipos";

type Filtro = "todas" | "resultado" | "valor" | "aguardando";

const COR_AVALIACAO: Record<Avaliacao, string> = {
  acertou: cores.verde,
  errou: cores.vermelho,
  sem_favorito: cores.textoApagado,
  nao_avaliavel: cores.textoApagado,
  aguardando: cores.ambar,
};

function unidades(u: number): string {
  return `${u >= 0 ? "+" : ""}${num(u, 2)}u`;
}

export function TelaHistorico() {
  const { dados, atualizando, atualizar } = useDados();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const lista = Object.values(dados.registro).sort((x, y) => y.data_evento.localeCompare(x.data_evento));
  const r = resumir(lista);
  const fav = resumirApostas(lista, "favorito");
  const val = resumirApostas(lista, "valor");

  const filtrada = lista.filter((p) => {
    if (filtro === "resultado") return !!p.resultado_real;
    if (filtro === "aguardando") return !p.resultado_real;
    if (filtro === "valor") return !!apostaSimulada(p, "valor");
    return true;
  });
  const nValor = lista.filter((p) => apostaSimulada(p, "valor")).length;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.texto} />}
    >
      <CabecalhoTela rotulo="Histórico de assertividade" titulo="Banca & resultados" />
      <View style={{ paddingHorizontal: espaco.l, gap: espaco.m, paddingTop: espaco.s }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Resumo
            titulo="Taxa de acerto"
            valor={r.avaliadas ? pct(r.acertos / r.avaliadas) : "—"}
            detalhe={r.avaliadas ? `${r.acertos}/${r.avaliadas} lutas` : "sem resultados"}
            cor={cores.verdeClaro}
          />
          <Resumo
            titulo="ROI favorito"
            valor={fav.roi != null ? `${fav.roi >= 0 ? "+" : ""}${pct(fav.roi)}` : "—"}
            detalhe={fav.apostas ? unidades(fav.unidades) : "sem odds+resultado"}
            cor={cores.azulClaro}
          />
          <Resumo
            titulo="+EV acertos"
            valor={val.apostas ? pct(val.acertos / val.apostas) : "—"}
            detalhe={val.apostas ? `${unidades(val.unidades)} em ${val.apostas}` : "sem resultados"}
            cor={cores.ambarClaro}
          />
        </View>

        <Aviso tipo="info">
          Simulação com 1 unidade por luta, usando a odd da casa guardada antes do evento. "ROI favorito" = apostar
          sempre no favorito do modelo; "+EV" = só quando a odd da casa estava 5% ou mais acima da odd justa. Empate e
          luta sem resultado devolvem a aposta. {r.avaliadas < 50 ? "Com poucas lutas, esses números variam muito por acaso. " : ""}
          Resultado passado não garante resultado futuro.
        </Aviso>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pilula texto={`Todas (${lista.length})`} ativa={filtro === "todas"} aoTocar={() => setFiltro("todas")} />
          <Pilula texto={`Com resultado (${lista.length - r.aguardando})`} ativa={filtro === "resultado"} aoTocar={() => setFiltro("resultado")} />
          <Pilula texto={`Apenas +EV (${nValor})`} ativa={filtro === "valor"} aoTocar={() => setFiltro("valor")} />
          <Pilula texto={`Aguardando (${r.aguardando})`} ativa={filtro === "aguardando"} aoTocar={() => setFiltro("aguardando")} />
        </ScrollView>

        {filtrada.length === 0 && <TextoSuave>Nenhuma previsão neste filtro.</TextoSuave>}
        {filtrada.map((p) => (
          <ItemHistorico key={`${p.evento_id}-${p.lutador_a}-${p.lutador_b}`} p={p} filtroValor={filtro === "valor"} />
        ))}
        <TextoSuave estilo={{ fontSize: 12 }}>
          Resultados reais vêm do UFCStats e costumam aparecer 1 ou 2 dias depois de cada evento.
        </TextoSuave>
      </View>
    </ScrollView>
  );
}

function Resumo({ titulo, valor, detalhe, cor }: { titulo: string; valor: string; detalhe: string; cor: string }) {
  return (
    <CartaoVidro estilo={{ flex: 1, padding: 10, alignItems: "center", borderLeftWidth: 2, borderLeftColor: cor }}>
      <TextoSuave estilo={{ fontSize: 11.5, textAlign: "center" }}>{titulo}</TextoSuave>
      <Text style={[st.numero, { color: cor }]}>{valor}</Text>
      <Text style={st.detalhe} numberOfLines={2}>
        {detalhe}
      </Text>
    </CartaoVidro>
  );
}

function ItemHistorico({ p, filtroValor }: { p: PrevisaoRegistrada; filtroValor: boolean }) {
  const av = avaliar(p);
  const pa = p.previsao.a.vitoria.prob;
  const fav = pa >= 0.5 ? p.lutador_a : p.lutador_b;
  const apostaFav = apostaSimulada(p, "favorito");
  const apostaVal = apostaSimulada(p, "valor");
  const aposta = filtroValor ? apostaVal : apostaFav;
  const res = p.resultado_real;
  const vencedor = res?.vencedor === "a" ? p.lutador_a : res?.vencedor === "b" ? p.lutador_b : null;
  const cor = COR_AVALIACAO[av];

  let selo: [string, string] | null = null;
  if (aposta && aposta.unidades != null) {
    selo = aposta.unidades > 0 ? [`GREEN (${unidades(aposta.unidades)})`, cores.verdeClaro]
      : aposta.unidades < 0 ? [`RED (${unidades(aposta.unidades)})`, cores.vermelhoClaro]
      : ["DEVOLVIDA (0u)", cores.textoSuave];
  } else if (av === "acertou") selo = ["ACERTOU", cores.verdeClaro];
  else if (av === "errou") selo = ["ERROU", cores.vermelhoClaro];
  else if (av === "aguardando") selo = ["AGUARDANDO", cores.ambarClaro];
  else selo = ["SEM AVALIAÇÃO", cores.textoSuave];

  return (
    <CartaoVidro estilo={[{ padding: 12, borderLeftWidth: 4, borderLeftColor: cor }, av === "errou" ? { opacity: 0.85 } : {}]}>
      <View style={[s.linha, { alignItems: "center" }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={[s.forte, { fontSize: 13 }]}>{p.lutador_a}</Text>
            <TextoSuave estilo={{ fontSize: 12 }}>vs {p.lutador_b}</TextoSuave>
            {apostaVal && <Text style={st.ev}>+EV</Text>}
          </View>
          <TextoSuave estilo={{ fontSize: 12, marginTop: 2 }}>
            Previsão: {sobrenome(fav)} ({pct(Math.max(pa, 1 - pa))})
            {aposta ? ` • Odd ${num(aposta.odd, 2)}` : ""}
            {vencedor && res ? ` • Venceu ${sobrenome(vencedor)} por ${res.metodo === "KO/TKO" ? "KO/TKO" : res.metodo === "FINALIZACAO" ? "finalização" : res.metodo === "DECISAO" ? "decisão" : "outro"}` : ""}
          </TextoSuave>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2, maxWidth: 130 }}>
          <View style={[st.selo, { backgroundColor: translucido(selo[1], 0.18) }]}>
            <Text style={[st.seloTexto, { color: selo[1] }]}>{selo[0]}</Text>
          </View>
          <Text style={st.evento} numberOfLines={1}>
            {dataSimples(p.data_evento)}
          </Text>
        </View>
      </View>
    </CartaoVidro>
  );
}

const st = StyleSheet.create({
  numero: { fontFamily: fontes.luta, fontSize: 19, marginTop: 2 },
  detalhe: { color: cores.textoApagado, fontFamily: fontes.regular, fontSize: 11, textAlign: "center" },
  ev: {
    color: cores.verdeClaro,
    backgroundColor: translucido(cores.verde, 0.15),
    fontFamily: fontes.negrito,
    fontSize: 11,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: "hidden",
  },
  selo: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  seloTexto: { fontFamily: fontes.negrito, fontSize: 11 },
  evento: { color: cores.textoApagado, fontFamily: fontes.regular, fontSize: 11 },
});
