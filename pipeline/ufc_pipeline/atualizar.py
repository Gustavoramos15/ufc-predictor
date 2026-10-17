"""Atualiza os dados do app: baixa fontes, cruza atletas e grava data/eventos.json e data/meta.json.

Uso (na pasta do projeto):  .venv\\Scripts\\python.exe -m ufc_pipeline.atualizar
"""
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from pathlib import Path

from . import espn_extra, estatisticas, historico, modelo, proximos
from .modelo import MIN_LUTAS_UFC  # abaixo disso o histórico do atleta é insuficiente para prever
from .nomes import normalizar_nome

RAIZ = Path(__file__).resolve().parents[2]
URL_CSV = "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main/{arquivo}"
URL_COMMIT = "https://api.github.com/repos/Greco1899/scrape_ufc_stats/commits?path=ufc_fight_results.csv&per_page=1"
ARQUIVOS_CSV = ("ufc_event_details.csv", "ufc_fight_results.csv", "ufc_fighter_details.csv",
                "ufc_fight_stats.csv", "ufc_fighter_tott.csv")
USER_AGENT = "UFCPredictor/0.1 (projeto pessoal, nao comercial)"
VERSAO_MODELO = "elo-logistica-v1"
# Validação temporal: treino até 2022, validação em 2023, teste (nunca usado para escolher nada) a partir de 2024.
INICIO_VALIDACAO = date(2023, 1, 1)
INICIO_TESTE = date(2024, 1, 1)
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
            if not conteudo.startswith((b"EVENT", b"FIRST", b"FIGHTER")):
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


def data_do_evento(evento: dict) -> date:
    return datetime.fromisoformat(evento["data"].replace("Z", "+00:00")).date()


def enriquecer_evento(evento: dict, resumos: dict, ambiguos: set, modelo_final: dict | None = None) -> dict:
    dia = data_do_evento(evento)
    for luta in evento["lutas"]:
        luta["avisos"] = []
        for lado in ("lutador_a", "lutador_b"):
            lutador = luta[lado]
            status, resumo = status_atleta(lutador["nome"], resumos, ambiguos)
            lutador["status_dados"] = status
            lutador["historico_ufc"] = resumo
            lutador["estatisticas"] = (
                modelo.estatisticas_exibicao(modelo_final, lutador["nome"], dia)
                if modelo_final and status in ("ok", "insuficiente") else None
            )
            if status != "ok":
                luta["avisos"].append(f"{lutador['nome']}: {TEXTO_STATUS[status]}.")
        luta["previsao_possivel"] = not luta["avisos"] and modelo_final is not None
        luta["previsao"] = (
            modelo.prever(modelo_final, luta["lutador_a"]["nome"], luta["lutador_b"]["nome"], luta["categoria"], dia)
            if luta["previsao_possivel"] else None
        )
    return evento


def adicionar_dados_espn(eventos: list[dict], baixar_json_fn, agora: datetime) -> list[str]:
    """Odds da casa, cartel completo no MMA e médias fora do UFC. Falhas viram avisos, nunca erro fatal."""
    lutas = [luta for ev in eventos for luta in ev["lutas"]]
    lutadores = [lut for luta in lutas for lut in (luta["lutador_a"], luta["lutador_b"])]
    ids_todos = {l["espn_id"] for l in lutadores if l.get("espn_id")}
    # Médias fora do UFC só para quem não tem histórico suficiente no UFC.
    ids_sem_ufc = {l["espn_id"] for l in lutadores if l.get("espn_id") and l["status_dados"] != "ok"}

    def odds_da_luta(luta):
        ref = luta.get("_odds_ref")
        a, b = luta["lutador_a"], luta["lutador_b"]
        if not (ref and a.get("espn_id") and b.get("espn_id")):
            return None
        return espn_extra.converter_odds(baixar_json_fn(espn_extra.https(ref)), a["espn_id"], b["espn_id"], agora)

    def tentar(funcao, arg):
        try:
            return True, funcao(arg)
        except Exception:
            return False, None

    # Várias consultas ao mesmo tempo (8): reduz o tempo total sem sobrecarregar a ESPN.
    with ThreadPoolExecutor(max_workers=8) as ex:
        odds = dict(zip([l["id"] for l in lutas], ex.map(lambda l: tentar(odds_da_luta, l), lutas)))
        cartel = dict(zip(ids_todos, ex.map(lambda i: tentar(
            lambda x: espn_extra.converter_registro(baixar_json_fn(espn_extra.URL_REGISTRO.format(id=x))), i),
            ids_todos)))
        medias = dict(zip(ids_sem_ufc, ex.map(lambda i: tentar(
            lambda x: espn_extra.buscar_medias_fora_ufc(baixar_json_fn, x, agora.date()), i), ids_sem_ufc)))

    for luta in lutas:
        luta.pop("_odds_ref", None)
        luta["odds_casa"] = odds[luta["id"]][1]
        for lut in (luta["lutador_a"], luta["lutador_b"]):
            aid = lut.get("espn_id")
            lut["carreira_mma"] = cartel[aid][1] if aid in cartel else None
            lut["medias_fora_ufc"] = medias[aid][1] if aid in medias else None
    falhas = {
        "odds": sum(not ok for ok, _ in odds.values()),
        "cartel": sum(not ok for ok, _ in cartel.values()),
        "medias": sum(not ok for ok, _ in medias.values()),
    }
    nomes = {"odds": "odds da casa", "cartel": "cartel completo no MMA", "medias": "médias fora do UFC"}
    return [f"ESPN: falha ao buscar {nomes[k]} em {n} caso(s)." for k, n in falhas.items() if n]


