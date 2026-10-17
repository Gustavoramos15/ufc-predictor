"""Testes do pipeline. Os nomes usados aqui são FICTÍCIOS e servem só para testar o código."""
import json
from datetime import date, datetime, timezone

import pytest

from ufc_pipeline import atualizar, historico, proximos
from ufc_pipeline.nomes import normalizar_nome

EVENTOS_CSV = (
    "EVENT,URL,DATE,LOCATION\n"
    'Evento Teste 2,http://x/2,"March 05, 2026","Cidade, Pais"\n'
    'Evento Teste 1,http://x/1,"January 10, 2026","Cidade, Pais"\n'
)
RESULTADOS_CSV = (
    "EVENT,BOUT,OUTCOME,WEIGHTCLASS,METHOD,ROUND,TIME,TIME FORMAT,REFEREE,DETAILS,URL\n"
    "Evento Teste 1 ,Ana Silva vs. Bia Souza,W/L,Flyweight Bout,KO/TKO ,1,1:00,3 Rnd,Ref,Punch,http://f/1\n"
    "Evento Teste 1 ,Caio Lima vs. Davi Rocha,L/W,Lightweight Bout,Submission ,2,2:00,3 Rnd,Ref,RNC,http://f/2\n"
    "Evento Teste 2 ,Bia Souza vs. Ana Silva,L/W,Flyweight Bout,Decision - Split ,3,5:00,3 Rnd,Ref,,http://f/3\n"
    "Evento Teste 2 ,Caio Lima vs. Davi Rocha,NC/NC,Lightweight Bout,Overturned ,1,3:00,3 Rnd,Ref,,http://f/4\n"
    "Evento Inexistente ,Eva vs. Fia,W/L,Flyweight Bout,KO/TKO ,1,1:00,3 Rnd,Ref,,http://f/5\n"
)
ATLETAS_CSV = "FIRST,LAST,NICKNAME,URL\nAna,Silva,,u1\nBia,Souza,,u2\nCaio,Lima,,u3\nCaio,Lima,,u4\nDavi,Rocha,,u5\n"


@pytest.fixture
def cache(tmp_path):
    pasta = tmp_path / "pipeline" / "cache"
    pasta.mkdir(parents=True)
    (pasta / "ufc_event_details.csv").write_text(EVENTOS_CSV, encoding="utf-8")
    (pasta / "ufc_fight_results.csv").write_text(RESULTADOS_CSV, encoding="utf-8")
    (pasta / "ufc_fighter_details.csv").write_text(ATLETAS_CSV, encoding="utf-8")
    return pasta


def test_normalizar_nome():
    assert normalizar_nome("Marc-André  Barriault") == "marc andre barriault"
    assert normalizar_nome("Cristian Pérez") == normalizar_nome("Cristian Perez")
    assert normalizar_nome("Sean O'Malley") == "sean omalley"


def test_ler_data_independe_do_idioma():
    assert historico.ler_data("October 10, 2026") == date(2026, 10, 10)


@pytest.mark.parametrize("metodo,esperado", [
    ("KO/TKO", "KO/TKO"), ("TKO - Doctor's Stoppage", "KO/TKO"), ("Submission ", "FINALIZACAO"),
    ("Decision - Unanimous", "DECISAO"), ("Decision - Split", "DECISAO"), ("Decision - Majority", "DECISAO"),
    ("DQ", "OUTRO"), ("Overturned", "OUTRO"), ("Could Not Continue", "OUTRO"), ("Other", "OUTRO"),
])
def test_categoria_metodo(metodo, esperado):
    assert historico.categoria_metodo(metodo) == esperado


def test_ler_lutas_e_resumo(cache):
    eventos = historico.ler_eventos(cache / "ufc_event_details.csv")
    lutas, avisos = historico.ler_lutas(cache / "ufc_fight_results.csv", eventos)
    assert len(lutas) == 4
    assert [l["data"] for l in lutas] == sorted(l["data"] for l in lutas)
    assert any("Evento Inexistente" in a for a in avisos)

    r = historico.resumir_atletas(lutas)
    ana = r["ana silva"]
    assert (ana["lutas"], ana["vitorias"], ana["derrotas"]) == (2, 2, 0)
    assert ana["vitorias_por_metodo"]["KO/TKO"] == 1 and ana["vitorias_por_metodo"]["DECISAO"] == 1
    assert ana["ultima_luta"] == "2026-03-05"
    bia = r["bia souza"]
    assert bia["derrotas_por_metodo"]["KO/TKO"] == 1 and bia["ultimos_5"] == ["D", "D"]
    davi = r["davi rocha"]
    assert davi["vitorias_por_metodo"]["FINALIZACAO"] == 1
    assert davi["sem_resultado"] == 1 and davi["ultimos_5"] == ["SR", "V"]  # mais recente primeiro


def test_nomes_ambiguos(cache):
    assert historico.nomes_ambiguos(cache / "ufc_fighter_details.csv") == {"caio lima"}


