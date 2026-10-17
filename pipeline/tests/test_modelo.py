"""Testes do modelo. Todo o histórico aqui é SINTÉTICO (gerado aleatoriamente), só para testar o código."""
import copy
import json
import math
import random
from datetime import date, datetime, timedelta, timezone

import pytest

from ufc_pipeline import atualizar, estatisticas, modelo


def test_x_de_y_e_tempo():
    assert estatisticas.x_de_y("15 of 22") == (15, 22)
    assert estatisticas.x_de_y("") == (0, 0)
    assert estatisticas.mmss("2:46") == 166
    assert estatisticas.mmss("--") == 0


@pytest.mark.parametrize("rnd,tempo,formato,esperado", [
    ("3", "2:00", "3 Rnd (5-5-5)", 720),
    ("1", "4:10", "No Time Limit", 250),
    ("2", "1:00", "1 Rnd + OT (12-3)", 780),
    ("4", "0:30", "5 Rnd (5-5-5-5-5)", 930),
    ("2", "1:00", "formato estranho", 360),
    ("x", "1:00", "3 Rnd (5-5-5)", None),
])
def test_duracao(rnd, tempo, formato, esperado):
    assert estatisticas.duracao_segundos(rnd, tempo, formato) == esperado


def test_ler_estatisticas_soma_rounds(tmp_path):
    p = tmp_path / "s.csv"
    p.write_text(
        "EVENT,BOUT,ROUND,FIGHTER,KD,SIG.STR.,SIG.STR. %,TOTAL STR.,TD,TD %,SUB.ATT,REV.,CTRL,HEAD,BODY,LEG,DISTANCE,CLINCH,GROUND\n"
        "Ev,Ana Silva vs. Bia Souza,Round 1,Ana Silva,1,10 of 20,,,1 of 2,,0.0,0,1:30,,,,,,\n"
        "Ev,Ana Silva vs. Bia Souza,Round 2,Ana Silva,0,5 of 10,,,0 of 1,,2,0,--,,,,,,\n"
        "Ev,Ana Silva vs. Bia Souza,,,,,,,,,,,,,,,,,\n",
        encoding="utf-8")
    s = estatisticas.ler_estatisticas(p)[("Ev", "ana silva vs bia souza")]["ana silva"]
    assert s == {"sig_l": 15, "sig_a": 30, "td_l": 1, "td_a": 3, "ctrl": 90, "sub": 2, "kd": 1}


def test_ler_perfis(tmp_path):
    p = tmp_path / "t.csv"
    p.write_text('FIGHTER,HEIGHT,WEIGHT,REACH,STANCE,DOB,URL\n'
                 'Ana Silva,--,,"66""",,"Jul 13, 1995",u\nRepetido,--,,--,,--,u\nRepetido,--,,--,,--,u\n',
                 encoding="utf-8")
    perfis = estatisticas.ler_perfis(p)
    assert perfis == {"ana silva": {"nascimento": date(1995, 7, 13), "envergadura": 66.0}}


def test_normalizar_divisao():
    assert modelo.normalizar_divisao("UFC Women's Flyweight Title Bout") == "w flyweight"
    assert modelo.normalizar_divisao("W Flyweight") == "w flyweight"  # formato da ESPN
    assert modelo.normalizar_divisao("Light Heavyweight Bout") == "light heavyweight"
    assert modelo.normalizar_divisao("Heavyweight") == "heavyweight"
    assert modelo.normalizar_divisao("Catch Weight Bout") == "*"


def test_resolver_sistema():
    x = modelo.resolver_sistema([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0])
    assert x == pytest.approx([0.8, 1.4])


def test_logistica_recupera_sinal():
    rnd = random.Random(1)
    xs, ys = [], []
    for _ in range(2000):
        x = [rnd.gauss(0, 1), rnd.gauss(0, 1)]
        ys.append(1 if rnd.random() < 1 / (1 + math.exp(-(1.5 * x[0] - 0.5 * x[1]))) else 0)
        xs.append(x)
    w = modelo.treinar_logistica(xs, ys, penalidade=1.0)
    assert w[0] == pytest.approx(1.5, abs=0.2) and w[1] == pytest.approx(-0.5, abs=0.2)


# ---------------------------------------------------------------- histórico sintético

