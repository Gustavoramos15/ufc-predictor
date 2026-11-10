# Validação do modelo

Gerado automaticamente em 10/11/2026 04:01 UTC. Versão do modelo: `elo-logistica-v1`.

## Como foi testado
- **Treino:** lutas até 2023-01-01 (exclusive).
- **Validação** (usada para escolher os parâmetros): 2023-01-01 a 2024-01-01 (exclusive).
- **Teste** (nunca usado para escolher nada): a partir de 2024-01-01.
- Antes de cada luta, as variáveis usam só lutas de datas anteriores (sem vazamento do futuro).
- Critério: lutas em que os dois atletas tinham ao menos 2 lutas no UFC antes.

## Resultado no teste

| Modelo | Lutas | Acerto do favorito | Log-loss (menor é melhor) | Brier (menor é melhor) |
|---|---|---|---|---|
| **Elo + regressão logística** | 1018 | 65,9% | 0,632 | 0,221 |
| Só Elo | 1018 | 55,2% | 0,679 | 0,243 |
| Moeda (50% / 50%) | 1018 | 50,0% | 0,693 | 0,250 |
| Elo + logística, incluindo atletas com pouco histórico | 1515 | 63,4% | 0,642 | 0,226 |

## Calibração (quando o modelo diz X%, acontece X%?)

| Faixa prevista | Previsões | Média prevista | Frequência real |
|---|---|---|---|
| 10-20% | 14 | 17,7% | 14,3% |
| 20-30% | 134 | 26,4% | 18,7% |
| 30-40% | 340 | 35,6% | 32,4% |
| 40-50% | 530 | 44,9% | 39,6% |
| 50-60% | 530 | 55,1% | 60,4% |
| 60-70% | 340 | 64,4% | 67,6% |
| 70-80% | 134 | 73,6% | 81,3% |
| 80-90% | 14 | 82,3% | 85,7% |

Faixas com poucas previsões têm muita variação aleatória.

## Método de vitória (dado o vencedor)
- Lutas avaliadas: 1017.
- Log-loss do modelo: 0,935. Usando só a média da divisão: 0,988 (menor é melhor).

## Parâmetros escolhidos na validação
- `elo_k`: 64
- `penalidade_l2`: 100.0
- `metodo_peso`: 0.5
- `metodo_alfa`: 2.0

## Pesos do modelo final (variáveis padronizadas; positivo favorece quem tem o valor maior)
- `elo`: 0.1553
- `experiencia`: 0.0907
- `forma_recente`: -0.0335
- `golpes_por_min`: 0.1046
- `golpes_sofridos_por_min`: -0.1872
- `precisao_golpes`: 0.0929
- `defesa_golpes`: 0.119
- `quedas_por_15min`: 0.1901
- `precisao_quedas`: -0.045
- `defesa_quedas`: 0.0646
- `controle`: -0.0499
- `tentativas_finalizacao_por_15min`: -0.0024
- `knockdowns_por_15min`: -0.0061
- `taxa_vitorias_antes_do_fim`: 0.076
- `taxa_derrotas_antes_do_fim`: -0.1039
- `idade`: -0.3295
- `envergadura`: 0.0797
- `inatividade`: -0.0354

## Limites
- Estes números medem acerto estatístico, **não lucro**. O modelo não foi comparado com odds de casas
  de apostas, e nada aqui indica que apostar com ele seja lucrativo.
- MMA tem muita incerteza: lesões, mudança de categoria e estreias não aparecem nos dados.
