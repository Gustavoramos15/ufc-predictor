"""Modelo de previsão do UFC Predictor (somente Python padrão; numpy é bloqueado neste PC).

Como funciona, em linguagem simples:
1. Percorremos o histórico em ordem de data. Antes de cada luta, "fotografamos" o que se sabia
   de cada atleta ATÉ aquele dia (Elo, cartel, médias de golpes, quedas...). Só depois de
   fotografar todas as lutas de um dia é que os resultados daquele dia são somados.
   Isso evita vazamento de informação do futuro.
2. Regressão logística (sem intercepto) sobre as DIFERENÇAS entre os dois atletas -> P(vitória).
   Sem intercepto e com diferenças, P(A) + P(B) = 1 e a ordem dos atletas não importa.
3. Método de vitória: mistura das taxas do vencedor (como ele costuma vencer) com as do
   perdedor (como ele costuma perder), suavizadas pela média da divisão.
   P(A por KO) + P(A por finalização) + P(A por decisão) = P(A) por construção.
"""
import math
from collections import Counter, defaultdict, deque
from datetime import date

from .estatisticas import duracao_segundos
from .nomes import normalizar_nome

METODOS = ("KO/TKO", "FINALIZACAO", "DECISAO")
ELO_INICIAL = 1500.0
MIN_LUTAS_UFC = 2

FEATURES = (
    "elo", "experiencia", "forma_recente", "golpes_por_min", "golpes_sofridos_por_min",
    "precisao_golpes", "defesa_golpes", "quedas_por_15min", "precisao_quedas", "defesa_quedas",
    "controle", "tentativas_finalizacao_por_15min", "knockdowns_por_15min",
    "taxa_vitorias_antes_do_fim", "taxa_derrotas_antes_do_fim", "idade", "envergadura", "inatividade",
)

# "Pseudo-observações": atletas com pouco histórico são puxados para a média geral.
M0 = 15 * 60   # 15 minutos de luta "médios"
A0 = 30        # 30 golpes tentados "médios"
T0 = 5         # 5 quedas tentadas "médias"


def normalizar_divisao(texto: str | None) -> str:
    s = (texto or "").lower()
    mulher = "women" in s or s.startswith("w ")
    for base in ("light heavyweight", "heavyweight", "middleweight", "welterweight", "lightweight",
                 "featherweight", "bantamweight", "flyweight", "strawweight"):
        if base in s:
            return ("w " if mulher else "") + base
    return "*"


# ---------------------------------------------------------------- médias gerais (priors)

def calcular_priors(lutas: list[dict], ate: date | None = None) -> dict:
    """Médias gerais calculadas SÓ com lutas anteriores a `ate` (sem olhar o período de teste)."""
    t = Counter()
    metodos: dict[str, Counter] = defaultdict(Counter)
    for l in lutas:
        if ate and l["data"] >= ate:
            continue
        dur = l.get("duracao_s")
        if l.get("stats") and dur:
            for lado in "AB":
                t["secs"] += dur
                for c, v in l["stats"][lado].items():
                    t[c] += v
        if l["resultado"] in ("A", "B") and l["metodo"] in METODOS:
            metodos[l["divisao"]][l["metodo"]] += 1
            metodos["*"][l["metodo"]] += 1
    geral = metodos["*"]
    n_geral = sum(geral.values()) or 1
    prior_geral = {m: (geral[m] + 1) / (n_geral + 3) for m in METODOS}
    prior_metodos = {"*": prior_geral}
    for div, c in metodos.items():
        n = sum(c.values())
        prior_metodos[div] = {m: (c[m] + 20 * prior_geral[m]) / (n + 20) for m in METODOS}
    minutos = max(t["secs"], 1) / 60
    return {
        "golpes_min": t["sig_l"] / minutos,
        "precisao": t["sig_l"] / max(t["sig_a"], 1),
        "quedas_15": t["td_l"] / minutos * 15,
        "precisao_quedas": t["td_l"] / max(t["td_a"], 1),
        "controle": t["ctrl"] / max(t["secs"], 1),
        "fin_15": t["sub"] / minutos * 15,
        "kd_15": t["kd"] / minutos * 15,
        "metodos": prior_metodos,
    }


