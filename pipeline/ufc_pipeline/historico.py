"""Leitura do histórico de lutas (CSVs do UFCStats espelhados por Greco1899/scrape_ufc_stats)."""
import csv
from collections import Counter
from datetime import date
from pathlib import Path

from .nomes import normalizar_espacos, normalizar_nome

MESES = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

METODOS = ("KO/TKO", "FINALIZACAO", "DECISAO", "OUTRO")


def ler_data(texto: str) -> date:
    """'October 10, 2026' -> date(2026, 10, 10). Não depende do idioma do Windows."""
    mes, dia, ano = normalizar_espacos(texto).replace(",", "").split(" ")
    return date(int(ano), MESES[mes.lower()], int(dia))


def categoria_metodo(metodo: str) -> str:
    m = normalizar_espacos(metodo).lower()
    if m.startswith("ko/tko") or m.startswith("tko"):
        return "KO/TKO"
    if m.startswith("submission"):
        return "FINALIZACAO"
    if m.startswith("decision"):
        return "DECISAO"
    # DQ, Could Not Continue, Overturned, Other
    return "OUTRO"


def _ler_csv(caminho: Path) -> list[dict]:
    with open(caminho, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ler_eventos(caminho: Path) -> dict[str, date]:
    return {normalizar_espacos(l["EVENT"]): ler_data(l["DATE"]) for l in _ler_csv(caminho)}


def ler_lutas(caminho_resultados: Path, eventos: dict[str, date]) -> tuple[list[dict], list[str]]:
    """Retorna (lutas ordenadas por data, avisos). Lutas sem data conhecida são descartadas e avisadas."""
    lutas, avisos = [], []
    sem_evento = Counter()
    for l in _ler_csv(caminho_resultados):
        evento = normalizar_espacos(l["EVENT"])
        if evento not in eventos:
            sem_evento[evento] += 1
            continue
        partes = normalizar_espacos(l["BOUT"]).split(" vs. ")
        if len(partes) != 2:
            avisos.append(f"Luta com formato inesperado ignorada: {l['BOUT']!r}")
            continue
        a, b = partes
        desfecho = normalizar_espacos(l["OUTCOME"])
        resultado = {"W/L": "A", "L/W": "B", "D/D": "empate", "NC/NC": "sem_resultado"}.get(desfecho)
        if resultado is None:
            avisos.append(f"Resultado desconhecido {desfecho!r} em {l['BOUT']!r}")
            continue
        lutas.append({
            "data": eventos[evento],
            "evento": evento,
            "lutador_a": a,
            "lutador_b": b,
            "resultado": resultado,
            "metodo": categoria_metodo(l["METHOD"]),
            "metodo_original": normalizar_espacos(l["METHOD"]),
            "round": normalizar_espacos(l["ROUND"]),
            "categoria": normalizar_espacos(l["WEIGHTCLASS"]),
            "url": l["URL"].strip(),
        })
    for evento, n in sem_evento.items():
        avisos.append(f"{n} luta(s) do evento '{evento}' sem data no arquivo de eventos foram ignoradas.")
    lutas.sort(key=lambda x: x["data"])
    return lutas, avisos


def nomes_ambiguos(caminho_atletas: Path) -> set[str]:
    """Nomes que pertencem a mais de um atleta no UFCStats (não dá para separar o histórico)."""
    contagem = Counter(
        normalizar_nome(f"{l['FIRST']} {l['LAST']}") for l in _ler_csv(caminho_atletas)
    )
    return {nome for nome, n in contagem.items() if n > 1 and nome}


def resumir_atletas(lutas: list[dict]) -> dict[str, dict]:
    """Resumo por atleta (chave = nome normalizado). `lutas` deve estar em ordem cronológica."""
    resumos: dict[str, dict] = {}
    for luta in lutas:
        for lado, nome in (("A", luta["lutador_a"]), ("B", luta["lutador_b"])):
            chave = normalizar_nome(nome)
            r = resumos.setdefault(chave, {
                "nome_ufcstats": nome,
                "lutas": 0, "vitorias": 0, "derrotas": 0, "empates": 0, "sem_resultado": 0,
                "vitorias_por_metodo": {m: 0 for m in METODOS},
                "derrotas_por_metodo": {m: 0 for m in METODOS},
                "primeira_luta": None, "ultima_luta": None,
                "sequencia": [],  # do mais antigo para o mais recente; invertido no final
            })
            r["lutas"] += 1
            r["primeira_luta"] = r["primeira_luta"] or luta["data"]
            r["ultima_luta"] = luta["data"]
            if luta["resultado"] == lado:
                r["vitorias"] += 1
                r["vitorias_por_metodo"][luta["metodo"]] += 1
                r["sequencia"].append("V")
            elif luta["resultado"] in ("A", "B"):
                r["derrotas"] += 1
                r["derrotas_por_metodo"][luta["metodo"]] += 1
                r["sequencia"].append("D")
            elif luta["resultado"] == "empate":
                r["empates"] += 1
                r["sequencia"].append("E")
            else:
                r["sem_resultado"] += 1
                r["sequencia"].append("SR")
    for r in resumos.values():
        r["ultimos_5"] = list(reversed(r.pop("sequencia")[-5:]))  # mais recente primeiro
        r["primeira_luta"] = r["primeira_luta"].isoformat()
        r["ultima_luta"] = r["ultima_luta"].isoformat()
    return resumos