def registrar_previsoes(caminho: Path, eventos: list[dict], agora: datetime,
                        lutas_historico: list[dict] | None = None) -> int:
    """Guarda a última previsão feita ANTES de cada evento, para comparar com o resultado real depois.

    Previsões de eventos que já começaram nunca são alteradas. Retorna o total registrado.
    """
    registro = json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}
    for ev in eventos:
        inicio = datetime.fromisoformat(ev["data"].replace("Z", "+00:00"))
        if agora >= inicio:
            continue
        for luta in ev["lutas"]:
            if luta.get("previsao"):
                registro[luta["id"]] = {
                    "evento_id": ev["id"], "evento": ev["nome"], "data_evento": ev["data"],
                    "lutador_a": luta["lutador_a"]["nome"], "lutador_b": luta["lutador_b"]["nome"],
                    "categoria": luta["categoria"], "previsao": luta["previsao"],
                    # Odds da casa no momento da previsão: permitem avaliar, depois, se haveria lucro.
                    "odds_casa": luta.get("odds_casa"),
                    "previsto_em": agora.isoformat(), "versao_modelo": VERSAO_MODELO,
                    "resultado_real": None,  # preenchido na etapa 5
                }
    preencher_resultados(registro, lutas_historico or [])
    _gravar_json(caminho, registro)
    return len(registro)


def preencher_resultados(registro: dict, lutas_historico: list[dict]) -> int:
    """Procura no histórico do UFCStats o resultado real de cada previsão ainda sem resultado.

    Casa pelos dois nomes e pela data (até 1 dia antes ou 2 depois, por causa do fuso horário).
    Retorna quantos resultados foram preenchidos agora.
    """
    por_nomes: dict[frozenset, list[dict]] = {}
    for l in lutas_historico:
        por_nomes.setdefault(frozenset((normalizar_nome(l["lutador_a"]), normalizar_nome(l["lutador_b"]))), []).append(l)
    preenchidos = 0
    for prev in registro.values():
        if prev.get("resultado_real"):
            continue
        na, nb = normalizar_nome(prev["lutador_a"]), normalizar_nome(prev["lutador_b"])
        dia = datetime.fromisoformat(prev["data_evento"].replace("Z", "+00:00")).date()
        for l in por_nomes.get(frozenset((na, nb)), []):
            if -1 <= (l["data"] - dia).days <= 2:
                if l["resultado"] in ("A", "B"):
                    vencedor_nome = l["lutador_a"] if l["resultado"] == "A" else l["lutador_b"]
                    vencedor = "a" if normalizar_nome(vencedor_nome) == na else "b"
                else:
                    vencedor = l["resultado"]  # "empate" ou "sem_resultado"
                prev["resultado_real"] = {"vencedor": vencedor, "metodo": l["metodo"],
                                          "metodo_original": l["metodo_original"], "round": l["round"]}
                preenchidos += 1
                break
    return preenchidos


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%".replace(".", ",")


def _num(x: float) -> str:
    return f"{x:.3f}".replace(".", ",")


