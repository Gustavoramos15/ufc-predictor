"""Dados extras da ESPN (API pública NÃO OFICIAL, sem chave):

- odds da casa de apostas exibidas pela ESPN (hoje, DraftKings) para cada luta;
- cartel completo no MMA (inclui lutas fora do UFC), com vitórias/derrotas por método;
- médias das lutas que a ESPN transmitiu com estatísticas (ex.: Dana White's Contender Series),
  usadas para atletas sem histórico suficiente no UFC.

Tudo é opcional: se a ESPN falhar ou mudar, o campo fica vazio e o resto do pipeline segue.
"""
import re
from datetime import date, datetime

URL_REGISTRO = "https://sports.core.api.espn.com/v2/sports/mma/athletes/{id}/records"
URL_EVENTLOG = "https://sports.core.api.espn.com/v2/sports/mma/athletes/{id}/eventlog"
URL_STATS = "https://site.web.api.espn.com/apis/common/v3/sports/mma/athletes/{id}/stats"


def https(url: str) -> str:
    """A ESPN devolve links internos (http, '.pvt'); troca pelo endereço público."""
    return re.sub(r"^http:", "https:", url or "").replace("sports.core.api.espn.pvt", "sports.core.api.espn.com")


# ---------------------------------------------------------------- odds

def _decimal(lado: dict, momento: str) -> float | None:
    try:
        return float(lado[momento]["moneyLine"]["decimal"])
    except (KeyError, TypeError, ValueError):
        return None


def converter_odds(bruto: dict, id_a: str, id_b: str, agora: datetime) -> dict | None:
    """Odds de vitória (decimal) para A e B, casando cada lado pelo id do atleta na ESPN."""
    itens = bruto.get("items") or []
    if not itens:
        return None
    item = sorted(itens, key=lambda i: (i.get("provider") or {}).get("priority", 99))[0]
    lados = {}
    for chave in ("homeAthleteOdds", "awayAthleteOdds"):
        lado = item.get(chave) or {}
        ref = (lado.get("athlete") or {}).get("$ref", "")
        m = re.search(r"/athletes/(\d+)", ref)
        if m:
            lados[m.group(1)] = lado
    if str(id_a) not in lados or str(id_b) not in lados:
        return None
    a, b = lados[str(id_a)], lados[str(id_b)]
    resultado = {
        "casa": (item.get("provider") or {}).get("name"),
        "fonte": "ESPN (API não oficial)",
        "consultado_em": agora.isoformat(),
        "a": {"atual": _decimal(a, "current"), "abertura": _decimal(a, "open")},
        "b": {"atual": _decimal(b, "current"), "abertura": _decimal(b, "open")},
        "total_rounds": None,
    }
    if item.get("overUnder") is not None:
        cur = item.get("current") or {}
        resultado["total_rounds"] = {
            "linha": item["overUnder"],
            "mais": (cur.get("over") or {}).get("decimal"),
            "menos": (cur.get("under") or {}).get("decimal"),
        }
    if not resultado["a"]["atual"] or not resultado["b"]["atual"]:
        return None
    return resultado


# ---------------------------------------------------------------- cartel completo

def converter_registro(bruto: dict) -> dict | None:
    total = next((i for i in bruto.get("items", []) if i.get("type") == "total" or i.get("name") == "overall"), None)
    if not total:
        return None
    st = {s.get("name"): s.get("value") or 0 for s in total.get("stats", [])}
    v, d = int(st.get("wins", 0)), int(st.get("losses", 0))
    ko_v, fin_v = int(st.get("tkos", 0)), int(st.get("submissions", 0))
    ko_d, fin_d = int(st.get("tkoLosses", 0)), int(st.get("submissionLosses", 0))
    return {
        "cartel": total.get("summary"),
        "vitorias": v, "derrotas": d, "empates": int(st.get("draws", 0)),
        # A ESPN não separa decisão de DQ/outros: o restante é "decisão ou outro".
        "vitorias_por_metodo": {"ko_tko": ko_v, "finalizacao": fin_v, "decisao_ou_outro": max(v - ko_v - fin_v, 0)},
        "derrotas_por_metodo": {"ko_tko": ko_d, "finalizacao": fin_d, "decisao_ou_outro": max(d - ko_d - fin_d, 0)},
    }


