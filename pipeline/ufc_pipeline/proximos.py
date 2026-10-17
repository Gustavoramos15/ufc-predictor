"""Próximos eventos do UFC via API pública NÃO OFICIAL da ESPN (sem chave).

Pode mudar sem aviso; por isso todo acesso tem tratamento de erro e o
pipeline mantém os últimos dados salvos quando a ESPN falha.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

URL_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={ini}-{fim}&limit=100"
URL_LUTA = "https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{evento}/competitions/{luta}"


def mapear_segmento(nome: str | None) -> str:
    n = (nome or "").lower()
    if n == "main":
        return "principal"
    if "early" in n or n == "prelims2":
        return "preliminar_antecipada"
    if n.startswith("prelims"):
        return "preliminar"
    return "desconhecido"


def buscar_eventos_brutos(baixar_json, hoje: date, dias: int = 60) -> list[dict]:
    url = URL_SCOREBOARD.format(ini=hoje.strftime("%Y%m%d"), fim=(hoje + timedelta(days=dias)).strftime("%Y%m%d"))
    return baixar_json(url).get("events", [])


def buscar_detalhes_lutas(baixar_json, evento_bruto: dict) -> tuple[dict[str, dict], int]:
    """Busca card (principal/preliminar) e ordem de cada luta. Retorna (detalhes, falhas)."""
    def buscar(comp):
        try:
            return comp["id"], baixar_json(URL_LUTA.format(evento=evento_bruto["id"], luta=comp["id"]))
        except Exception:
            return comp["id"], None

    detalhes, falhas = {}, 0
    with ThreadPoolExecutor(max_workers=8) as ex:  # várias lutas ao mesmo tempo
        for comp_id, d in ex.map(buscar, evento_bruto.get("competitions", [])):
            if d is None:
                falhas += 1
                continue
            detalhes[comp_id] = {
                "segmento": mapear_segmento((d.get("cardSegment") or {}).get("name")),
                "numero": d.get("matchNumber"),
                "odds_ref": (d.get("odds") or {}).get("$ref"),
            }
    return detalhes, falhas


def _lutador(competidor: dict) -> dict:
    cartel = next((r.get("summary") for r in competidor.get("records", []) if r.get("type") == "total"), None)
    return {
        "espn_id": competidor.get("id"),
        "nome": competidor.get("athlete", {}).get("displayName", "").strip(),
        "cartel_espn": cartel,  # cartel total no MMA (inclui lutas fora do UFC)
        "pais": (competidor.get("athlete", {}).get("flag") or {}).get("alt"),
    }


def converter_evento(bruto: dict, detalhes: dict[str, dict]) -> dict:
    lutas = []
    for i, comp in enumerate(bruto.get("competitions", [])):
        competidores = sorted(comp.get("competitors", []), key=lambda c: c.get("order", 99))
        if len(competidores) != 2:
            continue
        det = detalhes.get(comp["id"], {})
        lutas.append({
            "id": comp["id"],
            # 1 = luta principal da noite. Sem o detalhe, usa a ordem inversa da lista da ESPN.
            "numero": det.get("numero") or len(bruto["competitions"]) - i,
            "segmento": det.get("segmento", "desconhecido"),
            "categoria": (comp.get("type") or {}).get("abbreviation"),
            "status": (comp.get("status") or {}).get("type", {}).get("name"),
            "lutador_a": _lutador(competidores[0]),
            "lutador_b": _lutador(competidores[1]),
            "_odds_ref": det.get("odds_ref"),  # uso interno do pipeline; removido antes de gravar
        })
    lutas.sort(key=lambda l: l["numero"])
    return {
        "id": bruto["id"],
        "nome": bruto.get("name"),
        "data": bruto.get("date"),  # ISO 8601 em UTC
        "status": (bruto.get("status") or {}).get("type", {}).get("name"),
        "lutas": lutas,
    }
