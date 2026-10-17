# UFC Predictor (uso pessoal)

Previsões estatísticas para lutas do UFC. Este projeto não tem fins comerciais e não mostra cotações de casas de apostas.
As odds exibidas serão **odds justas estimadas** pelo modelo, e não promessas de resultado.

Plano completo, fontes de dados e limitações: [docs/PLANO.md](docs/PLANO.md).

## Situação atual: Etapa 1 (pipeline de dados) concluída

O pipeline baixa o histórico de lutas e os próximos cards do UFC. Depois, cruza os atletas e grava:

- `data/eventos.json`: próximos eventos, lutas, card (principal/preliminar) e histórico UFC de cada atleta, com a indicação de quando os dados são insuficientes.
- `data/meta.json`: datas de atualização de cada fonte, totais e avisos.

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
