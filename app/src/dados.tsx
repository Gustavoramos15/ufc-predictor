// Carregamento dos dados: embutidos no APK -> cópia salva no celular -> download do GitHub.
// O app sempre abre com o que tiver; o download só substitui se der certo.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { URL_DADOS } from "./config";
import type { Dados } from "./tipos";

const CHAVE_CACHE = "ufc-predictor/dados-v1";
const TEMPO_LIMITE_MS = 20000;

const EMBUTIDOS: Dados = {
  meta: require("../assets/dados/meta.json"),
  eventos: require("../assets/dados/eventos.json"),
  registro: require("../assets/dados/previsoes_registro.json"),
  validacao: require("../assets/dados/validacao.json"),
};

export type Origem = "embutido" | "salvo" | "internet";

export interface EstadoDados {
  dados: Dados;
  origem: Origem;
  baixadoEm: string | null; // quando o celular baixou (para origem "salvo" ou "internet")
  atualizando: boolean;
  erroAtualizacao: string | null;
  atualizar: () => Promise<void>;
}

interface Cache {
  dados: Dados;
  baixadoEm: string;
}

function dadosValidos(d: any): d is Dados {
  return (
    d && typeof d.meta?.gerado_em === "string" && Array.isArray(d.eventos?.eventos) && typeof d.registro === "object"
  );
}

async function lerCache(): Promise<Cache | null> {
  try {
    const texto = await AsyncStorage.getItem(CHAVE_CACHE);
    if (!texto) return null;
    const c = JSON.parse(texto);
    return dadosValidos(c?.dados) ? c : null;
  } catch {
    return null;
  }
}

async function baixarJson(nome: string): Promise<any> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    // "?t=" evita receber uma cópia antiga guardada no caminho (cache HTTP).
    const resp = await fetch(`${URL_DADOS}${nome}?t=${Date.now()}`, { signal: controle.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${nome}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function baixarDados(): Promise<Dados> {
  const [meta, eventos, registro, validacao] = await Promise.all([
    baixarJson("meta.json"),
    baixarJson("eventos.json"),
    baixarJson("previsoes_registro.json"),
    baixarJson("validacao.json").catch(() => null),
  ]);
  const dados = { meta, eventos, registro, validacao };
  if (!dadosValidos(dados)) throw new Error("Os arquivos baixados não têm o formato esperado.");
  return dados;
}

const Contexto = createContext<EstadoDados | null>(null);

export function ProvedorDados({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Omit<EstadoDados, "atualizar">>({
    dados: EMBUTIDOS,
    origem: "embutido",
    baixadoEm: null,
    atualizando: false,
    erroAtualizacao: null,
  });

  const atualizar = useCallback(async () => {
    if (!URL_DADOS) {
      setEstado((e) => ({ ...e, erroAtualizacao: "Atualização pela internet ainda não configurada." }));
      return;
    }
    setEstado((e) => ({ ...e, atualizando: true, erroAtualizacao: null }));
    try {
      const dados = await baixarDados();
      const baixadoEm = new Date().toISOString();
      setEstado({ dados, origem: "internet", baixadoEm, atualizando: false, erroAtualizacao: null });
      await AsyncStorage.setItem(CHAVE_CACHE, JSON.stringify({ dados, baixadoEm })).catch(() => {});
    } catch (e: any) {
      const motivo = e?.name === "AbortError" ? "tempo esgotado" : e?.message ?? "erro desconhecido";
      setEstado((s) => ({ ...s, atualizando: false, erroAtualizacao: `Não foi possível atualizar (${motivo}).` }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      const cache = await lerCache();
      // Usa a cópia salva só se ela for mais nova que os dados que vieram dentro do APK.
      if (cache && cache.dados.meta.gerado_em > EMBUTIDOS.meta.gerado_em) {
        setEstado((e) => ({ ...e, dados: cache.dados, origem: "salvo", baixadoEm: cache.baixadoEm }));
      }
      await atualizar();
    })();
  }, [atualizar]);

  return <Contexto.Provider value={{ ...estado, atualizar }}>{children}</Contexto.Provider>;
}

export function useDados(): EstadoDados {
  const c = useContext(Contexto);
  if (!c) throw new Error("useDados fora do ProvedorDados");
  return c;
}
