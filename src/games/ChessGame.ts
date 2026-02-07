/**
 * ChessGame - Chess game logic wrapper
 * Handles chess.js and adds AI functionality
 */

import { Chess } from 'chess.js';

type Color = 'white' | 'black';

interface MoveResult {
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  captured?: string;
  from: string;
  to: string;
}

export class ChessGame {
  private chess: Chess;
  private aiColor: Color;
  private onAIMove?: (move: MoveResult) => Promise<void>;

  constructor(aiColor: Color, onAIMove?: (move: MoveResult) => Promise<void>) {
    // Try different ways to instantiate Chess
    try {
      this.chess = new Chess();
    } catch (e) {
      // Fallback for different chess.js versions
      const ChessConstructor = Chess as any;
      if (typeof ChessConstructor === 'function') {
        this.chess = new ChessConstructor();
      } else if (ChessConstructor.Chess) {
        this.chess = new ChessConstructor.Chess();
      } else {
        throw new Error('Unable to initialize chess.js');
      }
    }
    
    this.aiColor = aiColor;
    this.onAIMove = onAIMove;
  }

  /**
   * Get current board state
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
   * Get legal moves from a square
   */
  getLegalMoves(square: string): string[] {
    try {
      const moves = this.chess.moves({ square: square as any, verbose: true });
      return moves.map((move: any) => move.to);
    } catch {
      return [];
    }
  }

  /**
   * Make player move
   */
  makePlayerMove(from: string, to: string): MoveResult | null {
    try {
      const move = this.chess.move({
        from: from as any,
        to: to as any,
        promotion: 'q' // Always promote to queen
      });

      if (move) {
        return {
          isCheck: this.chess.isCheck(),
          isCheckmate: this.chess.isCheckmate(),
          isDraw: this.chess.isDraw(),
          captured: move.captured as string | undefined,
          from: move.from,
          to: move.to
        };
      }

      return null;
    } catch (error) {
      console.error('Error making move:', error);
      return null;
    }
  }

  /**
   * Make AI move
   */
  async makeAIMove(): Promise<void> {
    if (this.isGameOver()) return;

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 500));

    const move = this.getBestMove();
    
    if (move) {
      const result = this.chess.move(move);
      
      if (result && this.onAIMove) {
        await this.onAIMove({
          isCheck: this.chess.isCheck(),
          isCheckmate: this.chess.isCheckmate(),
          isDraw: this.chess.isDraw(),
          captured: result.captured as string | undefined,
          from: result.from,
          to: result.to
        });
      }
    }
  }

  /**
   * Get best move using simple evaluation
   */
  private getBestMove(): any {
    const moves = this.chess.moves({ verbose: true });
    
    if (moves.length === 0) return null;

    // Simple AI: evaluate each move
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
   * Evaluate board position
   */
  private evaluateBoard(): number {
    let score = 0;
    const board = this.chess.board();
    const pieceValues: Record<string, number> = {
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
          const value = pieceValues[piece.type] || 0;
          
          if (piece.color === (this.aiColor === 'white' ? 'w' : 'b')) {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }

    // Bonuses
    if (this.chess.isCheckmate()) {
      score = this.chess.turn() === (this.aiColor === 'white' ? 'w' : 'b') ? -10000 : 10000;
    } else if (this.chess.isCheck()) {
      score += this.chess.turn() === (this.aiColor === 'white' ? 'w' : 'b') ? -50 : 50;
    }

    return score;
  }

  /**
   * Get current turn
   */
  turn(): 'w' | 'b' {
    return this.chess.turn();
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /**
   * Check if in check
   */
  isCheck(): boolean {
    return this.chess.isCheck();
  }

  /**
   * Check if checkmate
   */
  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  /**
   * Check if draw
   */
  isDraw(): boolean {
    return this.chess.isDraw() || this.chess.isStalemate() || 
           this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial();
  }

  /**
   * Get winner
   */
  getWinner(): Color | null {
    if (!this.isCheckmate()) return null;
    return this.chess.turn() === 'w' ? 'black' : 'white';
  }

  /**
   * Reset game
   */
  reset(): void {
    this.chess.reset();
  }

  /**
   * Get FEN (board representation)
   */
  getFEN(): string {
    return this.chess.fen();
  }

  /**
   * Load FEN
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
   * Get move history
   */
  getHistory(): string[] {
    return this.chess.history();
  }

  /**
   * Get last move
   */
  getLastMove(): any {
    const history = this.chess.history({ verbose: true });
    return history.length > 0 ? history[history.length - 1] : null;
  }
}

export default ChessGame;
