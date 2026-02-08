'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ChessGame } from '@/games/ChessGame';
import { RefreshCw, HelpCircle, Info } from 'lucide-react';

export const ChessBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage, chatMessages } = useStore();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showCommands, setShowCommands] = useState(true);
  const [autoRestartTimer, setAutoRestartTimer] = useState<number | null>(null);

  useEffect(() => {
    const newGame = new ChessGame(gameState.aiColor, async (move) => {
      setTimeout(() => {
        if (newGame.isGameOver()) {
          const winner = newGame.getWinner();
          let message = '';
          
          if (winner === 'checkmate_white') {
            message = gameState.aiColor === 'white' ? 'Checkmate! I win! 👑' : 'Checkmate! You won! 🎉';
            setAnimation({ 
              type: 'emote', 
              name: gameState.aiColor === 'white' ? 'heart' : 'sad', 
              duration: 3000 
            });
          } else if (winner === 'checkmate_black') {
            message = gameState.aiColor === 'black' ? 'Checkmate! I win! 👑' : 'Checkmate! You won! 🎉';
            setAnimation({ 
              type: 'emote', 
              name: gameState.aiColor === 'black' ? 'heart' : 'sad', 
              duration: 3000 
            });
          } else if (winner === 'stalemate') {
            message = 'Stalemate! It\'s a draw! 🤝';
            setAnimation({ type: 'emote', name: 'surprised', duration: 2000 });
          }
          
          setGameState({ winner });
          addChatMessage({
            id: Date.now().toString(),
            username: 'Miko',
            message,
            timestamp: Date.now(),
            isAI: true,
            color: '#9333ea'
          });
        }
      }, 100);
    });
    setGame(newGame);
  }, []);

  // Auto-restart after 10 seconds when game is over
  useEffect(() => {
    if (game && game.isGameOver()) {
      addChatMessage({
        id: (Date.now() + 100).toString(),
        username: 'System',
        message: '🔄 New game starting in 10 seconds...',
        timestamp: Date.now(),
        color: '#3b82f6'
      });

      const timer = window.setTimeout(() => {
        handleReset();
      }, 10000);

      setAutoRestartTimer(timer);

      return () => {
        if (autoRestartTimer) {
          clearTimeout(autoRestartTimer);
        }
      };
    }
  }, [game?.isGameOver()]);

  // Listen for chat commands
  useEffect(() => {
    if (!game) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.isAI) return;
    
    const message = lastMessage.message.trim().toLowerCase();
    
    // Chess command: !move E2 to E4
    const movePattern = /^!move\s+([a-h][1-8])\s+to\s+([a-h][1-8])$/i;
    const match = message.match(movePattern);
    
    if (match) {
      const [_, from, to] = match;
      handleCommandMove(from, to);
    }
  }, [chatMessages, game]);

  const handleCommandMove = (fromNotation: string, toNotation: string) => {
    if (!game) return;
    
    const from = chessNotationToRowCol(fromNotation);
    const to = chessNotationToRowCol(toNotation);
    
    const aiPlayer = gameState.aiColor === 'white' ? 'white' : 'black';
    
    if (game.getCurrentPlayer() === aiPlayer) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ It's AI's turn! Wait for your turn.`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
      return;
    }
    
    const move = game.makeMove(from.row, from.col, to.row, to.col);
    
    if (move) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `✅ Moved ${fromNotation.toUpperCase()} to ${toNotation.toUpperCase()}`,
        timestamp: Date.now(),
        color: '#10b981'
      });
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ Invalid move: ${fromNotation.toUpperCase()} to ${toNotation.toUpperCase()}`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
    }
  };

  const chessNotationToRowCol = (notation: string): { row: number; col: number } => {
    const col = notation.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(notation[1]);
    return { row, col };
  };

  const rowColToChessNotation = (row: number, col: number): string => {
    return String.fromCharCode('A'.charCodeAt(0) + col) + (8 - row);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!game || game.isGameOver()) return;

    const aiPlayer = gameState.aiColor === 'white' ? 'white' : 'black';
    
    if (game.getCurrentPlayer() === aiPlayer) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'Miko',
        message: 'It\'s my turn! Please wait 😊',
        timestamp: Date.now(),
        isAI: true,
        color: '#9333ea'
      });
      return;
    }

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const move = game.makeMove(fromRow, fromCol, row, col);
      
      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        const piece = game.getPieceAt(row, col);
        if (piece && piece.color === game.getCurrentPlayer()) {
          setSelectedSquare([row, col]);
          setLegalMoves(game.getLegalMoves(row, col));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const piece = game.getPieceAt(row, col);
      if (piece && piece.color === game.getCurrentPlayer()) {
        setSelectedSquare([row, col]);
        setLegalMoves(game.getLegalMoves(row, col));
      }
    }
  };

  const handleReset = () => {
    if (autoRestartTimer) {
      clearTimeout(autoRestartTimer);
      setAutoRestartTimer(null);
    }

    game?.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameState({ winner: null, moveHistory: [] });
    setShowHint(false);
    
    addChatMessage({
      id: Date.now().toString(),
      username: 'Miko',
      message: 'New chess game! Good luck! ♟️',
      timestamp: Date.now(),
      isAI: true,
      color: '#9333ea'
    });
  };

  const handleHint = () => {
    if (!game) return;
    const hint = game.getHint();
    if (hint) {
      const fromNotation = rowColToChessNotation(hint.from[0], hint.from[1]);
      const toNotation = rowColToChessNotation(hint.to[0], hint.to[1]);
      addChatMessage({
        id: Date.now().toString(),
        username: 'Miko',
        message: `💡 Hint: Move ${fromNotation} to ${toNotation}`,
        timestamp: Date.now(),
        isAI: true,
        color: '#3b82f6'
      });
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
  };

  if (!game) return <div className="text-white">Loading...</div>;

  const board = game.getBoard();
  const hint = showHint ? game.getHint() : null;

  const getPieceSymbol = (type: string, color: string): string => {
    const pieces: { [key: string]: { white: string; black: string } } = {
      pawn: { white: '♙', black: '♟' },
      rook: { white: '♖', black: '♜' },
      knight: { white: '♘', black: '♞' },
      bishop: { white: '♗', black: '♝' },
      queen: { white: '♕', black: '♛' },
      king: { white: '♔', black: '♚' },
    };
    return pieces[type][color];
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-4 flex justify-between w-full items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-white">♟️ Chess</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCommands(!showCommands)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white transition-colors text-sm"
          >
            <Info size={16} /> {showCommands ? 'Hide' : 'Show'} Commands
          </button>
          <button 
            onClick={handleHint} 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white transition-colors text-sm"
            disabled={game.isGameOver()}
          >
            <HelpCircle size={16} /> Hint
          </button>
          <button 
            onClick={handleReset} 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white transition-colors text-sm"
          >
            <RefreshCw size={16} /> New Game
          </button>
        </div>
      </div>

      {/* Commands Panel */}
      {showCommands && (
        <div className="mb-4 w-full bg-gray-800 rounded-lg p-4 border border-gray-700 flex-shrink-0">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
            📋 Available Commands
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <code className="bg-gray-900 px-2 py-1 rounded text-green-400 text-xs">!move [from] to [to]</code>
              <span className="text-gray-300">Move a piece (e.g., !move E2 to E4)</span>
            </div>
            <div className="text-xs text-gray-500 ml-2">
              • Columns: A-H (left to right)
              <br />
              • Rows: 1-8 (bottom to top)
              <br />
              • White starts at rows 1-2, Black at rows 7-8
              <br />
              • Example: !move E2 to E4 (pawn opening)
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 mb-4 flex-shrink-0">
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const isSelected = selectedSquare?.[0] === rowIdx && selectedSquare?.[1] === colIdx;
            const isLegalMove = legalMoves.some(([r, c]) => r === rowIdx && c === colIdx);
            const isHint = hint && 
              ((hint.from[0] === rowIdx && hint.from[1] === colIdx) ||
               (hint.to[0] === rowIdx && hint.to[1] === colIdx));
            const isLight = (rowIdx + colIdx) % 2 === 0;

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleSquareClick(rowIdx, colIdx)}
                className={`w-16 h-16 flex items-center justify-center cursor-pointer transition-all ${
                  isLight ? 'bg-amber-100' : 'bg-amber-700'
                } ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''} ${
                  isLegalMove ? 'ring-4 ring-green-400 ring-inset' : ''
                } ${isHint ? 'ring-4 ring-yellow-400 ring-inset animate-pulse' : ''} hover:opacity-80`}
              >
                {piece && (
                  <span className="text-5xl select-none">
                    {getPieceSymbol(piece.type, piece.color)}
                  </span>
                )}
                {!piece && isLegalMove && (
                  <div className="w-4 h-4 rounded-full bg-green-500 opacity-50" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Game Status */}
      <div className="text-white text-center flex-shrink-0">
        <p className="text-sm text-gray-400">
          Current Turn: {game.getCurrentPlayer() === 'white' ? '⚪ White' : '⚫ Black'}
        </p>
        {game.isInCheck() && <p className="text-red-500 font-bold mt-2">⚠️ CHECK!</p>}
      </div>

      {/* Game Over */}
      {game.isGameOver() && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex-shrink-0">
          <div className="text-2xl font-bold text-white text-center">
            {game.getWinner() === 'checkmate_white' && '⚪ White Wins!'}
            {game.getWinner() === 'checkmate_black' && '⚫ Black Wins!'}
            {game.getWinner() === 'stalemate' && '🤝 Stalemate!'}
          </div>
          <div className="text-sm text-white text-center mt-2">
            Game will restart in 10 seconds...
          </div>
        </div>
      )}
    </div>
  );
};
