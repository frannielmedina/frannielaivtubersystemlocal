import type { ReversiMove } from '@/types';

export class ReversiGame {
  private board: (1 | -1 | null)[][]; // 1 = player (white), -1 = AI (black), null = empty
  private currentPlayer: 1 | -1;
  private onMove: (move: ReversiMove) => void;
  private aiPlayer: 1 | -1;

  constructor(aiColor: 'white' | 'black', onMove: (move: ReversiMove) => void) {
    this.board = this.initializeBoard();
    this.currentPlayer = -1; // Black always starts
    this.aiPlayer = aiColor === 'white' ? 1 : -1;
    this.onMove = onMove;
  }

  private initializeBoard(): (1 | -1 | null)[][] {
    const board: (1 | -1 | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Initial position
    board[3][3] = 1;  // White
    board[3][4] = -1; // Black
    board[4][3] = -1; // Black
    board[4][4] = 1;  // White
    
    return board;
  }

  makeMove(row: number, col: number): ReversiMove | null {
    if (!this.isValidMove(row, col, this.currentPlayer)) {
      return null;
    }

    const flipped = this.getFlippedPieces(row, col, this.currentPlayer);
    
    // Place the piece
    this.board[row][col] = this.currentPlayer;

    // Flip opponent pieces
    flipped.forEach(([r, c]) => {
      this.board[r][c] = this.currentPlayer;
    });

    const move: ReversiMove = {
      row,
      col,
      player: this.currentPlayer === 1 ? 'white' : 'black',
    };

    this.onMove(move);

    // Switch player
    this.currentPlayer = this.currentPlayer === 1 ? -1 : 1;

    // Skip turn if next player has no moves
    if (this.getLegalMoves(this.currentPlayer).length === 0) {
      this.currentPlayer = this.currentPlayer === 1 ? -1 : 1;
    }

    return move;
  }

  private isValidMove(row: number, col: number, player: 1 | -1): boolean {
    if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;
    if (this.board[row][col] !== null) return false;

    return this.getFlippedPieces(row, col, player).length > 0;
  }

  private getFlippedPieces(row: number, col: number, player: 1 | -1): [number, number][] {
    const flipped: [number, number][] = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      const temp: [number, number][] = [];
      let r = row + dr;
      let c = col + dc;

      while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === -player) {
        temp.push([r, c]);
        r += dr;
        c += dc;
      }

      if (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === player && temp.length > 0) {
        flipped.push(...temp);
      }
    }

    return flipped;
  }

  getLegalMoves(player: 1 | -1): [number, number][] {
    const moves: [number, number][] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.isValidMove(row, col, player)) {
          moves.push([row, col]);
        }
      }
    }

    return moves;
  }

  async makeAIMove(): Promise<ReversiMove | null> {
    if (this.currentPlayer !== this.aiPlayer || this.isGameOver()) return null;

    const legalMoves = this.getLegalMoves(this.aiPlayer);
    
    if (legalMoves.length === 0) return null;

    // Simple AI: choose move that flips the most pieces
    // Corners are most valuable
    const scoredMoves = legalMoves.map(([row, col]) => {
      let score = this.getFlippedPieces(row, col, this.aiPlayer).length;
      
      // Bonus for corners
      if ((row === 0 || row === 7) && (col === 0 || col === 7)) {
        score += 10;
      }
      
      // Bonus for edges
      if (row === 0 || row === 7 || col === 0 || col === 7) {
        score += 3;
      }

      return { row, col, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Choose best move with some randomness
    const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
    const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    return this.makeMove(selectedMove.row, selectedMove.col);
  }

  isGameOver(): boolean {
    return this.getLegalMoves(1).length === 0 && this.getLegalMoves(-1).length === 0;
  }

  getScore(): { player: number; ai: number } {
    let player = 0;
    let ai = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece === this.aiPlayer) ai++;
        else if (piece === -this.aiPlayer) player++;
      }
    }

    return { player, ai };
  }

  getWinner(): 'player' | 'ai' | 'draw' | null {
    if (!this.isGameOver()) return null;

    const score = this.getScore();
    
    if (score.player > score.ai) return 'player';
    if (score.ai > score.player) return 'ai';
    return 'draw';
  }

  getBoard(): (1 | -1 | null)[][] {
    return this.board.map(row => [...row]);
  }

  reset(): void {
    this.board = this.initializeBoard();
    this.currentPlayer = -1;
  }

  getCurrentPlayer(): 1 | -1 {
    return this.currentPlayer;
  }

  getHint(): [number, number] | null {
    const moves = this.getLegalMoves(this.currentPlayer);
    if (moves.length === 0) return null;
    
    return moves[0];
  }
}
