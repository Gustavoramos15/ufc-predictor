// Copia os JSON gerados pelo pipeline (../data) para dentro do app (assets/dados).
// Eles vão embutidos no APK: o app abre com dados mesmo sem internet na primeira vez.
const fs = require("fs");
const path = require("path");

const origem = path.join(__dirname, "..", "..", "data");
const destino = path.join(__dirname, "..", "assets", "dados");
const arquivos = ["meta.json", "eventos.json", "previsoes_registro.json", "validacao.json"];

fs.mkdirSync(destino, { recursive: true });
for (const arq of arquivos) {
  const de = path.join(origem, arq);
  if (!fs.existsSync(de)) {
    console.error(`Arquivo ausente: ${de}. Rode o pipeline antes (atualizar.bat).`);
    process.exit(1);
  }
  fs.copyFileSync(de, path.join(destino, arq));
}
console.log(`Dados copiados para ${destino}`);
