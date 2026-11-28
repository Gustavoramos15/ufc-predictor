# Validação do modelo

Gerado automaticamente em 28/11/2026 03:48 UTC. Versão do modelo: `elo-logistica-v1`.

## Como foi testado
- **Treino:** lutas até 2023-01-01 (exclusive).
- **Validação** (usada para escolher os parâmetros): 2023-01-01 a 2024-01-01 (exclusive).
- **Teste** (nunca usado para escolher nada): a partir de 2024-01-01.
- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).
- Critério: lutas em que os dois atletas tinham ao menos 2 lutas no UFC antes.

## Resultado no teste

| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |
|---|---|---|---|---|
| **Elo + regressão logística** | 1036 | 65,8% | 0,632 | 0,221 |
| Só Elo | 1036 | 55,2% | 0,680 | 0,244 |
| Moeda (50% / 50%) | 1036 | 50,0% | 0,693 | 0,250 |
| Elo + logística, incluindo atletas com pouco histórico | 1539 | 63,3% | 0,642 | 0,226 |

## Calibração (quando o modelo diz X%, acontece X%?)

| Faixa prevista | Previsões | Média prevista | Frequência real |
|---|---|---|---|
| 10-20% | 14 | 17,7% | 14,3% |
| 20-30% | 138 | 26,4% | 18,8% |
| 30-40% | 346 | 35,6% | 31,8% |
| 40-50% | 538 | 44,8% | 40,1% |
| 50-60% | 538 | 55,2% | 59,9% |
| 60-70% | 346 | 64,4% | 68,2% |
| 70-80% | 138 | 73,6% | 81,2% |
| 80-90% | 14 | 82,3% | 85,7% |

Faixas com poucas previsões têm muita variação aleatória.

## Método de vitória (dado o vencedor)
- Lutas avaliadas: 1035.
- Log-loss do modelo: 0,933. Usando só a média da divisão: 0,988 (menor é melhor).

## Parâmetros escolhidos na validação
- `elo_k`: 64
- `penalidade_l2`: 100.0
- `metodo_peso`: 0.5
- `metodo_alfa`: 2.0

## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)
- `elo`: 0.1529
- `experiencia`: 0.0915
- `forma_recente`: -0.0326
- `golpes_por_min`: 0.106
- `golpes_sofridos_por_min`: -0.1895
- `precisao_golpes`: 0.0948
- `defesa_golpes`: 0.1186
- `quedas_por_15min`: 0.1916
- `precisao_quedas`: -0.0467
- `defesa_quedas`: 0.0643
- `controle`: -0.0526
- `tentativas_finalizacao_por_15min`: -0.002
- `knockdowns_por_15min`: -0.0064
- `taxa_vitorias_antes_do_fim`: 0.0746
- `taxa_derrotas_antes_do_fim`: -0.1038
- `idade`: -0.3301
- `envergadura`: 0.0807
- `inatividade`: -0.0347

## Limites
- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas
  de apostas, e nada aqui indica que apostar com ele seja lucrativo.
- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.
