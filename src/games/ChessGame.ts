/**
 * ChessGame - Compatible with Next.js and Vercel
 * Fixed dynamic import to handle different chess.js export formats
 */

import type { ChessMove } from '@/types';

// Dynamic import for chess.js to avoid SSR issues
let Chess: any = null;

async function loadChess() {
  if (typeof window !== 'undefined' && !Chess) {
    try {
      const chessModule = await import('chess.js');
      
      // Handle different export formats
      // chess.js@1.0.0-beta uses named export { Chess }
      // older versions might use default export
      Chess = chessModule.Chess || chessModule.default || chessModule;
      
      console.log('✅ chess.js loaded successfully');
      console.log('Chess constructor:', typeof Chess);
    } catch (error) {
      console.error('❌ Failed to load chess.js:', error);
    }
  }
  return Chess;
}

export class ChessGame {
  private game: any = null;
  private onMove: (move: ChessMove) => void;
  private aiColor: 'w' | 'b';
  private initialized: boolean = false;

  constructor(aiColor: 'white' | 'black', onMove: (move: ChessMove) => void) {
    this.aiColor = aiColor === 'white' ? 'w' : 'b';
    this.onMove = onMove;
    this.initialize();
  }

  private async initialize() {
    const ChessConstructor = await loadChess();
    if (ChessConstructor) {
      try {
        // Try to instantiate Chess
        this.game = new ChessConstructor();
        this.initialized = true;
        console.log('✅ Chess game initialized');
      } catch (error) {
        console.error('❌ Error instantiating Chess:', error);
        // If that fails, try calling it as a function
        try {
          this.game = ChessConstructor();
          this.initialized = true;
          console.log('✅ Chess game initialized (function call)');
        } catch (error2) {
          console.error('❌ Error calling Chess as function:', error2);
        }
      }
    }
  }

  async waitForInit() {
    let attempts = 0;
    while (!this.initialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.initialized) {
      console.error('❌ Failed to initialize chess game after 5 seconds');
    }
    
    return this.initialized;
  }

  makePlayerMove(from: string, to: string): ChessMove | null {
    if (!this.game) {
      console.error('❌ Game not initialized');
      return null;
    }

    try {
      const move = this.game.move({ from, to, promotion: 'q' });
      
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
      console.error('❌ Invalid move:', error);
      return null;
    }
  }

  async makeAIMove(): Promise<ChessMove | null> {
    if (!this.game || this.game.isGameOver()) return null;

    // Simple AI: choose random legal move with some basic strategy
    const possibleMoves = this.game.moves({ verbose: true });
    
    if (possibleMoves.length === 0) return null;

    // Prioritize captures and checks
    const captureMoves = possibleMoves.filter((m: any) => m.captured);
    const checkMoves = possibleMoves.filter((m: any) => {
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
    return this.game?.pgn() || '';
  }

  getFEN(): string {
    return this.game?.fen() || '';
  }

  isGameOver(): boolean {
    return this.game?.isGameOver() || false;
  }

  isCheck(): boolean {
    return this.game?.isCheck() || false;
  }

  isCheckmate(): boolean {
    return this.game?.isCheckmate() || false;
  }

  isDraw(): boolean {
    return this.game?.isDraw() || false;
  }

  getWinner(): 'white' | 'black' | 'draw' | null {
    if (!this.game || !this.isGameOver()) return null;
    if (this.isDraw()) return 'draw';
    
    // The side to move when game is over lost
    return this.game.turn() === 'w' ? 'black' : 'white';
  }

  turn(): 'w' | 'b' {
    return this.game?.turn() || 'w';
  }

  reset(): void {
    this.game?.reset();
  }

  getBoard(): string[][] {
    if (!this.game) {
      // Return empty board
      return Array(8).fill(null).map(() => Array(8).fill(''));
    }

    const board = this.game.board();
    return board.map((row: any) => 
      row.map((square: any) => 
        square ? `${square.color}${square.type}` : ''
      )
    );
  }

  getLegalMoves(square: string): string[] {
    if (!this.game) return [];
    return this.game.moves({ square, verbose: true }).map((m: any) => m.to);
  }
}
