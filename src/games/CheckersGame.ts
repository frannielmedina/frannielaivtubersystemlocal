import type { CheckersMove } from '@/types';

export class CheckersGame {
  private board: (number | null)[][]; // 0 = empty, 1 = player, 2 = player king, -1 = AI, -2 = AI king
  private currentPlayer: 1 | -1; // 1 = player (red), -1 = AI (black)
  private onMove: (move: CheckersMove) => void;
  private aiPlayer: 1 | -1;

  // FIXED: Accept 'white' | 'black' and map to red/black internally
  constructor(aiColor: 'white' | 'black', onMove: (move: CheckersMove) => void) {
    this.board = this.initializeBoard();
    this.currentPlayer = 1; // Player always starts (red)
    // Map white to red (1), black to black (-1)
    this.aiPlayer = aiColor === 'white' ? 1 : -1;
    this.onMove = onMove;
  }

  private initializeBoard(): (number | null)[][] {
    const board: (number | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Setup black pieces (AI)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = -1;
        }
      }
    }
    
    // Setup red pieces (Player)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = 1;
        }
      }
    }
    
    return board;
  }

  makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): CheckersMove | null {
    const piece = this.board[fromRow][fromCol];
    if (!piece || Math.sign(piece) !== this.currentPlayer) return null;

    const moves = this.getLegalMoves(fromRow, fromCol);
    const move = moves.find(m => {
      const [r, c] = this.indexToPos(m.to);
      return r === toRow && c === toCol;
    });
    
    if (!move) return null;

    // Make the move
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Promote to king if reached opposite end
    if (toRow === 0 && piece === 1) this.board[toRow][toCol] = 2;
    if (toRow === 7 && piece === -1) this.board[toRow][toCol] = -2;

    // Handle captures
    if (move.captured && move.captured.length > 0) {
      move.captured.forEach(capturedIndex => {
        const [captRow, captCol] = this.indexToPos(capturedIndex);
        this.board[captRow][captCol] = null;
      });
    }

    this.currentPlayer = this.currentPlayer === 1 ? -1 : 1;
    this.onMove(move);

    return move;
  }

  private posToIndex(row: number, col: number): number {
    return row * 8 + col;
  }

  private indexToPos(index: number): [number, number] {
    return [Math.floor(index / 8), index % 8];
  }

  getLegalMoves(fromRow: number, fromCol: number): CheckersMove[] {
    const piece = this.board[fromRow][fromCol];
    
    if (!piece || Math.sign(piece) !== this.currentPlayer) return [];

    const moves: CheckersMove[] = [];
    const isKing = Math.abs(piece) === 2;
    const direction = piece > 0 ? -1 : 1; // Red moves up (-1), Black moves down (1)
    const from = this.posToIndex(fromRow, fromCol);

    // Check for jump moves first (mandatory if available)
    const jumps = this.getJumpMoves(fromRow, fromCol, piece, isKing, direction);
    if (jumps.length > 0) return jumps.map(j => ({ ...j, from }));

    // Regular moves
    const directions = isKing ? [-1, 1] : [direction];
    
    for (const dir of directions) {
      for (const colDir of [-1, 1]) {
        const newRow = fromRow + dir;
        const newCol = fromCol + colDir;
        
        if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
          moves.push({
            from,
            to: this.posToIndex(newRow, newCol),
          });
        }
      }
    }

    return moves;
  }

  private getJumpMoves(
    row: number,
    col: number,
    piece: number,
    isKing: boolean,
    direction: number
  ): { to: number; captured: number[] }[] {
    const jumps: { to: number; captured: number[] }[] = [];
    const directions = isKing ? [-1, 1] : [direction];

    for (const dir of directions) {
      for (const colDir of [-1, 1]) {
        const jumpRow = row + dir * 2;
        const jumpCol = col + colDir * 2;
        const midRow = row + dir;
        const midCol = col + colDir;

        if (
          this.isValidPosition(jumpRow, jumpCol) &&
          !this.board[jumpRow][jumpCol] &&
          this.board[midRow][midCol] &&
          Math.sign(this.board[midRow][midCol]!) !== Math.sign(piece)
        ) {
          jumps.push({
            to: this.posToIndex(jumpRow, jumpCol),
            captured: [this.posToIndex(midRow, midCol)],
          });
        }
      }
    }

    return jumps;
  }

  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  async makeAIMove(): Promise<CheckersMove | null> {
    if (this.currentPlayer !== this.aiPlayer || this.isGameOver()) return null;

    // Get all possible moves for AI
    const allMoves: CheckersMove[] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        
        if (piece && Math.sign(piece) === this.aiPlayer) {
          allMoves.push(...this.getLegalMoves(row, col));
        }
      }
    }

    if (allMoves.length === 0) return null;

    // Prioritize captures
    const captures = allMoves.filter(m => m.captured && m.captured.length > 0);
    const selectedMove = captures.length > 0 
      ? captures[Math.floor(Math.random() * captures.length)]
      : allMoves[Math.floor(Math.random() * allMoves.length)];

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const [fromRow, fromCol] = this.indexToPos(selectedMove.from);
    const [toRow, toCol] = this.indexToPos(selectedMove.to);

    return this.makeMove(fromRow, fromCol, toRow, toCol);
  }

  isGameOver(): boolean {
    const player1HasMoves = this.hasLegalMoves(1);
    const player2HasMoves = this.hasLegalMoves(-1);
    
    return !player1HasMoves || !player2HasMoves;
  }

  private hasLegalMoves(player: 1 | -1): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && Math.sign(piece) === player) {
          if (this.getLegalMoves(row, col).length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getWinner(): 'player' | 'ai' | null {
    if (!this.isGameOver()) return null;
    
    const playerHasMoves = this.hasLegalMoves(this.aiPlayer === 1 ? -1 : 1);
    return playerHasMoves ? 'player' : 'ai';
  }

  getBoard(): (number | null)[][] {
    return this.board.map(row => [...row]);
  }

  reset(): void {
    this.board = this.initializeBoard();
    this.currentPlayer = 1;
  }

  getCurrentPlayer(): 1 | -1 {
    return this.currentPlayer;
  }

  getHint(): { from: [number, number]; to: [number, number] } | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && Math.sign(piece) === this.currentPlayer) {
          const moves = this.getLegalMoves(row, col);
          if (moves.length > 0) {
            const move = moves[0];
            const [toRow, toCol] = this.indexToPos(move.to);
            return { from: [row, col], to: [toRow, toCol] };
          }
        }
      }
    }
    return null;
  }
}
