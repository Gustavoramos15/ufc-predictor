// Endereço público da pasta data/ no seu repositório do GitHub (sem chave secreta: só leitura de arquivos públicos).
// Exemplo: "https://raw.githubusercontent.com/SEU_USUARIO/ufc-predictor/main/data/"
// Enquanto for null, o app usa apenas os dados embutidos no APK.
export const URL_DADOS: string | null = "https://raw.githubusercontent.com/Gustavoramos15/ufc-predictor/main/data/";

// Depois de quantas horas os dados são considerados "antigos" na tela.
export const HORAS_DADOS_ANTIGOS = 48;
