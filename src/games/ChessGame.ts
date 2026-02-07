/**
 * ChessGame - Clase de lógica del juego de ajedrez
 * Envuelve chess.js y añade funcionalidad de IA
 */

import { Chess, Move, Square } from 'chess.js';

type Color = 'white' | 'black';
type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface MoveResult {
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  captured?: PieceSymbol;
  from: string;
  to: string;
}

export class ChessGame {
  private chess: Chess;
  private aiColor: Color;
  private onAIMove?: (move: MoveResult) => Promise<void>;

  constructor(aiColor: Color, onAIMove?: (move: MoveResult) => Promise<void>) {
    this.chess = new Chess();
    this.aiColor = aiColor;
    this.onAIMove = onAIMove;
  }

  /**
   * Obtener el tablero actual
   */
  getBoard(): (string | null)[][] {
    const board: (string | null)[][] = [];
    const asciiBoard = this.chess.board();

    for (let i = 0; i < 8; i++) {
      const row: (string | null)[] = [];
      for (let j = 0; j < 8; j++) {
        const piece = asciiBoard[i][j];
        if (piece) {
          const color = piece.color === 'w' ? 'w' : 'b';
          const type = piece.type;
          row.push(`${color}${type}`);
        } else {
          row.push(null);
        }
      }
      board.push(row);
    }

    return board;
  }

  /**
   * Obtener movimientos legales desde una casilla
   */
  getLegalMoves(square: string): string[] {
    const moves = this.chess.moves({ square: square as Square, verbose: true });
    return moves.map(move => move.to);
  }

  /**
   * Realizar movimiento del jugador
   */
  makePlayerMove(from: string, to: string): MoveResult | null {
    try {
      const move = this.chess.move({
        from: from as Square,
        to: to as Square,
        promotion: 'q' // Siempre promocionar a reina
      });

      if (move) {
        return {
          isCheck: this.chess.isCheck(),
          isCheckmate: this.chess.isCheckmate(),
          isDraw: this.chess.isDraw(),
          captured: move.captured as PieceSymbol,
          from: move.from,
          to: move.to
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Realizar movimiento de la IA
   */
  async makeAIMove(): Promise<void> {
    if (this.isGameOver()) return;

    // Esperar un momento para simular "pensamiento"
    await new Promise(resolve => setTimeout(resolve, 500));

    const move = this.getBestMove();
    
    if (move) {
      const result = this.chess.move(move);
      
      if (result && this.onAIMove) {
        await this.onAIMove({
          isCheck: this.chess.isCheck(),
          isCheckmate: this.chess.isCheckmate(),
          isDraw: this.chess.isDraw(),
          captured: result.captured as PieceSymbol,
          from: result.from,
          to: result.to
        });
      }
    }
  }

  /**
   * Obtener mejor movimiento de la IA (minimax simple)
   */
  private getBestMove(): Move | null {
    const moves = this.chess.moves({ verbose: true });
    
    if (moves.length === 0) return null;

    // IA básica: evaluar cada movimiento
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      this.chess.move(move);
      const score = this.evaluateBoard();
      this.chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Evaluar posición del tablero
   */
  private evaluateBoard(): number {
    let score = 0;
    const board = this.chess.board();
    const pieceValues: Record<PieceSymbol, number> = {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9,
      'k': 0
    };

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = pieceValues[piece.type as PieceSymbol] || 0;
          
          if (piece.color === (this.aiColor === 'white' ? 'w' : 'b')) {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }

    // Bonificaciones adicionales
    if (this.chess.isCheckmate()) {
      score = this.chess.turn() === (this.aiColor === 'white' ? 'w' : 'b') ? -10000 : 10000;
    } else if (this.chess.isCheck()) {
      score += this.chess.turn() === (this.aiColor === 'white' ? 'w' : 'b') ? -50 : 50;
    }

    return score;
  }

  /**
   * Obtener turno actual
   */
  turn(): 'w' | 'b' {
    return this.chess.turn();
  }

  /**
   * Verificar si el juego terminó
   */
  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /**
   * Verificar si hay jaque
   */
  isCheck(): boolean {
    return this.chess.isCheck();
  }

  /**
   * Verificar si hay jaque mate
   */
  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  /**
   * Verificar si hay empate
   */
  isDraw(): boolean {
    return this.chess.isDraw() || this.chess.isStalemate() || 
           this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial();
  }

  /**
   * Obtener ganador
   */
  getWinner(): Color | null {
    if (!this.isCheckmate()) return null;
    return this.chess.turn() === 'w' ? 'black' : 'white';
  }

  /**
   * Reiniciar juego
   */
  reset(): void {
    this.chess.reset();
  }

  /**
   * Obtener FEN (representación del tablero)
   */
  getFEN(): string {
    return this.chess.fen();
  }

  /**
   * Cargar FEN
   */
  loadFEN(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener historial de movimientos
   */
  getHistory(): string[] {
    return this.chess.history();
  }

  /**
   * Obtener último movimiento
   */
  getLastMove(): Move | null {
    const history = this.chess.history({ verbose: true });
    return history.length > 0 ? history[history.length - 1] : null;
  }
}

export default ChessGame;