# ---------------------------------------------------------------- estado de cada atleta

def _novo_estado() -> dict:
    e = dict.fromkeys(("n", "v", "d", "secs", "sig_l", "sig_a", "osig_l", "osig_a",
                       "td_l", "td_a", "otd_l", "otd_a", "ctrl", "sub", "kd"), 0)
    e.update(elo=ELO_INICIAL, recentes=deque(maxlen=5), vit=Counter(), der=Counter(), ultima=None)
    return e


def _anos(d1: date, d0: date) -> float:
    return (d1 - d0).days / 365.25


def vetor_atleta(e: dict, perfil: dict | None, dia: date, pr: dict) -> dict:
    """Valores do atleta antes da luta, suavizados para a média geral quando há poucos dados."""
    secs = e["secs"] + M0
    minutos = secs / 60
    nasc = (perfil or {}).get("nascimento")
    rec = e["recentes"]
    return {
        "elo": e["elo"] / 100,
        "experiencia": math.log1p(e["n"]),
        "forma_recente": (sum(r == "V" for r in rec) + 1) / (len(rec) + 2),
        "golpes_por_min": (e["sig_l"] + pr["golpes_min"] * M0 / 60) / minutos,
        "golpes_sofridos_por_min": (e["osig_l"] + pr["golpes_min"] * M0 / 60) / minutos,
        "precisao_golpes": (e["sig_l"] + pr["precisao"] * A0) / (e["sig_a"] + A0),
        "defesa_golpes": 1 - (e["osig_l"] + pr["precisao"] * A0) / (e["osig_a"] + A0),
        "quedas_por_15min": (e["td_l"] + pr["quedas_15"] * M0 / 900) / (secs / 900),
        "precisao_quedas": (e["td_l"] + pr["precisao_quedas"] * T0) / (e["td_a"] + T0),
        "defesa_quedas": 1 - (e["otd_l"] + pr["precisao_quedas"] * T0) / (e["otd_a"] + T0),
        "controle": (e["ctrl"] + pr["controle"] * M0) / secs,
        "tentativas_finalizacao_por_15min": (e["sub"] + pr["fin_15"] * M0 / 900) / (secs / 900),
        "knockdowns_por_15min": (e["kd"] + pr["kd_15"] * M0 / 900) / (secs / 900),
        "taxa_vitorias_antes_do_fim": (e["vit"]["KO/TKO"] + e["vit"]["FINALIZACAO"] + 0.5) / (e["n"] + 2),
        "taxa_derrotas_antes_do_fim": (e["der"]["KO/TKO"] + e["der"]["FINALIZACAO"] + 0.5) / (e["n"] + 2),
        "idade": _anos(dia, nasc) if nasc else None,
        "envergadura": (perfil or {}).get("envergadura"),
        "inatividade": math.log1p((dia - e["ultima"]).days) if e["ultima"] else None,
    }


def diferenca(va: dict, vb: dict) -> list[float]:
    """A - B para cada variável. Se faltar o dado de um dos dois, a diferença é 0 (neutra)."""
    return [0.0 if va[f] is None or vb[f] is None else va[f] - vb[f] for f in FEATURES]


def _atualizar(ea: dict, eb: dict, luta: dict, k: float) -> None:
    res = luta["resultado"]
    if res != "sem_resultado":
        esperado = 1 / (1 + 10 ** ((eb["elo"] - ea["elo"]) / 400))
        real = {"A": 1.0, "B": 0.0, "empate": 0.5}[res]
        ea["elo"] += k * (real - esperado)
        eb["elo"] -= k * (real - esperado)
        ea["recentes"].append({"A": "V", "B": "D"}.get(res, "E"))
        eb["recentes"].append({"B": "V", "A": "D"}.get(res, "E"))
    for e in (ea, eb):
        e["n"] += 1
        e["ultima"] = luta["data"]
    if res in ("A", "B"):
        venc, perd = (ea, eb) if res == "A" else (eb, ea)
        venc["v"] += 1
        perd["d"] += 1
        venc["vit"][luta["metodo"]] += 1
        perd["der"][luta["metodo"]] += 1
    st, dur = luta.get("stats"), luta.get("duracao_s")
    if st and dur:
        for e, s, o in ((ea, st["A"], st["B"]), (eb, st["B"], st["A"])):
            e["secs"] += dur
            for c in ("sig_l", "sig_a", "td_l", "td_a", "ctrl", "sub", "kd"):
                e[c] += s[c]
            e["osig_l"] += o["sig_l"]
            e["osig_a"] += o["sig_a"]
            e["otd_l"] += o["td_l"]
            e["otd_a"] += o["td_a"]


