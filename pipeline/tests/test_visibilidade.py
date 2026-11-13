"""Testes da regra "o evento só sai do app 24h depois de terminar" e do congelamento das previsões."""
import json
from datetime import date, datetime, timezone

from ufc_pipeline import atualizar, proximos


def utc(*args):
    return datetime(*args, tzinfo=timezone.utc)


def evento_bruto(inicio="2026-11-14T22:00Z", blocos=("2026-11-14T22:00Z", "2026-11-15T01:00Z", "2026-11-15T03:00Z")):
    comps = []
    for i, d in enumerate(blocos):
        comps.append({
            "id": f"c{i}", "date": d, "type": {"abbreviation": "Lightweight"},
            "status": {"type": {"name": "STATUS_SCHEDULED", "completed": False}},
            "competitors": [{"order": 1, "id": "1", "athlete": {"displayName": "A A"}},
                            {"order": 2, "id": "2", "athlete": {"displayName": "B B"}}],
        })
    return {"id": "e1", "name": "UFC Teste", "date": inicio, "status": {"type": {"name": "STATUS_SCHEDULED"}},
            "competitions": comps}


def test_fim_estimado_usa_ultimo_bloco_mais_4h():
    assert proximos.fim_estimado(evento_bruto()) == utc(2026, 11, 15, 7, 0)


def test_fight_night_nao_some_durante_o_card():
    """O bug original: a atualização das ~00h10 UTC já via o 'dia seguinte' e descartava o evento."""
    ev = proximos.converter_evento(evento_bruto(), {})
    assert proximos.evento_ainda_visivel(ev, utc(2026, 11, 15, 0, 10))  # durante o card
    assert proximos.evento_ainda_visivel(ev, utc(2026, 11, 16, 6, 59))  # 23h59 depois do fim estimado
    assert not proximos.evento_ainda_visivel(ev, utc(2026, 11, 16, 7, 1))  # mais de 24h depois


def test_evento_sem_data_de_fim_continua_visivel():
    assert proximos.evento_ainda_visivel({"fim_estimado": None}, utc(2030, 1, 1))


def test_busca_inclui_ultimos_dias():
    urls = []
    proximos.buscar_eventos_brutos(lambda u: urls.append(u) or {"events": []}, date(2026, 11, 15))
    assert "dates=20261112-" in urls[0]


def test_vencedor_da_luta_encerrada():
    bruto = evento_bruto(blocos=("2026-11-15T03:00Z",))
    comp = bruto["competitions"][0]
    comp["status"]["type"] = {"name": "STATUS_FINAL", "completed": True}
    comp["competitors"][1]["winner"] = True
    assert proximos.converter_evento(bruto, {})["lutas"][0]["vencedor"] == "b"
    comp["competitors"][1]["winner"] = False
    assert proximos.converter_evento(bruto, {})["lutas"][0]["vencedor"] == "nenhum"
    comp["status"]["type"] = {"name": "STATUS_SCHEDULED", "completed": False}
    assert proximos.converter_evento(bruto, {})["lutas"][0]["vencedor"] is None


def test_congelar_previsoes_usa_a_registrada_antes_do_inicio(tmp_path):
    registro = tmp_path / "registro.json"
    registro.write_text(json.dumps({"l1": {"previsao": {"a": {"vitoria": {"prob": 0.61}}}}}), encoding="utf-8")
    recalculada = {"a": {"vitoria": {"prob": 0.99}}}
    iniciado = {"data": "2026-11-14T22:00Z", "lutas": [
        {"id": "l1", "previsao": recalculada, "previsao_possivel": True, "avisos": []},
        {"id": "l2", "previsao": recalculada, "previsao_possivel": True, "avisos": []},
    ]}
    futuro = {"data": "2026-12-01T22:00Z", "lutas": [{"id": "l3", "previsao": recalculada, "previsao_possivel": True}]}
    atualizar.congelar_previsoes([iniciado, futuro], registro, utc(2026, 11, 15, 1, 0))
    assert iniciado["lutas"][0]["previsao"]["a"]["vitoria"]["prob"] == 0.61  # a registrada, não a recalculada
    assert iniciado["lutas"][1]["previsao"] is None  # sem registro: nada de previsão "depois do fato"
    assert iniciado["lutas"][1]["avisos"]
    assert futuro["lutas"][0]["previsao"] is recalculada  # evento futuro: segue normal
