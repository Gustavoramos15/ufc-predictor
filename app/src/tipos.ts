// Formato dos arquivos JSON gerados pelo pipeline Python (pasta data/ do repositório).

export type Metodo = "KO/TKO" | "FINALIZACAO" | "DECISAO" | "OUTRO";
export type StatusDados = "ok" | "insuficiente" | "nao_encontrado" | "ambiguo";
export type Segmento = "principal" | "preliminar" | "preliminar_antecipada" | "desconhecido";

export interface ProbOdd {
  prob: number;
  odd_justa: number | null;
}

export interface PrevisaoLado {
  vitoria: ProbOdd;
  ko_tko: ProbOdd;
  finalizacao: ProbOdd;
  decisao: ProbOdd;
}

export interface Previsao {
  a: PrevisaoLado;
  b: PrevisaoLado;
}

export interface HistoricoUfc {
  nome_ufcstats: string;
  lutas: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  sem_resultado: number;
  vitorias_por_metodo: Record<Metodo, number>;
  derrotas_por_metodo: Record<Metodo, number>;
  primeira_luta: string;
  ultima_luta: string;
  ultimos_5: string[];
}

export interface Estatisticas {
  elo: number;
  minutos_com_estatisticas: number;
  golpes_sig_por_min: number | null;
  golpes_sig_sofridos_por_min: number | null;
  precisao_golpes: number | null;
  defesa_golpes: number | null;
  quedas_por_15min: number | null;
  precisao_quedas: number | null;
  defesa_quedas: number | null;
  controle_por_15min_s: number | null;
  tentativas_finalizacao_por_15min: number | null;
  idade: number | null;
  envergadura_cm: number | null;
}

export interface PorMetodoMma {
  ko_tko: number;
  finalizacao: number;
  decisao_ou_outro: number;
}

/** Cartel completo no MMA (inclui lutas fora do UFC), fonte ESPN. */
export interface CarreiraMma {
  cartel: string | null;
  vitorias: number;
  derrotas: number;
  empates: number;
  vitorias_por_metodo: PorMetodoMma;
  derrotas_por_metodo: PorMetodoMma;
}

/** Médias das lutas que a ESPN transmitiu com estatísticas (ex.: Contender Series). */
export interface MediasForaUfc {
  fonte: string;
  lutas_com_estatisticas: number;
  eventos: string[];
  minutos_com_estatisticas: number;
  golpes_sig_por_min: number | null;
  precisao_golpes: number | null;
  quedas_por_15min: number | null;
  precisao_quedas: number | null;
  knockdowns_por_15min: number | null;
}

export interface Lutador {
  espn_id?: string | null;
  nome: string;
  cartel_espn: string | null;
  pais: string | null;
  status_dados: StatusDados;
  historico_ufc: HistoricoUfc | null;
  estatisticas: Estatisticas | null;
  carreira_mma?: CarreiraMma | null;
  medias_fora_ufc?: MediasForaUfc | null;
}

export interface OddLado {
  atual: number | null;
  abertura: number | null;
}

/** Odds de uma casa de apostas exibidas pela ESPN (somente leitura, para comparação). */
export interface OddsCasa {
  casa: string | null;
  fonte: string;
  consultado_em: string;
  a: OddLado;
  b: OddLado;
  total_rounds: { linha: number; mais: number | null; menos: number | null } | null;
}

export interface Luta {
  id: string;
  numero: number;
  segmento: Segmento;
  categoria: string | null;
  status: string | null;
  lutador_a: Lutador;
  lutador_b: Lutador;
  avisos: string[];
  previsao_possivel: boolean;
  previsao: Previsao | null;
  odds_casa?: OddsCasa | null;
}

export interface Evento {
  id: string;
  nome: string;
  data: string;
  status: string | null;
  lutas: Luta[];
}

export interface Metricas {
  n: number;
  acuracia: number;
  log_loss: number;
  brier: number;
}

export interface Meta {
  gerado_em: string;
  historico: {
    fonte: string;
    atualizado_com_sucesso: boolean;
    atualizacao_da_fonte: string | null;
    luta_mais_recente: string | null;
    total_lutas: number;
    total_atletas: number;
  };
  proximos_eventos: {
    fonte: string;
    atualizado_com_sucesso: boolean;
    atualizado_em: string | null;
    total_eventos: number;
    total_lutas: number;
    lutas_com_dados_suficientes: number;
  };
  modelo: {
    versao: string;
    treinado: boolean;
    treinado_ate: string | null;
    teste: Metricas | null;
    previsoes_registradas: number;
    aviso: string;
  };
  avisos: string[];
}

export interface ResultadoReal {
  vencedor: "a" | "b" | "empate" | "sem_resultado";
  metodo: Metodo;
  metodo_original: string;
  round: string;
}

export interface PrevisaoRegistrada {
  evento_id: string;
  evento: string;
  data_evento: string;
  lutador_a: string;
  lutador_b: string;
  categoria: string | null;
  previsao: Previsao;
  odds_casa?: OddsCasa | null;
  previsto_em: string;
  versao_modelo: string;
  resultado_real: ResultadoReal | null;
}

export interface Validacao {
  gerado_em: string;
  versao_modelo: string;
  periodos: { treino: string; validacao: string; teste: string };
  parametros: Record<string, number>;
  coeficientes?: Record<string, number>;
  teste: {
    criterio: string;
    modelo: Metricas;
    so_elo: Metricas;
    moeda_50_50: Metricas;
    todas_as_lutas_modelo: Metricas;
    calibracao_todas_as_faixas: {
      faixa: string;
      n: number;
      prob_media_prevista: number;
      frequencia_real: number;
    }[];
    metodo_dado_vencedor: { n: number; log_loss_modelo: number; log_loss_media_da_divisao: number };
  };
}

export interface Dados {
  meta: Meta;
  eventos: { gerado_em: string; eventos: Evento[] };
  registro: Record<string, PrevisaoRegistrada>;
  validacao: Validacao | null;
}