def historico_sintetico(n_atletas=80, n_lutas=2400, semente=7):
    rnd = random.Random(semente)
    habilidade = {f"Atleta {i:03d}": rnd.gauss(0, 1) for i in range(n_atletas)}
    nomes = list(habilidade)
    lutas, inicio = [], date(2018, 1, 6)
    for i in range(n_lutas):
        a, b = rnd.sample(nomes, 2)
        p_a = 1 / (1 + math.exp(-1.2 * (habilidade[a] - habilidade[b])))
        res = "A" if rnd.random() < p_a else "B"
        venc = a if res == "A" else b
        metodo = rnd.choices(["KO/TKO", "FINALIZACAO", "DECISAO"],
                             weights=[3 if habilidade[venc] > 0.5 else 1, 1, 2])[0]

        def golpes(nome):
            base = max(1, int(40 + 15 * habilidade[nome] + rnd.gauss(0, 8)))
            return {"sig_l": base, "sig_a": base * 2, "td_l": 1, "td_a": 3, "ctrl": 60, "sub": 0, "kd": 0}

        lutas.append({
            "data": inicio + timedelta(days=7 * (i // 6)),  # 6 lutas por "evento" semanal (até ~2025)
            "evento": f"Evento {i // 6}", "lutador_a": a, "lutador_b": b, "resultado": res,
            "metodo": metodo, "metodo_original": metodo, "round": "3", "tempo": "5:00",
            "formato": "3 Rnd (5-5-5)", "categoria": "Lightweight Bout", "url": "",
            "stats": {"A": golpes(a), "B": golpes(b)},
        })
    return lutas, habilidade


@pytest.fixture(scope="module")
def treinado():
    lutas, habilidade = historico_sintetico()
    rel, m = modelo.validar_e_treinar(lutas, {}, date(2021, 1, 1), date(2022, 1, 1))
    return rel, m, habilidade


def test_modelo_aprende_em_dados_sinteticos(treinado):
    rel, _, _ = treinado
    t = rel["teste"]
    assert t["modelo"]["n"] > 100
    assert t["modelo"]["acuracia"] > 0.6
    assert t["modelo"]["log_loss"] < t["moeda_50_50"]["log_loss"]
    assert t["moeda_50_50"]["acuracia"] == 0.5  # 50% conta meio acerto
    assert t["metodo_dado_vencedor"]["log_loss_modelo"] <= t["metodo_dado_vencedor"]["log_loss_media_da_divisao"] + 0.01


def test_previsao_consistente(treinado):
    _, m, habilidade = treinado
    forte, fraco = max(habilidade, key=habilidade.get), min(habilidade, key=habilidade.get)
    p = modelo.prever(m, forte, fraco, "Lightweight", date(2030, 1, 1))
    assert p["a"]["vitoria"]["prob"] > 0.7
    assert p["a"]["vitoria"]["prob"] + p["b"]["vitoria"]["prob"] == pytest.approx(1, abs=1e-3)
    for lado in "ab":
        soma = sum(p[lado][k]["prob"] for k in ("ko_tko", "finalizacao", "decisao"))
        assert soma == pytest.approx(p[lado]["vitoria"]["prob"], abs=1e-3)
        for v in p[lado].values():
            assert v["odd_justa"] == pytest.approx(1 / v["prob"], rel=1e-2)
    invertido = modelo.prever(m, fraco, forte, "Lightweight", date(2030, 1, 1))
    assert invertido["b"]["vitoria"]["prob"] == pytest.approx(p["a"]["vitoria"]["prob"], abs=1e-4)


def test_sem_vazamento_do_futuro():
    """Mudar resultados de lutas futuras (ou do mesmo dia) não pode alterar as variáveis de uma luta."""
    lutas, _ = historico_sintetico(n_lutas=600)
    modelo.preparar_lutas(lutas)
    pr = modelo.calcular_priors(lutas)
    corte = lutas[300]["data"]
    alteradas = copy.deepcopy(lutas)
    for l in alteradas:
        if l["data"] >= corte:
            l["resultado"] = "B" if l["resultado"] == "A" else "A"
            l["stats"]["A"]["sig_l"] += 50
    orig, _ = modelo.gerar_amostras(lutas, {}, pr, 48)
    alt, _ = modelo.gerar_amostras(alteradas, {}, pr, 48)
    for a, b in zip(orig, alt):
        if a["data"] <= corte:
            assert a["x"] == b["x"]
    assert any(a["x"] != b["x"] for a, b in zip(orig, alt) if a["data"] > corte)


def test_priors_ignoram_periodo_de_teste():
    lutas, _ = historico_sintetico(n_lutas=600)
    modelo.preparar_lutas(lutas)
    corte = lutas[300]["data"]
    antes = modelo.calcular_priors(lutas, corte)
    for l in lutas:
        if l["data"] >= corte:
            l["stats"]["A"]["sig_l"] *= 10
    assert modelo.calcular_priors(lutas, corte) == antes


def test_registro_nao_altera_previsao_apos_inicio_do_evento(tmp_path):
    caminho = tmp_path / "registro.json"
    ev = {"id": "e", "nome": "Ev", "data": "2026-10-17T21:00Z", "lutas": [{
        "id": "l1", "categoria": "Lightweight", "lutador_a": {"nome": "A"}, "lutador_b": {"nome": "B"},
        "previsao": {"a": {"vitoria": {"prob": 0.6}}}}]}
    antes = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)
    atualizar.registrar_previsoes(caminho, [ev], antes)
    ev["lutas"][0]["previsao"] = {"a": {"vitoria": {"prob": 0.9}}}
    atualizar.registrar_previsoes(caminho, [ev], datetime(2026, 10, 17, 22, tzinfo=timezone.utc))
    reg = json.loads(caminho.read_text(encoding="utf-8"))
    assert reg["l1"]["previsao"]["a"]["vitoria"]["prob"] == 0.6
    assert reg["l1"]["previsto_em"] == antes.isoformat()


def test_preencher_resultados_casa_nomes_e_data():
    registro = {
        "l1": {"lutador_a": "José Aldo", "lutador_b": "Max Holloway", "data_evento": "2026-10-18T00:00Z",
               "resultado_real": None},
        "l2": {"lutador_a": "Ana Silva", "lutador_b": "Bia Souza", "data_evento": "2026-10-18T00:00Z",
               "resultado_real": None},
    }
    # No UFCStats a ordem dos nomes pode ser outra e a data vem sem fuso (aqui, um dia antes).
    historico = [{"data": date(2026, 10, 17), "lutador_a": "Max Holloway", "lutador_b": "Jose Aldo",
                  "resultado": "A", "metodo": "KO/TKO", "metodo_original": "KO/TKO", "round": "2"},
                 {"data": date(2025, 1, 1), "lutador_a": "Ana Silva", "lutador_b": "Bia Souza",
                  "resultado": "A", "metodo": "DECISAO", "metodo_original": "Decision", "round": "3"}]
    assert atualizar.preencher_resultados(registro, historico) == 1
    assert registro["l1"]["resultado_real"]["vencedor"] == "b"
    assert registro["l1"]["resultado_real"]["metodo"] == "KO/TKO"
    assert registro["l2"]["resultado_real"] is None  # luta antiga entre os mesmos atletas não conta