def relatorio_markdown(rel: dict, agora: datetime) -> str:
    t = rel["teste"]
    linhas = [
        "# Validação do modelo",
        "",
        f"Gerado automaticamente em {agora.strftime('%d/%m/%Y %H:%M')} UTC. Versão do modelo: `{VERSAO_MODELO}`.",
        "",
        "## Como foi testado",
        f"- **Treino:** lutas {rel['periodos']['treino']}.",
        f"- **Validação** (usada para escolher os parâmetros): {rel['periodos']['validacao']}.",
        f"- **Teste** (nunca usado para escolher nada): {rel['periodos']['teste']}.",
        "- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).",
        f"- Critério: {t['criterio']}.",
        "",
        "## Resultado no teste",
        "",
        "| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |",
        "|---|---|---|---|---|",
    ]
    for nome, chave in (("**Elo + regressão logística**", "modelo"), ("Só Elo", "so_elo"),
                        ("Moeda (50% / 50%)", "moeda_50_50"),
                        ("Elo + logística, incluindo atletas com pouco histórico", "todas_as_lutas_modelo")):
        m = t[chave]
        linhas.append(f"| {nome} | {m['n']} | {_pct(m['acuracia'])} | {_num(m['log_loss'])} | {_num(m['brier'])} |")
    mt = t["metodo_dado_vencedor"]
    linhas += [
        "",
        "## Calibração (quando o modelo diz X%, acontece X%?)",
        "",
        "| Faixa prevista | Previsões | Média prevista | Frequência real |",
        "|---|---|---|---|",
    ]
    for c in t["calibracao_todas_as_faixas"]:
        linhas.append(f"| {c['faixa']} | {c['n']} | {_pct(c['prob_media_prevista'])} | {_pct(c['frequencia_real'])} |")
    linhas += [
        "",
        "Faixas com poucas previsões têm muita variação aleatória.",
        "",
        "## Método de vitória (dado o vencedor)",
        f"- Lutas avaliadas: {mt['n']}.",
        f"- Log-loss do modelo: {_num(mt['log_loss_modelo'])}. Usando só a média da divisão: "
        f"{_num(mt['log_loss_media_da_divisao'])} (menor é melhor).",
        "",
        "## Parâmetros escolhidos na validação",
        *(f"- `{k}`: {v}" for k, v in rel["parametros"].items()),
        "",
        "## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)",
        *(f"- `{k}`: {v}" for k, v in rel["coeficientes"].items()),
        "",
        "## Limites",
        "- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas",
        "  de apostas, e nada aqui indica que apostar com ele seja lucrativo.",
        "- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.",
        "",
    ]
    return "\n".join(linhas)


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

    # 2) Modelo: validação temporal + treino final com todo o histórico
    modelo_final, relatorio = None, None
    try:
        sem_stats = estatisticas.anexar_estatisticas(lutas, estatisticas.ler_estatisticas(cache / "ufc_fight_stats.csv"))
        if sem_stats:
            avisos.append(f"{sem_stats} luta(s) do histórico sem estatísticas de golpes; usadas só no cartel e no Elo.")
        perfis = estatisticas.ler_perfis(cache / "ufc_fighter_tott.csv")
        relatorio, modelo_final = modelo.validar_e_treinar(lutas, perfis, INICIO_VALIDACAO, INICIO_TESTE)
        _gravar_json(pasta_dados / "validacao.json", {"gerado_em": agora.isoformat(), "versao_modelo": VERSAO_MODELO,
                                                      **relatorio})
        (raiz / "docs").mkdir(exist_ok=True)
        (raiz / "docs" / "VALIDACAO.md").write_text(relatorio_markdown(relatorio, agora), encoding="utf-8")
    except Exception as e:
        avisos.append(f"Modelo não pôde ser treinado; nenhuma previsão foi gerada. ({e})")

    # 3) Próximos eventos (ESPN, não oficial)
    eventos_path = pasta_dados / "eventos.json"
    espn_ok = True
    try:
        eventos = []
        for bruto in proximos.buscar_eventos_brutos(baixar_json_fn, agora.date()):
            detalhes, falhas = proximos.buscar_detalhes_lutas(baixar_json_fn, bruto)
            ev = proximos.converter_evento(bruto, detalhes)
            if falhas:
                avisos.append(f"{ev['nome']}: card principal/preliminar desconhecido em {falhas} luta(s).")
            eventos.append(enriquecer_evento(ev, resumos, ambiguos, modelo_final))
        eventos_atualizados_em = agora.isoformat()
        avisos += adicionar_dados_espn(eventos, baixar_json_fn, agora)
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
    # Só registra previsões recém-calculadas (se a ESPN falhou, os eventos são cópias antigas).
    n_registradas = registrar_previsoes(pasta_dados / "previsoes_registro.json", eventos if espn_ok else [], agora,
                                        lutas)
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
        "modelo": {
            "versao": VERSAO_MODELO,
            "treinado": modelo_final is not None,
            "treinado_ate": modelo_final["treinado_ate"] if modelo_final else None,
            "teste": relatorio["teste"]["modelo"] if relatorio else None,
            "previsoes_registradas": n_registradas,
            "aviso": "Probabilidades estimadas por modelo estatístico. Odds justas = 1 / probabilidade; "
                     "não são cotações de casas de apostas e não garantem resultado.",
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
    m = meta["modelo"]
    if m["teste"]:
        print(f"Modelo (teste fora da amostra, {m['teste']['n']} lutas): acerto {m['teste']['acuracia']:.1%}, "
              f"log-loss {m['teste']['log_loss']:.3f} (moeda = 0.693). Detalhes em docs/VALIDACAO.md.")
    for a in meta["avisos"]:
        print(f"AVISO: {a}")
    print(f"Arquivos gravados em {RAIZ / 'data'}")


if __name__ == "__main__":
    main()
