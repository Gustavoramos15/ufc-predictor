// Navegação simples: uma pilha de telas. O botão "voltar" do Android remove a tela do topo.
export type Rota =
  | { tela: "eventos" }
  | { tela: "confronto"; eventoId: string; lutaId: string }
  | { tela: "multipla" }
  | { tela: "historico" }
  | { tela: "modelo" };

export interface Navegacao {
  abrir: (rota: Rota) => void;
  voltar: () => void;
}
