# Validação do modelo

Gerado automaticamente em 18/11/2026 03:34 UTC. Versão do modelo: `elo-logistica-v1`.

## Como foi testado
- **Treino:** lutas até 2023-01-01 (exclusive).
- **Validação** (usada para escolher os parâmetros): 2023-01-01 a 2024-01-01 (exclusive).
- **Teste** (nunca usado para escolher nada): a partir de 2024-01-01.
- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).
- Critério: lutas em que os dois atletas tinham ao menos 2 lutas no UFC antes.

## Resultado no teste

| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |
|---|---|---|---|---|
| **Elo + regressão logística** | 1027 | 65,8% | 0,633 | 0,221 |
| Só Elo | 1027 | 55,3% | 0,679 | 0,243 |
| Moeda (50% / 50%) | 1027 | 50,0% | 0,693 | 0,250 |
| Elo + logística, incluindo atletas com pouco histórico | 1527 | 63,3% | 0,643 | 0,226 |

## Calibração (quando o modelo diz X%, acontece X%?)

| Faixa prevista | Previsões | Média prevista | Frequência real |
|---|---|---|---|
| 10-20% | 14 | 17,7% | 14,3% |
| 20-30% | 135 | 26,4% | 19,3% |
| 30-40% | 344 | 35,6% | 32,0% |
| 40-50% | 534 | 44,8% | 39,9% |
| 50-60% | 534 | 55,2% | 60,1% |
| 60-70% | 344 | 64,4% | 68,0% |
| 70-80% | 135 | 73,6% | 80,7% |
| 80-90% | 14 | 82,3% | 85,7% |

Faixas com poucas previsões têm muita variação aleatória.

## Método de vitória (dado o vencedor)
- Lutas avaliadas: 1026.
- Log-loss do modelo: 0,934. Usando só a média da divisão: 0,989 (menor é melhor).

## Parâmetros escolhidos na validação
- `elo_k`: 64
- `penalidade_l2`: 100.0
- `metodo_peso`: 0.5
- `metodo_alfa`: 2.0

## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)
- `elo`: 0.1553
- `experiencia`: 0.0912
- `forma_recente`: -0.0336
- `golpes_por_min`: 0.1048
- `golpes_sofridos_por_min`: -0.1875
- `precisao_golpes`: 0.0951
- `defesa_golpes`: 0.1192
- `quedas_por_15min`: 0.1913
- `precisao_quedas`: -0.0469
- `defesa_quedas`: 0.064
- `controle`: -0.052
- `tentativas_finalizacao_por_15min`: -0.0013
- `knockdowns_por_15min`: -0.007
- `taxa_vitorias_antes_do_fim`: 0.0744
- `taxa_derrotas_antes_do_fim`: -0.1038
- `idade`: -0.329
- `envergadura`: 0.0801
- `inatividade`: -0.0344

## Limites
- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas
  de apostas, e nada aqui indica que apostar com ele seja lucrativo.
- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.
