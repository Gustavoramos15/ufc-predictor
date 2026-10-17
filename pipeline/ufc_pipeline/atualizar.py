"""Atualiza os dados do app: baixa fontes, cruza atletas e grava data/eventos.json e data/meta.json.

Uso (na pasta do projeto):  .venv\\Scripts\\python.exe -m ufc_pipeline.atualizar
"""
import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from . import historico, proximos
from .nomes import normalizar_nome

RAIZ = Path(__file__).resolve().parents[2]
URL_CSV = "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main/{arquivo}"
URL_COMMIT = "https://api.github.com/repos/Greco1899/scrape_ufc_stats/commits?path=ufc_fight_results.csv&per_page=1"
ARQUIVOS_CSV = ("ufc_event_details.csv", "ufc_fight_results.csv", "ufc_fighter_details.csv")
USER_AGENT = "UFCPredictor/0.1 (projeto pessoal, nao comercial)"

# Abaixo disso o histórico do atleta é considerado insuficiente para prever.
MIN_LUTAS_UFC = 2
# O UFC tem evento quase toda semana; um histórico mais velho que isso provavelmente está desatualizado.
DIAS_HISTORICO_DESATUALIZADO = 14


def baixar_bytes(url: str, tentativas: int = 3) -> bytes:
    erro = None
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception as e:  # rede, timeout, HTTP 4xx/5xx
            erro = e
            time.sleep(1 + i)
    raise RuntimeError(f"Falha ao baixar {url}: {erro}")


def baixar_json(url: str):
    return json.loads(baixar_bytes(url).decode("utf-8"))