# ---------------------------------------------------------------- médias fora do UFC

def _num(x) -> float | None:
    try:
        return float(str(x).replace("%", ""))
    except (TypeError, ValueError):
        return None


def _x_de_y(x) -> tuple[float, float] | None:
    m = re.match(r"\s*(\d+)\s*/\s*(\d+)", str(x))
    return (float(m.group(1)), float(m.group(2))) if m else None


def extrair_stats_por_luta(bruto: dict) -> dict[str, dict]:
    """{id da luta: {sig_l, sig_a, kd, td_l, td_a}} só para lutas com números (as sem dados vêm com '-')."""
    por_luta: dict[str, dict] = {}
    for cat in bruto.get("categories", []):
        rotulos = [r.strip() for r in cat.get("labels", [])]
        for linha in cat.get("statistics", []):
            m = re.search(r"~c:(\d+)", linha.get("uid", ""))
            if not m:
                continue
            valores = dict(zip(rotulos, linha.get("stats", [])))
            alvo = por_luta.setdefault(m.group(1), {})
            for rot, campo in (("SSL", "sig_l"), ("SSA", "sig_a"), ("KD", "kd"), ("TDL", "td_l"), ("TDA", "td_a")):
                if rot in valores and _num(valores[rot]) is not None:
                    alvo[campo] = _num(valores[rot])
    return {c: s for c, s in por_luta.items() if "sig_l" in s and "sig_a" in s}


def duracao_luta(status: dict, periodo_s: float = 300.0) -> float | None:
    """Tempo total em segundos a partir do round final e do relógio (tempo decorrido no round)."""
    try:
        rnd = int(status["period"])
        mm, ss = str(status["displayClock"]).split(":")
        return (rnd - 1) * periodo_s + int(mm) * 60 + int(ss)
    except (KeyError, TypeError, ValueError):
        return None


def calcular_medias(lutas: list[dict]) -> dict | None:
    """lutas: [{'sig_l','sig_a','kd','td_l','td_a','segundos','evento'}]."""
    validas = [l for l in lutas if l.get("segundos")]
    if not validas:
        return None
    minutos = sum(l["segundos"] for l in validas) / 60
    soma = {c: sum(l.get(c, 0) or 0 for l in validas) for c in ("sig_l", "sig_a", "kd", "td_l", "td_a")}

    def div(a, b, casas=3):
        return round(a / b, casas) if b else None

    return {
        "fonte": "ESPN (lutas transmitidas com estatísticas)",
        "lutas_com_estatisticas": len(validas),
        "eventos": [l["evento"] for l in validas if l.get("evento")],
        "minutos_com_estatisticas": round(minutos, 1),
        "golpes_sig_por_min": div(soma["sig_l"], minutos),
        "precisao_golpes": div(soma["sig_l"], soma["sig_a"]),
        "quedas_por_15min": div(soma["td_l"] * 15, minutos),
        "precisao_quedas": div(soma["td_l"], soma["td_a"]),
        "knockdowns_por_15min": div(soma["kd"] * 15, minutos),
    }


def buscar_medias_fora_ufc(baixar_json, atleta_id: str, hoje: date) -> dict | None:
    stats = extrair_stats_por_luta(baixar_json(URL_STATS.format(id=atleta_id)))
    if not stats:
        return None
    log = baixar_json(URL_EVENTLOG.format(id=atleta_id))
    lutas = []
    for item in (log.get("events") or {}).get("items", []):
        ref = https((item.get("competition") or {}).get("$ref"))
        m = re.search(r"/competitions/(\d+)", ref)
        if not item.get("played") or not m or m.group(1) not in stats:
            continue
        comp = baixar_json(ref)
        if comp.get("date") and datetime.fromisoformat(comp["date"].replace("Z", "+00:00")).date() > hoje:
            continue
        status = baixar_json(https((comp.get("status") or {}).get("$ref")))
        periodo = ((comp.get("format") or {}).get("regulation") or {}).get("clock") or 300.0
        evento = baixar_json(https((item.get("event") or {}).get("$ref"))).get("name")
        lutas.append({**stats[m.group(1)], "segundos": duracao_luta(status, periodo), "evento": evento})
    return calcular_medias(lutas)
