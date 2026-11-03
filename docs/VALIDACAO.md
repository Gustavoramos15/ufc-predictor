# Validação do modelo

Gerado automaticamente em 03/11/2026 03:25 UTC. Versão do modelo: `elo-logistica-v1`.

## Como foi testado
- **Treino:** lutas até 2023-01-01 (exclusive).
- **Validação** (usada para escolher os parâmetros): 2023-01-01 a 2024-01-01 (exclusive).
- **Teste** (nunca usado para escolher nada): a partir de 2024-01-01.
- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).
- Critério: lutas em que os dois atletas tinham ao menos 2 lutas no UFC antes.

## Resultado no teste

| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |
|---|---|---|---|---|
| **Elo + regressão logística** | 1013 | 65,8% | 0,633 | 0,221 |
| Só Elo | 1013 | 55,1% | 0,679 | 0,243 |
| Moeda (50% / 50%) | 1013 | 50,0% | 0,693 | 0,250 |
| Elo + logística, incluindo atletas com pouco histórico | 1501 | 63,4% | 0,643 | 0,226 |

## Calibração (quando o modelo diz X%, acontece X%?)

| Faixa prevista | Previsões | Média prevista | Frequência real |
|---|---|---|---|
| 10-20% | 14 | 17,7% | 14,3% |
| 20-30% | 133 | 26,4% | 18,8% |
| 30-40% | 337 | 35,6% | 32,6% |
| 40-50% | 529 | 44,9% | 39,5% |
| 50-60% | 529 | 55,1% | 60,5% |
| 60-70% | 337 | 64,4% | 67,4% |
| 70-80% | 133 | 73,6% | 81,2% |
| 80-90% | 14 | 82,3% | 85,7% |

Faixas com poucas previsões têm muita variação aleatória.

## Método de vitória (dado o vencedor)
- Lutas avaliadas: 1012.
- Log-loss do modelo: 0,935. Usando só a média da divisão: 0,989 (menor é melhor).

## Parâmetros escolhidos na validação
- `elo_k`: 64
- `penalidade_l2`: 100.0
- `metodo_peso`: 0.5
- `metodo_alfa`: 2.0

## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)
- `elo`: 0.1553
- `experiencia`: 0.0898
- `forma_recente`: -0.0318
- `golpes_por_min`: 0.1048
- `golpes_sofridos_por_min`: -0.1854
- `precisao_golpes`: 0.0934
- `defesa_golpes`: 0.1193
- `quedas_por_15min`: 0.1892
- `precisao_quedas`: -0.0456
- `defesa_quedas`: 0.0649
- `controle`: -0.0497
- `tentativas_finalizacao_por_15min`: -0.0023
- `knockdowns_por_15min`: -0.0055
- `taxa_vitorias_antes_do_fim`: 0.0754
- `taxa_derrotas_antes_do_fim`: -0.104
- `idade`: -0.3289
- `envergadura`: 0.0795
- `inatividade`: -0.033

## Limites
- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas
  de apostas, e nada aqui indica que apostar com ele seja lucrativo.
- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.
