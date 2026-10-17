# Validação do modelo

Gerado automaticamente em 17/10/2026 23:55 UTC. Versão do modelo: `elo-logistica-v1`.

## Como foi testado
- **Treino:** lutas até 2023-01-01 (exclusive).
- **Validação** (usada para escolher os parâmetros): 2023-01-01 a 2024-01-01 (exclusive).
- **Teste** (nunca usado para escolher nada): a partir de 2024-01-01.
- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).
- Critério: lutas em que os dois atletas tinham ao menos 2 lutas no UFC antes.

## Resultado no teste

| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |
|---|---|---|---|---|
| **Elo + regressão logística** | 990 | 66,0% | 0,632 | 0,221 |
| Só Elo | 990 | 55,2% | 0,679 | 0,243 |
| Moeda (50% / 50%) | 990 | 50,0% | 0,693 | 0,250 |
| Elo + logística, incluindo atletas com pouco histórico | 1462 | 63,4% | 0,642 | 0,225 |

## Calibração (quando o modelo diz X%, acontece X%?)

| Faixa prevista | Previsões | Média prevista | Frequência real |
|---|---|---|---|
| 10-20% | 14 | 17,7% | 14,3% |
| 20-30% | 129 | 26,4% | 17,8% |
| 30-40% | 331 | 35,6% | 32,6% |
| 40-50% | 516 | 44,8% | 39,5% |
| 50-60% | 516 | 55,2% | 60,5% |
| 60-70% | 331 | 64,4% | 67,4% |
| 70-80% | 129 | 73,6% | 82,2% |
| 80-90% | 14 | 82,3% | 85,7% |

Faixas com poucas previsões têm muita variação aleatória.

## Método de vitória (dado o vencedor)
- Lutas avaliadas: 989.
- Log-loss do modelo: 0,936. Usando só a média da divisão: 0,990 (menor é melhor).

## Parâmetros escolhidos na validação
- `elo_k`: 64
- `penalidade_l2`: 100.0
- `metodo_peso`: 0.5
- `metodo_alfa`: 2.0

## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)
- `elo`: 0.1542
- `experiencia`: 0.0895
- `forma_recente`: -0.0328
- `golpes_por_min`: 0.1034
- `golpes_sofridos_por_min`: -0.1881
- `precisao_golpes`: 0.0933
- `defesa_golpes`: 0.1215
- `quedas_por_15min`: 0.1913
- `precisao_quedas`: -0.0479
- `defesa_quedas`: 0.0656
- `controle`: -0.0501
- `tentativas_finalizacao_por_15min`: -0.0033
- `knockdowns_por_15min`: -0.0048
- `taxa_vitorias_antes_do_fim`: 0.0774
- `taxa_derrotas_antes_do_fim`: -0.103
- `idade`: -0.33
- `envergadura`: 0.0798
- `inatividade`: -0.0324

## Limites
- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas
  de apostas, e nada aqui indica que apostar com ele seja lucrativo.
- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.