def preparar_lutas(lutas: list[dict]) -> None:
    for l in lutas:
        l["duracao_s"] = duracao_segundos(l["round"], l.get("tempo"), l.get("formato"))
        l["divisao"] = normalizar_divisao(l["categoria"])


def gerar_amostras(lutas: list[dict], perfis: dict, pr: dict, k: float) -> tuple[list[dict], dict]:
    """Percorre o histórico por data. Retorna (amostras com vencedor definido, estado final dos atletas)."""
    estado: dict[str, dict] = defaultdict(_novo_estado)
    amostras = []
    i = 0
    while i < len(lutas):
        dia = lutas[i]["data"]
        j = i
        while j < len(lutas) and lutas[j]["data"] == dia:
            j += 1
        grupo = lutas[i:j]
        for l in grupo:  # 1) fotografa antes de qualquer resultado do dia
            if l["resultado"] not in ("A", "B"):
                continue
            na, nb = normalizar_nome(l["lutador_a"]), normalizar_nome(l["lutador_b"])
            ea, eb = estado[na], estado[nb]
            amostras.append({
                "data": dia,
                "x": diferenca(vetor_atleta(ea, perfis.get(na), dia, pr), vetor_atleta(eb, perfis.get(nb), dia, pr)),
                "y": 1 if l["resultado"] == "A" else 0,
                "min_lutas": min(ea["n"], eb["n"]),
                "divisao": l["divisao"],
                "metodo": l["metodo"],
                "vit_a": dict(ea["vit"]), "der_a": dict(ea["der"]),
                "vit_b": dict(eb["vit"]), "der_b": dict(eb["der"]),
            })
        for l in grupo:  # 2) só então soma os resultados do dia
            _atualizar(estado[normalizar_nome(l["lutador_a"])], estado[normalizar_nome(l["lutador_b"])], l, k)
        i = j
    return amostras, estado


# ---------------------------------------------------------------- regressão logística

def _sigmoide(z: float) -> float:
    if z >= 0:
        return 1 / (1 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1 + ez)


