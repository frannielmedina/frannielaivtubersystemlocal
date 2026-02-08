'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { CheckersGame } from '@/games/CheckersGame';
import { RefreshCw, Info } from 'lucide-react';

export const CheckersBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage, chatMessages } = useStore();
  const [game, setGame] = useState<CheckersGame | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<number[]>([]);
  const [showCommands, setShowCommands] = useState(true);

  useEffect(() => {
    const newGame = new CheckersGame(gameState.aiColor === 'white' ? 'red' : 'black', async (move) => {
      let message = '';
      
      if (move.captured && move.captured.length > 0) {
        message = move.captured.length > 1 
          ? `Multi-jump! I captured ${move.captured.length} pieces! 🎯`
          : 'Got one of your pieces! 😈';
        setAnimation({ type: 'emote', name: 'celebrate', duration: 2000 });
      }

      const winner = newGame.getWinner();
      if (winner) {
        if (winner === 'ai') {
          message = 'I win! Great game though! 🎉';
          setAnimation({ type: 'dance', name: 'victory', duration: 3000 });
        } else {
          message = 'You won! Well played! 👏';
          setAnimation({ type: 'emote', name: 'sad', duration: 2000 });
        }
        setGameState({ winner });
      }

      if (message) {
        addChatMessage({ 
          id: Date.now().toString(), 
          username: 'Miko', 
          message, 
          timestamp: Date.now(), 
          isAI: true, 
          color: '#9333ea' 
        });
      }
    });
    setGame(newGame);
  }, []);

  // Listen for chat commands
  useEffect(() => {
    if (!game) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.isAI) return;
    
    const message = lastMessage.message.trim().toLowerCase();
    
    // Checkers command: !move A3 to B4 or !move 1 to 10
    const movePattern = /^!move\s+([a-h][1-8]|[0-9]+)\s+to\s+([a-h][1-8]|[0-9]+)$/i;
    const match = message.match(movePattern);
    
    if (match) {
      const [_, fromStr, toStr] = match;
      handleCommandMove(fromStr, toStr);
    }
  }, [chatMessages, game]);

  const handleCommandMove = (fromStr: string, toStr: string) => {
    if (!game) return;
    
    // Convert to index
    let fromIndex: number;
    let toIndex: number;
    
    // Check if it's chess notation (A1) or numeric index
    if (/^[a-h][1-8]$/i.test(fromStr)) {
      fromIndex = chessNotationToIndex(fromStr);
      toIndex = chessNotationToIndex(toStr);
    } else {
      fromIndex = parseInt(fromStr);
      toIndex = parseInt(toStr);
    }
    
    const currentPlayer = game.getCurrentPlayer();
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
    if (currentPlayer === aiPlayer) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ It's AI's turn! Wait for your turn.`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
      return;
    }
    
    const move = game.makeMove(fromIndex, toIndex);
    
    if (move) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `✅ Moved piece from ${indexToChessNotation(fromIndex)} to ${indexToChessNotation(toIndex)}`,
        timestamp: Date.now(),
        color: '#10b981'
      });
      setSelectedPiece(null);
      setLegalMoves([]);
    } else {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ Invalid move from ${indexToChessNotation(fromIndex)} to ${indexToChessNotation(toIndex)}`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
    }
  };

  const chessNotationToIndex = (notation: string): number => {
    const col = notation.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(notation[1]);
    return row * 8 + col;
  };

  const indexToChessNotation = (index: number): string => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return String.fromCharCode('A'.charCodeAt(0) + col) + (8 - row);
  };

  useEffect(() => {
    if (!game || game.isGameOver()) return;
    
    const currentPlayer = game.getCurrentPlayer();
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
    if (currentPlayer === aiPlayer) {
      setTimeout(() => game.makeAIMove(), 800);
    }
  }, [game, gameState]);

  const handleSquareClick = (index: number) => {
    if (!game || game.isGameOver()) return;

    const board = game.getBoard();
    const [row, col] = indexToPos(index);
    const piece = board[row][col];
    
    const currentPlayer = game.getCurrentPlayer();
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
    if (currentPlayer === aiPlayer) {
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

    if (selectedPiece !== null) {
      const move = game.makeMove(selectedPiece, index);
      
      if (move) {
        setSelectedPiece(null);
        setLegalMoves([]);
      } else if (piece && Math.sign(piece) === currentPlayer) {
        setSelectedPiece(index);
        setLegalMoves(game.getLegalMoves(index).map(m => m.to));
      } else {
        setSelectedPiece(null);
        setLegalMoves([]);
      }
    } else if (piece && Math.sign(piece) === currentPlayer) {
      setSelectedPiece(index);
      setLegalMoves(game.getLegalMoves(index).map(m => m.to));
    }
  };

  const handleReset = () => {
    game?.reset();
    setSelectedPiece(null);
    setLegalMoves([]);
    setGameState({ winner: null, moveHistory: [] });
    
    addChatMessage({
      id: Date.now().toString(),
      username: 'Miko',
      message: 'New game! Let\'s do this! 🎮',
      timestamp: Date.now(),
      isAI: true,
      color: '#9333ea'
    });
  };

  if (!game) return <div className="text-white">Loading...</div>;

  const board = game.getBoard();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Header */}
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">⚫ Checkers</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCommands(!showCommands)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white transition-colors"
          >
            <Info size={16} /> {showCommands ? 'Hide' : 'Show'} Commands
          </button>
          <button 
            onClick={handleReset} 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white transition-colors"
          >
            <RefreshCw size={16} /> New Game
          </button>
        </div>
      </div>

      {/* Commands Panel */}
      {showCommands && (
        <div className="mb-4 w-full bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            📋 Available Commands
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="bg-gray-900 px-2 py-1 rounded text-green-400">!move [from] to [to]</code>
              <span className="text-gray-300">Move a piece (e.g., !move A3 to B4)</span>
            </div>
            <div className="text-xs text-gray-500 ml-2">
              • Columns: A-H (left to right)
              <br />
              • Rows: 1-8 (bottom to top)
              <br />
              • Only dark squares are playable
              <br />
              • Example: !move C3 to D4 (move forward)
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 mb-4">
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const index = rowIdx * 8 + colIdx;
            const isDark = (rowIdx + colIdx) % 2 === 1;
            const isSelected = index === selectedPiece;
            const isLegal = legalMoves.includes(index);

            return (
              <div
                key={index}
                onClick={() => handleSquareClick(index)}
                className={`w-16 h-16 flex items-center justify-center text-5xl transition-all ${
                  isDark ? 'bg-amber-800 cursor-pointer hover:bg-amber-700' : 'bg-amber-200'
                } ${isSelected ? 'ring-4 ring-blue-500' : ''} ${
                  isLegal ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {piece !== null && (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    Math.abs(piece) === 2 ? 'border-4 border-yellow-400' : ''
                  } ${
                    piece > 0 ? 'bg-red-600 shadow-lg' : 'bg-gray-900 shadow-lg'
                  }`}>
                    {Math.abs(piece) === 2 && <span className="text-2xl">👑</span>}
                  </div>
                )}
                {isLegal && !piece && (
                  <div className="w-4 h-4 rounded-full bg-green-400 opacity-60"></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Game Status */}
      <div className="text-white text-center">
        <p className="text-sm text-gray-400">
          Current Turn: {game.getCurrentPlayer() === 1 ? '🔴 Red (You)' : '⚫ Black (AI)'}
        </p>
      </div>

      {/* Game Over */}
      {game.isGameOver() && (
        <div className="mt-4 text-xl font-bold text-yellow-400">
          {game.getWinner() === 'player' ? '🎉 You Won!' : '🤖 AI Wins!'}
        </div>
      )}
    </div>
  );
};

function indexToPos(index: number): [number, number] {
  return [Math.floor(index / 8), index % 8];
}
