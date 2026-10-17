// Navegação simples: uma pilha de telas. O botão "voltar" do Android remove a tela do topo.
export type Rota =
  | { tela: "eventos" }
  | { tela: "evento"; eventoId: string }
  | { tela: "confronto"; eventoId: string; lutaId: string }
  | { tela: "historico" }
  | { tela: "modelo" };

export interface Navegacao {
  abrir: (rota: Rota) => void;
  voltar: () => void;
}
