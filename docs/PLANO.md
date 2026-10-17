# UFC Predictor — Plano técnico

Uso pessoal, custo R$ 0. Documento escrito em 17/10/2026, depois de testar cada fonte de dados nesse dia.

## 1. Fontes de dados (verificadas em 17/10/2026)

| Fonte | O que fornece | Acesso | Situação |
|---|---|---|---|
| **UFCStats.com** (direto) | Histórico completo: resultados, golpes, quedas, controle | Site HTML, sem API | **Bloqueado para robôs.** Agora o site mostra a página "Checking your browser…", com um desafio em JavaScript. Não vamos contornar essa proteção. |
| **Greco1899/scrape_ufc_stats** (GitHub) | Cópia em CSV dos dados do UFCStats: 792 eventos, 8.962 lutas, estatísticas por round e dados físicos dos atletas | Download direto e gratuito via `raw.githubusercontent.com` | **Funciona.** Última atualização: 11/10/2026, que já inclui o evento de 10/10/2026. O autor atualiza com frequência, mas é um projeto voluntário, sem garantia. Licença GPL-3.0. |
| **ESPN** (`site.api.espn.com`, `sports.core.api.espn.com`) | Próximos eventos com o card completo, categoria, cartel e card principal/preliminar | JSON sem chave | **Funciona, mas é uma API não oficial e não documentada.** Pode mudar ou sair do ar sem aviso. Fazemos poucas requisições, 1 vez por dia. |
| Wikipedia (API MediaWiki) | Lista de eventos | API pública, conteúdo CC BY-SA | Fica como reserva, caso a ESPN pare de funcionar. |

O UFC não tem uma API oficial gratuita de estatísticas. Odds de casas de apostas ficam fora desta versão.

### Limitações dos dados
- O histórico vem de terceiros (o espelho do Greco1899). Se ele parar de atualizar, o app mostra a data do último dado e avisa que está desatualizado.
- O CSV de lutas traz só o **nome** dos atletas, sem um identificador. Por isso, homônimos (hoje 9 casos) não podem ser separados com segurança e entram como "dados ambíguos", sem previsão.
- Atletas estreantes no UFC não têm histórico no UFCStats e entram como "dados insuficientes", sem previsão.
- Os nomes da ESPN e do UFCStats às vezes diferem (acentos, grafia). Normalizamos acentos e pontuação. Quando os nomes não batem, o caso é reportado e não é adivinhado.

## 2. Arquitetura

```
 [GitHub Actions, 1x/dia, grátis]            [Celular Android]
  pipeline Python                             App Expo (APK)
   1. baixa CSVs (Greco1899)                   - baixa data/*.json do GitHub
   2. baixa próximos cards (ESPN)   ──JSON──▶  - guarda cópia local
   3. treina/aplica modelo                     - funciona offline com a última cópia
   4. grava data/*.json no repositório         - mostra data da atualização e avisos
```

- **Sem servidor e sem chaves secretas.** O app só lê arquivos JSON públicos do seu repositório no GitHub.
- **O computador não precisa ficar ligado** se o GitHub Actions for usado. O repositório precisa ser **público** para o app baixar os JSON sem token. Os dados já são públicos, então isso não expõe nada seu.
- **Alternativa 100% local:** rodar `atualizar.bat` no PC e enviar com `git push`. Nesse caso, a atualização depende do PC estar ligado.

### Modelo (etapa 2)
1. **Elo** por atleta, calculado em ordem cronológica. Mede a qualidade dos adversários.
2. **Regressão logística** (scikit-learn) para P(vitória). Usa diferenças de Elo, forma recente e médias por minuto **anteriores à luta**: golpes significativos, precisão, defesa, quedas, defesa de quedas e controle.
3. **Método de vitória:** P(KO/TKO | vitória), P(finalização | vitória) e P(decisão | vitória), estimadas a partir do histórico de cada atleta e do adversário, com suavização para a média da categoria. As três somam P(vitória) por construção.
4. **Validação temporal:** treino até a data X e teste só em lutas posteriores, sem vazamento. Métricas: acurácia, log-loss, Brier e curva de calibração.
5. Odd justa = 1 / probabilidade, sempre com o rótulo "odd justa estimada (não é cotação de casa de apostas)".

### App (etapas 3–5)
- Expo SDK 58 + TypeScript (versão atual no npm em 17/10/2026). Será revalidado na etapa 3.
- Armazenamento local: AsyncStorage/arquivo. Sem banco de dados pago.
- APK via **EAS Build, plano Free**. A página de preços da Expo indica 15 builds Android por mês. Precisa de uma conta gratuita na Expo, e o APK não precisa ser publicado na Play Store. A alternativa é build local com Android Studio (pesado, uns 10 GB).

## 3. Etapas

| # | Etapa | Verificação |
|---|---|---|
| **1** | **Pipeline de dados:** baixar histórico e próximos cards, cruzar atletas, gerar `data/eventos.json` e `data/meta.json` com avisos | Testes automáticos + execução real |
| 2 | Modelo Elo + logística + métodos, com validação temporal e relatório | Métricas em dados de teste fora da amostra |
| 3 | App Expo: lista de eventos e de lutas, offline | Rodar no celular via Expo Go |
| 4 | Tela do confronto: probabilidades, métodos, odds justas e comparativo | Expo Go |
| 5 | Histórico de previsões × resultados reais | Comparação automática após cada evento |
| 6 | GitHub Actions (atualização diária) + APK via EAS | APK instalado no celular |

## 4. Custos
Nenhum. GitHub (repositório público + Actions), conta Expo Free e as fontes de dados são gratuitos. Nada é contratado.
