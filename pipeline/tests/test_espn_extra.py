"""Testes da leitura dos dados extras da ESPN. Estruturas copiadas do formato real; números fictícios."""
from datetime import date, datetime, timezone

import pytest

from ufc_pipeline import espn_extra

AGORA = datetime(2026, 10, 17, tzinfo=timezone.utc)


def lado_odds(atleta_id, atual, abertura):
    return {
        "athlete": {"$ref": f"http://sports.core.api.espn.pvt/v2/sports/mma/athletes/{atleta_id}?lang=en"},
        "open": {"moneyLine": {"decimal": abertura}},
        "current": {"moneyLine": {"decimal": atual}},
    }


def test_https_troca_endereco_interno():
    assert espn_extra.https("http://sports.core.api.espn.pvt/v2/x") == "https://sports.core.api.espn.com/v2/x"


def test_converter_odds_casa_lados_pelo_id_do_atleta():
    bruto = {"items": [{
        "provider": {"name": "DraftKings", "priority": 1},
        "overUnder": 2.5,
        "current": {"over": {"decimal": 1.8}, "under": {"decimal": 2.0}},
        "homeAthleteOdds": lado_odds("222", 1.5, 1.6),
        "awayAthleteOdds": lado_odds("111", 2.6, 2.4),
    }]}
    o = espn_extra.converter_odds(bruto, "111", "222", AGORA)
    # "away" é o atleta 111, que no app é o lutador A
    assert o["a"] == {"atual": 2.6, "abertura": 2.4}
    assert o["b"] == {"atual": 1.5, "abertura": 1.6}
    assert o["casa"] == "DraftKings"
    assert o["total_rounds"] == {"linha": 2.5, "mais": 1.8, "menos": 2.0}


def test_converter_odds_sem_casar_atletas_retorna_none():
    bruto = {"items": [{"homeAthleteOdds": lado_odds("9", 1.5, 1.5), "awayAthleteOdds": lado_odds("8", 2.5, 2.5)}]}
    assert espn_extra.converter_odds(bruto, "111", "222", AGORA) is None
    assert espn_extra.converter_odds({"items": []}, "111", "222", AGORA) is None


def test_converter_registro():
    bruto = {"items": [{"name": "overall", "type": "total", "summary": "15-2-0", "stats": [
        {"name": "wins", "value": 15.0}, {"name": "losses", "value": 2.0}, {"name": "draws", "value": 0.0},
        {"name": "tkos", "value": 6.0}, {"name": "submissions", "value": 6.0},
        {"name": "tkoLosses", "value": 1.0}, {"name": "submissionLosses", "value": 0.0}]}]}
    r = espn_extra.converter_registro(bruto)
    assert r["cartel"] == "15-2-0"
    assert r["vitorias_por_metodo"] == {"ko_tko": 6, "finalizacao": 6, "decisao_ou_outro": 3}
    assert r["derrotas_por_metodo"] == {"ko_tko": 1, "finalizacao": 0, "decisao_ou_outro": 1}


def test_extrair_stats_ignora_lutas_sem_numeros():
    bruto = {"categories": [
        {"labels": ["SSL", "SSA", "KD"], "statistics": [
            {"uid": "s:3301~l:3321~e:1~c:100", "stats": ["46", "97", "1"]},
            {"uid": "s:3301~l:3359~e:2~c:200", "stats": ["-", "-", "-"]}]},
        {"labels": ["TDL", "TDA"], "statistics": [
            {"uid": "s:3301~l:3321~e:1~c:100", "stats": ["1", "4"]},
            {"uid": "s:3301~l:3359~e:2~c:200", "stats": ["-", "-"]}]},
    ]}
    s = espn_extra.extrair_stats_por_luta(bruto)
    assert s == {"100": {"sig_l": 46.0, "sig_a": 97.0, "kd": 1.0, "td_l": 1.0, "td_a": 4.0}}


def test_duracao_luta():
    assert espn_extra.duracao_luta({"period": 2, "displayClock": "1:06"}) == 366
    assert espn_extra.duracao_luta({"period": 3, "displayClock": "5:00"}) == 900
    assert espn_extra.duracao_luta({}) is None


def test_calcular_medias():
    m = espn_extra.calcular_medias([
        {"sig_l": 30, "sig_a": 60, "kd": 1, "td_l": 1, "td_a": 2, "segundos": 900, "evento": "DWCS"},
        {"sig_l": 10, "sig_a": 40, "kd": 0, "td_l": 0, "td_a": 2, "segundos": 300, "evento": "LFA"},
        {"sig_l": 99, "sig_a": 99, "segundos": None},  # sem duração: ignorada
    ])
    assert m["lutas_com_estatisticas"] == 2
    assert m["minutos_com_estatisticas"] == 20
    assert m["golpes_sig_por_min"] == pytest.approx(2.0)
    assert m["precisao_golpes"] == pytest.approx(0.4)
    assert m["quedas_por_15min"] == pytest.approx(0.75)
    assert m["precisao_quedas"] == pytest.approx(0.25)
    assert espn_extra.calcular_medias([]) is None


def test_buscar_medias_ignora_lutas_futuras_e_sem_stats():
    stats = {"categories": [{"labels": ["SSL", "SSA"], "statistics": [
        {"uid": "x~c:100", "stats": ["20", "40"]}, {"uid": "x~c:300", "stats": ["50", "50"]}]}]}
    log = {"events": {"items": [
        {"played": True, "competition": {"$ref": "http://h/events/1/competitions/100"}, "event": {"$ref": "http://h/e1"}},
        {"played": True, "competition": {"$ref": "http://h/events/2/competitions/200"}, "event": {"$ref": "http://h/e2"}},
        {"played": False, "competition": {"$ref": "http://h/events/3/competitions/300"}, "event": {"$ref": "http://h/e3"}},
    ]}}
    respostas = {
        espn_extra.URL_STATS.format(id="7"): stats,
        espn_extra.URL_EVENTLOG.format(id="7"): log,
        "https://h/events/1/competitions/100": {"date": "2026-08-18T23:00Z", "status": {"$ref": "http://h/s100"},
                                                 "format": {"regulation": {"clock": 300.0}}},
        "https://h/s100": {"period": 3, "displayClock": "5:00"},
        "https://h/e1": {"name": "Dana White's Contender Series"},
    }
    m = espn_extra.buscar_medias_fora_ufc(lambda u: respostas[u], "7", date(2026, 10, 17))
    assert m["lutas_com_estatisticas"] == 1
    assert m["eventos"] == ["Dana White's Contender Series"]
    assert m["golpes_sig_por_min"] == pytest.approx(20 / 15, abs=1e-3)