def evento_espn(nomes):
    """Imita a estrutura do scoreboard da ESPN (lista vem da preliminar para a luta principal)."""
    comps = []
    for i, (a, b) in enumerate(nomes):
        comps.append({
            "id": f"c{i}",
            "type": {"abbreviation": "Flyweight"},
            "status": {"type": {"name": "STATUS_SCHEDULED"}},
            "competitors": [
                {"order": 2, "athlete": {"displayName": b}, "records": [{"type": "total", "summary": "5-1-0"}]},
                {"order": 1, "athlete": {"displayName": a}, "records": [{"type": "total", "summary": "9-0-0"}]},
            ],
        })
    return {"id": "e1", "name": "Evento Futuro", "date": "2026-11-01T00:00Z",
            "status": {"type": {"name": "STATUS_SCHEDULED"}}, "competitions": comps}


def test_mapear_segmento():
    assert proximos.mapear_segmento("main") == "principal"
    assert proximos.mapear_segmento("prelims1") == "preliminar"
    assert proximos.mapear_segmento("prelims2") == "preliminar_antecipada"
    assert proximos.mapear_segmento(None) == "desconhecido"


def test_converter_evento_ordena_e_mapeia():
    bruto = evento_espn([("Caio Lima", "Davi Rocha"), ("Ana Silva", "Bia Souza")])
    detalhes = {"c1": {"segmento": "principal", "numero": 1}, "c0": {"segmento": "preliminar", "numero": 2}}
    ev = proximos.converter_evento(bruto, detalhes)
    assert [l["id"] for l in ev["lutas"]] == ["c1", "c0"]  # luta principal primeiro
    luta = ev["lutas"][0]
    assert luta["segmento"] == "principal"
    assert luta["lutador_a"]["nome"] == "Ana Silva"  # respeita o campo "order"
    assert luta["lutador_a"]["cartel_espn"] == "9-0-0"


def test_converter_evento_sem_detalhes_usa_ordem_inversa():
    ev = proximos.converter_evento(evento_espn([("A A", "B B"), ("C C", "D D")]), {})
    assert [l["id"] for l in ev["lutas"]] == ["c1", "c0"]
    assert all(l["segmento"] == "desconhecido" for l in ev["lutas"])


def _fake_rede(espn_falha=False):
    arquivos = {"ufc_event_details.csv": EVENTOS_CSV, "ufc_fight_results.csv": RESULTADOS_CSV,
                "ufc_fighter_details.csv": ATLETAS_CSV}

    def baixar(url):
        return arquivos[url.rsplit("/", 1)[1]].encode("utf-8")

    def baixar_json(url):
        if "api.github.com" in url:
            return [{"commit": {"author": {"date": "2026-03-06T00:00:00Z"}}}]
        if espn_falha:
            raise RuntimeError("sem internet")
        if "scoreboard" in url:
            return {"events": [evento_espn([("Caio Lima", "Novato Total"), ("Ana Silva", "Bia Souza")])]}
        luta = url.rsplit("/", 1)[1]
        return {"cardSegment": {"name": "main"}, "matchNumber": 1 if luta == "c1" else 2}

    return baixar, baixar_json


AGORA = datetime(2026, 3, 10, tzinfo=timezone.utc)


def test_executar_completo(tmp_path):
    baixar, baixar_json = _fake_rede()
    meta = atualizar.executar(tmp_path, baixar, baixar_json, AGORA)
    eventos = json.loads((tmp_path / "data" / "eventos.json").read_text(encoding="utf-8"))["eventos"]
    principal, outra = eventos[0]["lutas"]
    assert principal["previsao_possivel"] is True
    assert principal["lutador_a"]["historico_ufc"]["vitorias"] == 2
    assert outra["previsao_possivel"] is False
    assert outra["lutador_a"]["status_dados"] == "ambiguo"
    assert outra["lutador_b"]["status_dados"] == "nao_encontrado"
    assert meta["proximos_eventos"]["lutas_com_dados_suficientes"] == 1
    assert meta["historico"]["luta_mais_recente"] == "2026-03-05"
    assert meta["historico"]["atualizacao_da_fonte"] == "2026-03-06T00:00:00Z"
    assert not any("desatualizado" in a for a in meta["avisos"])


def test_sem_internet_mantem_dados_anteriores(tmp_path):
    baixar, baixar_json = _fake_rede()
    atualizar.executar(tmp_path, baixar, baixar_json, AGORA)

    def sem_rede(url):
        raise RuntimeError("sem internet")

    depois = datetime(2026, 4, 30, tzinfo=timezone.utc)
    meta = atualizar.executar(tmp_path, sem_rede, sem_rede, depois)
    eventos = json.loads((tmp_path / "data" / "eventos.json").read_text(encoding="utf-8"))["eventos"]
    assert len(eventos) == 1  # dados anteriores preservados
    assert meta["proximos_eventos"]["atualizado_com_sucesso"] is False
    assert meta["proximos_eventos"]["atualizado_em"] == AGORA.isoformat()  # data real dos dados exibidos
    assert meta["historico"]["atualizado_com_sucesso"] is False
    assert any("cópia salva" in a for a in meta["avisos"])
    assert any("desatualizado" in a for a in meta["avisos"])


def test_sem_internet_e_sem_cache_falha_claramente(tmp_path):
    def sem_rede(url):
        raise RuntimeError("sem internet")

    with pytest.raises(SystemExit):
        atualizar.executar(tmp_path, sem_rede, sem_rede, AGORA)