def resolver_sistema(a: list[list[float]], b: list[float]) -> list[float]:
    """Resolve a·x = b por eliminação de Gauss com pivotamento."""
    n = len(b)
    m = [linha[:] + [b[i]] for i, linha in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        if abs(m[c][c]) < 1e-12:
            raise ValueError("sistema singular")
        for r in range(c + 1, n):
            f = m[r][c] / m[c][c]
            if f:
                for k in range(c, n + 1):
                    m[r][k] -= f * m[c][k]
    x = [0.0] * n
    for r in range(n - 1, -1, -1):
        x[r] = (m[r][n] - sum(m[r][k] * x[k] for k in range(r + 1, n))) / m[r][r]
    return x


def escalas(xs: list[list[float]]) -> list[float]:
    """Raiz da média dos quadrados de cada variável (as diferenças são simétricas em torno de zero)."""
    n = len(xs)
    return [math.sqrt(sum(x[j] ** 2 for x in xs) / n) or 1.0 for j in range(len(xs[0]))]


def treinar_logistica(xs: list[list[float]], ys: list[int], penalidade: float, iteracoes: int = 30) -> list[float]:
    """Regressão logística sem intercepto com penalidade L2, ajustada pelo método de Newton."""
    p = len(xs[0])
    w = [0.0] * p
    for _ in range(iteracoes):
        grad = [penalidade * wj for wj in w]
        hess = [[penalidade if i == j else 0.0 for j in range(p)] for i in range(p)]
        for x, y in zip(xs, ys):
            pi = _sigmoide(sum(wj * xj for wj, xj in zip(w, x)))
            g, r = pi - y, pi * (1 - pi)
            for j in range(p):
                grad[j] += g * x[j]
                rx = r * x[j]
                if rx:
                    linha = hess[j]
                    for k in range(j, p):
                        linha[k] += rx * x[k]
        for j in range(p):
            for k in range(j):
                hess[j][k] = hess[k][j]
        passo = resolver_sistema(hess, grad)
        w = [wj - sj for wj, sj in zip(w, passo)]
        if max(abs(s) for s in passo) < 1e-7:
            break
    return w


def prob_vitoria(w: list[float], esc: list[float], x: list[float]) -> float:
    return _sigmoide(sum(wj * xj / ej for wj, xj, ej in zip(w, x, esc)))


# ---------------------------------------------------------------- métodos de vitória

def dist_metodos(vit: dict, der_oponente: dict, prior: dict, peso: float, alfa: float) -> dict:
    """P(método | este atleta vence). Soma 1."""
    nv = sum(vit.get(m, 0) for m in METODOS)
    nd = sum(der_oponente.get(m, 0) for m in METODOS)
    return {
        m: peso * (vit.get(m, 0) + alfa * prior[m]) / (nv + alfa)
        + (1 - peso) * (der_oponente.get(m, 0) + alfa * prior[m]) / (nd + alfa)
        for m in METODOS
    }


def _prior_div(pr: dict, div: str) -> dict:
    return pr["metodos"].get(div) or pr["metodos"]["*"]


# ---------------------------------------------------------------- métricas

def metricas(ps: list[float], ys: list[int]) -> dict:
    n = len(ys)
    if not n:
        return {"n": 0}
    eps = 1e-12
    # Probabilidade exatamente 50% conta meio acerto (não favorece quem foi listado primeiro).
    acertos = sum(0.5 if p == 0.5 else float((p > 0.5) == (y == 1)) for p, y in zip(ps, ys))
    return {
        "n": n,
        "acuracia": acertos / n,
        "log_loss": -sum(math.log(max(p if y else 1 - p, eps)) for p, y in zip(ps, ys)) / n,
        "brier": sum((p - y) ** 2 for p, y in zip(ps, ys)) / n,
    }


def calibracao(ps: list[float], ys: list[int], faixas: int = 10) -> list[dict]:
    """Agrupa as previsões por faixa e compara com a frequência real. Usa os dois lados de cada luta."""
    caixas = defaultdict(list)
    for p, y in zip(ps, ys):
        for pp, yy in ((p, y), (1 - p, 1 - y)):
            caixas[min(int(pp * faixas), faixas - 1)].append((pp, yy))
    return [
        {"faixa": f"{b * 100 // faixas}-{(b + 1) * 100 // faixas}%", "n": len(v),
         "prob_media_prevista": sum(p for p, _ in v) / len(v), "frequencia_real": sum(y for _, y in v) / len(v)}
        for b, v in sorted(caixas.items())
    ]


def _logloss_metodos(amostras: list[dict], pr: dict, peso: float, alfa: float) -> float:
    total, n = 0.0, 0
    for a in amostras:
        if a["metodo"] not in METODOS:
            continue
        if a["y"] == 1:
            d = dist_metodos(a["vit_a"], a["der_b"], _prior_div(pr, a["divisao"]), peso, alfa)
        else:
            d = dist_metodos(a["vit_b"], a["der_a"], _prior_div(pr, a["divisao"]), peso, alfa)
        total -= math.log(max(d[a["metodo"]], 1e-12))
        n += 1
    return total / max(n, 1)


# ---------------------------------------------------------------- treino, validação e previsão

def _ajustar(amostras: list[dict], penalidade: float) -> tuple[list[float], list[float]]:
    xs = [a["x"] for a in amostras]
    esc = escalas(xs)
    xs_esc = [[v / e for v, e in zip(x, esc)] for x in xs]
    return treinar_logistica(xs_esc, [a["y"] for a in amostras], penalidade), esc


def _filtrar(amostras, ini=None, fim=None, min_lutas=0):
    return [a for a in amostras if (ini is None or a["data"] >= ini) and (fim is None or a["data"] < fim)
            and a["min_lutas"] >= min_lutas]


def validar_e_treinar(lutas: list[dict], perfis: dict, inicio_validacao: date, inicio_teste: date,
                      ks=(32, 48, 64, 96, 128), penalidades=(1.0, 10.0, 100.0, 1000.0),
                      pesos=(0.0, 0.25, 0.5, 0.75, 1.0), alfas=(0.5, 1.0, 2.0, 5.0, 10.0)) -> tuple[dict, dict]:
    """Escolhe parâmetros na validação, mede no teste (nunca visto) e treina o modelo final com tudo.

    Treino: lutas antes de `inicio_validacao`. Validação: [inicio_validacao, inicio_teste).
    Teste: a partir de `inicio_teste`. Retorna (relatório, modelo final).
    """
    preparar_lutas(lutas)
    # 1) Fator K do Elo: escolhido pelo log-loss do próprio Elo na validação.
    pr_val = calcular_priors(lutas, inicio_validacao)
    melhor_k, melhor_ll, amostras_k = None, math.inf, {}
    for k in ks:
        amostras, _ = gerar_amostras(lutas, perfis, pr_val, k)
        val = _filtrar(amostras, inicio_validacao, inicio_teste, MIN_LUTAS_UFC)
        if len(_filtrar(amostras, fim=inicio_validacao)) < 50 or len(val) < 20 \
                or len(_filtrar(amostras, ini=inicio_teste, min_lutas=MIN_LUTAS_UFC)) < 20:
            raise ValueError("histórico pequeno demais para treinar e validar o modelo")
        ll = metricas([_sigmoide(a["x"][0] * 100 * math.log(10) / 400) for a in val], [a["y"] for a in val])["log_loss"]
        amostras_k[k] = amostras
        if ll < melhor_ll:
            melhor_k, melhor_ll = k, ll
    amostras = amostras_k[melhor_k]
    treino = _filtrar(amostras, fim=inicio_validacao)
    val = _filtrar(amostras, inicio_validacao, inicio_teste, MIN_LUTAS_UFC)

    # 2) Penalidade L2 da regressão logística.
    melhor_pen, melhor_ll = None, math.inf
    for pen in penalidades:
        w, esc = _ajustar(treino, pen)
        ll = metricas([prob_vitoria(w, esc, a["x"]) for a in val], [a["y"] for a in val])["log_loss"]
        if ll < melhor_ll:
            melhor_pen, melhor_ll = pen, ll

    # 3) Modelo de métodos: peso entre "como vence" e "como o oponente perde", e suavização.
    peso, alfa = min(((p, a) for p in pesos for a in alfas), key=lambda pa: _logloss_metodos(val, pr_val, *pa))

    # 4) Teste: re-treina com tudo antes do teste e avalia só depois de `inicio_teste`.
    pr_teste = calcular_priors(lutas, inicio_teste)
    amostras_t, _ = gerar_amostras(lutas, perfis, pr_teste, melhor_k)
    w, esc = _ajustar(_filtrar(amostras_t, fim=inicio_teste), melhor_pen)
    teste_todos = _filtrar(amostras_t, ini=inicio_teste)
    teste = _filtrar(amostras_t, ini=inicio_teste, min_lutas=MIN_LUTAS_UFC)
    ys = [a["y"] for a in teste]
    ps = [prob_vitoria(w, esc, a["x"]) for a in teste]
    ps_elo = [_sigmoide(a["x"][0] * 100 * math.log(10) / 400) for a in teste]
    with_m = [a for a in teste if a["metodo"] in METODOS]
    prior_m = sum(math.log(_prior_div(pr_teste, a["divisao"])[a["metodo"]]) for a in with_m)
    relatorio = {
        "periodos": {
            "treino": f"até {inicio_validacao.isoformat()} (exclusive)",
            "validacao": f"{inicio_validacao.isoformat()} a {inicio_teste.isoformat()} (exclusive)",
            "teste": f"a partir de {inicio_teste.isoformat()}",
        },
        "parametros": {"elo_k": melhor_k, "penalidade_l2": melhor_pen, "metodo_peso": peso, "metodo_alfa": alfa},
        "teste": {
            "criterio": f"lutas em que os dois atletas tinham ao menos {MIN_LUTAS_UFC} lutas no UFC antes",
            "modelo": metricas(ps, ys),
            "so_elo": metricas(ps_elo, ys),
            "moeda_50_50": metricas([0.5] * len(ys), ys),
            "todas_as_lutas_modelo": metricas([prob_vitoria(w, esc, a["x"]) for a in teste_todos],
                                              [a["y"] for a in teste_todos]),
            "calibracao_todas_as_faixas": calibracao(ps, ys),
            "metodo_dado_vencedor": {
                "n": len(with_m),
                "log_loss_modelo": _logloss_metodos(with_m, pr_teste, peso, alfa),
                "log_loss_media_da_divisao": -prior_m / max(len(with_m), 1),
            },
        },
    }

    # 5) Modelo final: mesmos parâmetros, treinado com todo o histórico.
    pr_final = calcular_priors(lutas)
    amostras_f, estado = gerar_amostras(lutas, perfis, pr_final, melhor_k)
    w, esc = _ajustar(amostras_f, melhor_pen)
    relatorio["coeficientes"] = {f: round(c, 4) for f, c in zip(FEATURES, w)}
    modelo = {"w": w, "esc": esc, "priors": pr_final, "estado": estado, "perfis": perfis,
              "peso": peso, "alfa": alfa, "treinado_ate": lutas[-1]["data"].isoformat(), "n_treino": len(amostras_f)}
    return relatorio, modelo


def _odd(p: float) -> float | None:
    return round(1 / p, 2) if p > 0 else None


def prever(modelo: dict, nome_a: str, nome_b: str, categoria: str | None, dia: date) -> dict:
    na, nb = normalizar_nome(nome_a), normalizar_nome(nome_b)
    ea = modelo["estado"].get(na) or _novo_estado()
    eb = modelo["estado"].get(nb) or _novo_estado()
    pr = modelo["priors"]
    x = diferenca(vetor_atleta(ea, modelo["perfis"].get(na), dia, pr),
                  vetor_atleta(eb, modelo["perfis"].get(nb), dia, pr))
    pa = prob_vitoria(modelo["w"], modelo["esc"], x)
    prior = _prior_div(pr, normalizar_divisao(categoria))
    resultado = {}
    for lado, p, vit, der in (("a", pa, ea["vit"], eb["der"]), ("b", 1 - pa, eb["vit"], ea["der"])):
        d = dist_metodos(vit, der, prior, modelo["peso"], modelo["alfa"])
        resultado[lado] = {"vitoria": {"prob": round(p, 6), "odd_justa": _odd(p)}}
        for m, rotulo in (("KO/TKO", "ko_tko"), ("FINALIZACAO", "finalizacao"), ("DECISAO", "decisao")):
            pm = p * d[m]
            resultado[lado][rotulo] = {"prob": round(pm, 6), "odd_justa": _odd(pm)}
    return resultado


def estatisticas_exibicao(modelo: dict, nome: str, dia: date) -> dict | None:
    """Números BRUTOS (sem suavização) para a tela de comparação."""
    e = modelo["estado"].get(normalizar_nome(nome))
    if not e:
        return None
    minutos = e["secs"] / 60
    perfil = modelo["perfis"].get(normalizar_nome(nome)) or {}

    def div(a, b):
        return round(a / b, 3) if b else None

    return {
        "elo": round(e["elo"]),
        "minutos_com_estatisticas": round(minutos, 1),
        "golpes_sig_por_min": div(e["sig_l"], minutos),
        "golpes_sig_sofridos_por_min": div(e["osig_l"], minutos),
        "precisao_golpes": div(e["sig_l"], e["sig_a"]),
        "defesa_golpes": round(1 - e["osig_l"] / e["osig_a"], 3) if e["osig_a"] else None,
        "quedas_por_15min": div(e["td_l"] * 15, minutos),
        "precisao_quedas": div(e["td_l"], e["td_a"]),
        "defesa_quedas": round(1 - e["otd_l"] / e["otd_a"], 3) if e["otd_a"] else None,
        "controle_por_15min_s": div(e["ctrl"] * 15, minutos),
        "tentativas_finalizacao_por_15min": div(e["sub"] * 15, minutos),
        "idade": round(_anos(dia, perfil["nascimento"]), 1) if perfil.get("nascimento") else None,
        "envergadura_cm": round(perfil["envergadura"] * 2.54) if perfil.get("envergadura") else None,
    }
