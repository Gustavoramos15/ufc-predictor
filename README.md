# UFC Predictor (uso pessoal)

Previsões estatísticas para lutas do UFC. Este projeto não tem fins comerciais e não mostra cotações de casas de apostas.
As odds exibidas serão **odds justas estimadas** pelo modelo, e não promessas de resultado.

Plano completo, fontes de dados e limitações: [docs/PLANO.md](docs/PLANO.md).

## Situação atual: Etapas 1 (dados) e 2 (modelo) concluídas

O pipeline baixa o histórico de lutas e os próximos cards do UFC, cruza os atletas, treina e valida o modelo e grava:

- `data/eventos.json`: próximos eventos, lutas, card (principal/preliminar), histórico e estatísticas de cada atleta e a **previsão**. A previsão traz a probabilidade de vitória e de cada método (KO/TKO, finalização, decisão), com as odds justas. Lutas sem dados suficientes ficam sem previsão e com um aviso.
- `data/meta.json`: datas de atualização de cada fonte, totais, resumo do modelo e avisos.
- `data/validacao.json` e [docs/VALIDACAO.md](docs/VALIDACAO.md): o desempenho do modelo em lutas de 2024 em diante, que ele nunca viu no treino.
- `data/previsoes_registro.json`: a última previsão feita antes de cada evento. Ela nunca é alterada depois que o evento começa e serve para comparar com o resultado real (etapa 5).

## Como usar (Windows)

**Primeira vez (instalação, uns 2 minutos):** abra o PowerShell na pasta do projeto e rode:

```
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r pipeline\requirements.txt
```

**Atualizar os dados:** dê dois cliques em `atualizar.bat`, ou rode:

```
cd pipeline
..\.venv\Scripts\python.exe -m ufc_pipeline.atualizar
```

**Rodar os testes:**

```
cd pipeline
..\.venv\Scripts\python.exe -m pytest
```

## Observação sobre este computador
O Controle de Aplicativo do Windows (Smart App Control) bloqueia bibliotecas compiladas, como numpy e pandas.
Por isso, o pipeline usa só a biblioteca padrão do Python. Não desative essa proteção por causa deste projeto.
