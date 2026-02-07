import { Chess, Square } from 'chess.js';
import type { ChessMove } from '@/types';

export class ChessGame {
  private game: Chess;
  private onMove: (move: ChessMove) => void;
  private aiColor: 'w' | 'b';

  constructor(aiColor: 'white' | 'black', onMove: (move: ChessMove) => void) {
    this.game = new Chess();
    this.aiColor = aiColor === 'white' ? 'w' : 'b';
    this.onMove = onMove;
  }

  makePlayerMove(from: string, to: string): ChessMove | null {
    try {
      const move = this.game.move({ from: from as Square, to: to as Square, promotion: 'q' });
      
      if (!move) return null;

      const chessMove: ChessMove = {
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        isCheck: this.game.isCheck(),
        isCheckmate: this.game.isCheckmate(),
      };

      this.onMove(chessMove);
      return chessMove;
    } catch (error) {
      console.error('Invalid move:', error);
      return null;
    }
  }

  async makeAIMove(): Promise<ChessMove | null> {
    if (this.game.isGameOver()) return null;

    // Simple AI: choose random legal move with some basic strategy
    const possibleMoves = this.game.moves({ verbose: true });
    
    if (possibleMoves.length === 0) return null;

    // Prioritize captures and checks
    const captureMoves = possibleMoves.filter(m => m.captured);
    const checkMoves = possibleMoves.filter(m => {
      this.game.move(m);
      const isCheck = this.game.isCheck();
      this.game.undo();
      return isCheck;
    });

    let selectedMove;
    
    if (checkMoves.length > 0 && Math.random() > 0.3) {
      selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
    } else if (captureMoves.length > 0 && Math.random() > 0.5) {
      selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
    } else {
      selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    const move = this.game.move(selectedMove);

    const chessMove: ChessMove = {
      from: move.from,
      to: move.to,
      piece: move.piece,
      captured: move.captured,
      isCheck: this.game.isCheck(),
      isCheckmate: this.game.isCheckmate(),
    };

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    this.onMove(chessMove);
    return chessMove;
  }

  getPGN(): string {
    return this.game.pgn();
  }

  getFEN(): string {
    return this.game.fen();
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  isCheck(): boolean {
    return this.game.isCheck();
  }

  isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  isDraw(): boolean {
    return this.game.isDraw();
  }

  getWinner(): 'white' | 'black' | 'draw' | null {
    if (!this.isGameOver()) return null;
    if (this.isDraw()) return 'draw';
    
    // The side to move when game is over lost
    return this.game.turn() === 'w' ? 'black' : 'white';
  }

  turn(): 'w' | 'b' {
    return this.game.turn();
  }

  reset(): void {
    this.game.reset();
  }

  getBoard(): string[][] {
    const board = this.game.board();
    return board.map(row => 
      row.map(square => 
        square ? `${square.color}${square.type}` : ''
      )
    );
  }

  getLegalMoves(square: string): string[] {
    return this.game.moves({ square: square as Square, verbose: true }).map(m => m.to);
  }
}
