"""Estatísticas por luta (golpes, quedas, controle) e dados físicos dos atletas."""
import csv
import re
from collections import Counter
from datetime import date
from pathlib import Path

from .historico import MESES
from .nomes import normalizar_espacos, normalizar_nome

CAMPOS = ("sig_l", "sig_a", "td_l", "td_a", "ctrl", "sub", "kd")


def x_de_y(texto: str) -> tuple[int, int]:
    """'15 of 22' -> (15, 22). Valores ausentes viram (0, 0)."""
    m = re.match(r"\s*(\d+) of (\d+)", texto or "")
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def mmss(texto: str) -> int:
    """'2:46' -> 166 segundos. '--' ou vazio -> 0."""
    m = re.match(r"\s*(\d+):(\d\d)\s*$", texto or "")
    return int(m.group(1)) * 60 + int(m.group(2)) if m else 0


def _numero(texto: str) -> int:
    """'2', '2.0', '' ou '--' -> inteiro (vazio vira 0)."""
    try:
        return int(float(texto))
    except (TypeError, ValueError):
        return 0


def duracao_segundos(round_: str, tempo: str, formato: str) -> int | None:
    """Tempo total da luta. Ex.: round 3 às 2:00 em '3 Rnd (5-5-5)' -> 10 min + 2 min = 720 s."""
    try:
        r = int(round_)
    except (TypeError, ValueError):
        return None
    t = mmss(tempo)
    m = re.search(r"\(([\d-]+)\)", formato or "")
    duracoes = [int(x) for x in m.group(1).split("-")] if m else []
    if r == 1:
        return t or None
    if len(duracoes) >= r - 1:
        return sum(duracoes[: r - 1]) * 60 + t
    return (r - 1) * 300 + t  # formato desconhecido: assume rounds de 5 minutos


def chave_luta(evento: str, luta: str) -> tuple[str, str]:
    return normalizar_espacos(evento), normalizar_nome(luta)


def ler_estatisticas(caminho: Path) -> dict[tuple[str, str], dict[str, dict]]:
    """{(evento, luta): {nome_normalizado: totais somados de todos os rounds}}."""
    resultado: dict = {}
    with open(caminho, encoding="utf-8", newline="") as f:
        for l in csv.DictReader(f):
            if not (l.get("FIGHTER") or "").strip():
                continue
            luta = resultado.setdefault(chave_luta(l["EVENT"], l["BOUT"]), {})
            s = luta.setdefault(normalizar_nome(l["FIGHTER"]), dict.fromkeys(CAMPOS, 0))
            sig_l, sig_a = x_de_y(l["SIG.STR."])
            td_l, td_a = x_de_y(l["TD"])
            s["sig_l"] += sig_l
            s["sig_a"] += sig_a
            s["td_l"] += td_l
            s["td_a"] += td_a
            s["ctrl"] += mmss(l["CTRL"])
            s["sub"] += _numero(l["SUB.ATT"])
            s["kd"] += _numero(l["KD"])
    return resultado


def anexar_estatisticas(lutas: list[dict], estatisticas: dict) -> int:
    """Coloca luta['stats'] = {'A': {...}, 'B': {...}} quando encontrado. Retorna quantas lutas ficaram sem."""
    sem = 0
    for luta in lutas:
        por_atleta = estatisticas.get(chave_luta(luta["evento"], f"{luta['lutador_a']} vs. {luta['lutador_b']}"), {})
        a = por_atleta.get(normalizar_nome(luta["lutador_a"]))
        b = por_atleta.get(normalizar_nome(luta["lutador_b"]))
        luta["stats"] = {"A": a, "B": b} if a and b else None
        sem += luta["stats"] is None
    return sem


def _data_curta(texto: str) -> date | None:
    """'Jul 13, 1978' -> date(1978, 7, 13)."""
    m = re.match(r"\s*([A-Za-z]{3})\w* (\d{1,2}), (\d{4})", texto or "")
    if not m:
        return None
    mes = next((n for nome, n in MESES.items() if nome.startswith(m.group(1).lower())), None)
    return date(int(m.group(3)), mes, int(m.group(2))) if mes else None


def ler_perfis(caminho: Path) -> dict[str, dict]:
    """Data de nascimento e envergadura (polegadas). Nomes repetidos são descartados (ambíguos)."""
    perfis, contagem = {}, Counter()
    with open(caminho, encoding="utf-8", newline="") as f:
        for l in csv.DictReader(f):
            chave = normalizar_nome(l["FIGHTER"])
            contagem[chave] += 1
            alcance = re.match(r"\s*(\d+(?:\.\d+)?)\"", l.get("REACH") or "")
            perfis[chave] = {
                "nascimento": _data_curta(l.get("DOB")),
                "envergadura": float(alcance.group(1)) if alcance else None,
            }
    return {k: v for k, v in perfis.items() if contagem[k] == 1}