def _gravar_json(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    tmp = caminho.with_suffix(".tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(caminho)  # troca atômica: o arquivo antigo nunca fica pela metade


def atualizar_csvs(pasta_cache: Path, baixar=baixar_bytes) -> tuple[bool, list[str]]:
    """Baixa os CSVs. Se falhar, mantém a cópia anterior. Retorna (baixou_tudo, avisos)."""
    pasta_cache.mkdir(parents=True, exist_ok=True)
    avisos, ok = [], True
    for arq in ARQUIVOS_CSV:
        destino = pasta_cache / arq
        try:
            conteudo = baixar(URL_CSV.format(arquivo=arq))
            if not conteudo.startswith(b"EVENT") and not conteudo.startswith(b"FIRST"):
                raise RuntimeError("conteúdo inesperado (não parece o CSV esperado)")
            destino.with_suffix(".tmp").write_bytes(conteudo)
            destino.with_suffix(".tmp").replace(destino)
        except Exception as e:
            ok = False
            if destino.exists():
                avisos.append(f"Não foi possível atualizar {arq}; usando a cópia salva anteriormente. ({e})")
            else:
                avisos.append(f"Não foi possível baixar {arq} e não há cópia salva. ({e})")
    return ok, avisos


def status_atleta(nome: str, resumos: dict, ambiguos: set) -> tuple[str, dict | None]:
    chave = normalizar_nome(nome)
    if chave in ambiguos:
        return "ambiguo", None
    r = resumos.get(chave)
    if r is None:
        return "nao_encontrado", None
    if r["lutas"] < MIN_LUTAS_UFC:
        return "insuficiente", r
    return "ok", r


TEXTO_STATUS = {
    "ambiguo": "existe mais de um atleta com esse nome no UFCStats; histórico não pode ser separado",
    "nao_encontrado": "sem histórico no UFCStats (provável estreia no UFC ou grafia diferente do nome)",
    "insuficiente": f"menos de {MIN_LUTAS_UFC} lutas no UFC registradas",
}


def enriquecer_evento(evento: dict, resumos: dict, ambiguos: set) -> dict:
    for luta in evento["lutas"]:
        luta["avisos"] = []
        for lado in ("lutador_a", "lutador_b"):
            lutador = luta[lado]
            status, resumo = status_atleta(lutador["nome"], resumos, ambiguos)
            lutador["status_dados"] = status
            lutador["historico_ufc"] = resumo
            if status != "ok":
                luta["avisos"].append(f"{lutador['nome']}: {TEXTO_STATUS[status]}.")
        luta["previsao_possivel"] = not luta["avisos"]
    return evento


def executar(raiz: Path = RAIZ, baixar=baixar_bytes, baixar_json_fn=baixar_json, agora: datetime | None = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    cache, pasta_dados = raiz / "pipeline" / "cache", raiz / "data"
    meta_anterior_path = pasta_dados / "meta.json"
    meta_anterior = json.loads(meta_anterior_path.read_text(encoding="utf-8")) if meta_anterior_path.exists() else {}
    avisos: list[str] = []

    # 1) Histórico (UFCStats via Greco1899)
    csv_ok, av = atualizar_csvs(cache, baixar)
    avisos += av
    if not all((cache / a).exists() for a in ARQUIVOS_CSV):
        raise SystemExit("Sem dados históricos (nem baixados nem salvos). Verifique a internet e rode de novo.")
    eventos_hist = historico.ler_eventos(cache / "ufc_event_details.csv")
    lutas, av = historico.ler_lutas(cache / "ufc_fight_results.csv", eventos_hist)
    avisos += av
    resumos = historico.resumir_atletas(lutas)
    ambiguos = historico.nomes_ambiguos(cache / "ufc_fighter_details.csv")
    ultima_luta_hist = lutas[-1]["data"] if lutas else None
    commit_fonte = None
    try:
        commit_fonte = baixar_json_fn(URL_COMMIT)[0]["commit"]["author"]["date"]
    except Exception:
        pass  # informação extra; não impede a atualização
    if ultima_luta_hist and (agora.date() - ultima_luta_hist).days > DIAS_HISTORICO_DESATUALIZADO:
        avisos.append(
            f"Histórico possivelmente desatualizado: a luta mais recente registrada é de {ultima_luta_hist.isoformat()}."
        )

    # 2) Próximos eventos (ESPN, não oficial)
    eventos_path = pasta_dados / "eventos.json"
    espn_ok = True
    try:
        eventos = []
        for bruto in proximos.buscar_eventos_brutos(baixar_json_fn, agora.date()):
            detalhes, falhas = proximos.buscar_detalhes_lutas(baixar_json_fn, bruto)
            ev = proximos.converter_evento(bruto, detalhes)
            if falhas:
                avisos.append(f"{ev['nome']}: card principal/preliminar desconhecido em {falhas} luta(s).")
            eventos.append(enriquecer_evento(ev, resumos, ambiguos))
        eventos_atualizados_em = agora.isoformat()
    except Exception as e:
        espn_ok = False
        anteriores = json.loads(eventos_path.read_text(encoding="utf-8")) if eventos_path.exists() else {}
        eventos = anteriores.get("eventos", [])
        eventos_atualizados_em = meta_anterior.get("proximos_eventos", {}).get("atualizado_em")
        avisos.append(
            "Não foi possível atualizar os próximos eventos (ESPN). "
            + ("Mantidos os dados salvos anteriormente." if eventos else "Nenhum dado salvo disponível.")
            + f" ({e})"
        )

    total_lutas = sum(len(e["lutas"]) for e in eventos)
    com_previsao = sum(l["previsao_possivel"] for e in eventos for l in e["lutas"])
    meta = {
        "versao_dados": 1,
        "gerado_em": agora.isoformat(),
        "historico": {
            "fonte": "UFCStats.com via github.com/Greco1899/scrape_ufc_stats (GPL-3.0)",
            "atualizado_com_sucesso": csv_ok,
            "atualizacao_da_fonte": commit_fonte,
            "luta_mais_recente": ultima_luta_hist.isoformat() if ultima_luta_hist else None,
            "total_lutas": len(lutas),
            "total_atletas": len(resumos),
        },
        "proximos_eventos": {
            "fonte": "ESPN (API pública não oficial)",
            "atualizado_com_sucesso": espn_ok,
            "atualizado_em": eventos_atualizados_em,
            "total_eventos": len(eventos),
            "total_lutas": total_lutas,
            "lutas_com_dados_suficientes": com_previsao,
        },
        "avisos": avisos,
    }
    _gravar_json(eventos_path, {"gerado_em": agora.isoformat(), "eventos": eventos})
    _gravar_json(meta_anterior_path, meta)
    return meta


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    meta = executar()
    h, p = meta["historico"], meta["proximos_eventos"]
    print(f"Histórico: {h['total_lutas']} lutas, {h['total_atletas']} atletas; luta mais recente {h['luta_mais_recente']}"
          f" (fonte atualizada em {h['atualizacao_da_fonte'] or 'data desconhecida'}).")
    print(f"Próximos eventos: {p['total_eventos']} eventos, {p['total_lutas']} lutas; "
          f"{p['lutas_com_dados_suficientes']} com dados suficientes para previsão.")
    for a in meta["avisos"]:
        print(f"AVISO: {a}")
    print(f"Arquivos gravados em {RAIZ / 'data'}")


if __name__ == "__main__":
    main()
