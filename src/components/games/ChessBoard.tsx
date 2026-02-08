'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ChessGame } from '@/games/ChessGame';
import { RefreshCw, Info } from 'lucide-react';

export const ChessBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage, chatMessages } = useStore();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  useEffect(() => {
    const initGame = async () => {
      const colorMessage = gameState.aiColor === 'white' 
        ? 'I\'ll play as White ⚪' 
        : 'I\'ll play as Black ⚫';
        
      addChatMessage({
        id: Date.now().toString(),
        username: 'Miko',
        message: `New chess game! ${colorMessage} Let's play! ♟️`,
        timestamp: Date.now(),
        isAI: true,
        color: '#9333ea'
      });

      const newGame = new ChessGame(gameState.aiColor, async (move) => {
        let message = '';
        
        if (move.isCheckmate) {
          const winner = newGame.getWinner();
          if (winner === gameState.aiColor) {
            message = 'Checkmate! I won! 🎉 Great game!';
            setAnimation({ type: 'emote', name: 'celebrate', duration: 3000 });
          } else {
            message = 'Checkmate! You won! 😢 Well played!';
            setAnimation({ type: 'emote', name: 'sad', duration: 2000 });
          }
          setGameState({ winner: winner === 'white' ? 'player' : 'ai' });
        } else if (move.isCheck) {
          message = 'Check! Your king is in danger! 👀';
          setAnimation({ type: 'emote', name: 'surprised', duration: 2000 });
        } else if (move.captured) {
          const pieceNames: Record<string, string> = {
            'p': 'pawn',
            'n': 'knight',
            'b': 'bishop',
            'r': 'rook',
            'q': 'queen'
          };
          const pieceName = pieceNames[move.captured] || 'piece';
          message = `I captured your ${pieceName}! 😈`;
          setAnimation({ type: 'emote', name: 'celebrate', duration: 1500 });
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
      
      await newGame.waitForInit();
      setGame(newGame);
      setLoading(false);
      
      if (gameState.aiColor === 'white') {
        setTimeout(() => newGame.makeAIMove(), 1000);
      }
    };

    initGame();
  }, []);

  // Listen for chat commands
  useEffect(() => {
    if (!game || loading) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.isAI) return;
    
    const message = lastMessage.message.trim().toLowerCase();
    
    // Chess command: !move e2 to e4
    const movePattern = /^!move\s+([a-h][1-8])\s+to\s+([a-h][1-8])$/i;
    const match = message.match(movePattern);
    
    if (match) {
      const [_, from, to] = match;
      handleCommandMove(from.toLowerCase(), to.toLowerCase());
    }
  }, [chatMessages, game, loading]);

  const handleCommandMove = (from: string, to: string) => {
    if (!game) return;
    
    const currentTurn = game.turn();
    const playerTurn = gameState.aiColor === 'white' ? 'b' : 'w';
    
    if (currentTurn !== playerTurn) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ It's not your turn! Wait for AI to move.`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
      return;
    }
    
    const move = game.makePlayerMove(from, to);
    
    if (move) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `✅ Moved from ${from.toUpperCase()} to ${to.toUpperCase()}`,
        timestamp: Date.now(),
        color: '#10b981'
      });
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ Invalid move: ${from.toUpperCase()} to ${to.toUpperCase()}`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
    }
  };

  useEffect(() => {
    if (!game || loading || game.isGameOver()) return;
    
    const currentTurn = game.turn();
    const aiTurn = gameState.aiColor === 'white' ? 'w' : 'b';
    
    if (currentTurn === aiTurn) {
      setTimeout(() => game.makeAIMove(), 500);
    }
  }, [game?.turn(), loading]);

  const handleSquareClick = (square: string) => {
    if (!game || loading || game.isGameOver()) return;
    
    const currentTurn = game.turn();
    const playerTurn = gameState.aiColor === 'white' ? 'b' : 'w';
    
    if (currentTurn !== playerTurn) {
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
      const move = game.makePlayerMove(selectedSquare, square);
      
      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        const moves = game.getLegalMoves(square);
        if (moves.length > 0) {
          setSelectedSquare(square);
          setLegalMoves(moves);
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const moves = game.getLegalMoves(square);
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves);
      }
    }
  };

  const handleReset = async () => {
    if (!game) return;
    
    game.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameState({ winner: null, moveHistory: [] });
    
    const colorMessage = gameState.aiColor === 'white' 
      ? 'I\'ll play as White ⚪' 
      : 'I\'ll play as Black ⚫';
    
    addChatMessage({
      id: Date.now().toString(),
      username: 'Miko',
      message: `New game! ${colorMessage} Let's play! ♟️`,
      timestamp: Date.now(),
      isAI: true,
      color: '#9333ea'
    });
    
    if (gameState.aiColor === 'white') {
      setTimeout(() => game.makeAIMove(), 1000);
    }
  };

  if (loading || !game) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-center">
          <div className="text-2xl mb-2">♟️</div>
          <div>Loading chess game...</div>
        </div>
      </div>
    );
  }

  const board = game.getBoard();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">♟️ Chess</h2>
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
              <span className="text-gray-300">Move a piece (e.g., !move E2 to E4)</span>
            </div>
            <div className="text-xs text-gray-500 ml-2">
              • Columns: A-H (left to right)
              <br />
              • Rows: 1-8 (bottom to top)
              <br />
              • Example: !move E2 to E4 (King's pawn opening)
            </div>
          </div>
        </div>
      )}

      {/* Check/Checkmate Alert */}
      {game.isCheck() && !game.isCheckmate() && (
        <div className="mb-2 px-4 py-2 bg-red-600 text-white rounded animate-pulse">
          ⚠️ CHECK! King is in danger!
        </div>
      )}

      {/* Board */}
      <div className="relative">
        <div className="absolute -left-6 top-0 h-full flex flex-col justify-around text-gray-400 text-sm">
          {ranks.map(rank => (
            <div key={rank} className="h-16 flex items-center">{rank}</div>
          ))}
        </div>

        <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 shadow-2xl">
          {board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              const square = `${files[colIdx]}${8 - rowIdx}`;
              const isLight = (rowIdx + colIdx) % 2 === 0;
              const isSelected = square === selectedSquare;
              const isLegal = legalMoves.includes(square);

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`w-16 h-16 flex items-center justify-center text-5xl cursor-pointer transition-all relative ${
                    isLight ? 'bg-amber-100' : 'bg-amber-700'
                  } ${isSelected ? 'ring-4 ring-inset ring-blue-500' : ''} ${
                    isLegal ? 'ring-2 ring-inset ring-green-400' : ''
                  } hover:opacity-80`}
                >
                  {piece && (
                    <span className="drop-shadow-md select-none">
                      {getPieceSymbol(piece)}
                    </span>
                  )}
                  {isLegal && !piece && (
                    <div className="w-4 h-4 rounded-full bg-green-500 opacity-50"></div>
                  )}
                  {isLegal && piece && (
                    <div className="absolute inset-0 border-4 border-green-500 opacity-50 pointer-events-none"></div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-around text-gray-400 text-sm mt-1">
          {files.map(file => (
            <div key={file} className="w-16 text-center">{file}</div>
          ))}
        </div>
      </div>

      {/* Game Status */}
      <div className="mt-4 text-white text-center">
        <p className="text-sm text-gray-400">
          Turn: {game.turn() === 'w' ? '⚪ White' : '⚫ Black'}
        </p>
        {game.isCheck() && (
          <p className="text-red-400 font-bold mt-1">IN CHECK!</p>
        )}
      </div>

      {/* Game Over */}
      {game.isGameOver() && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
          <div className="text-2xl font-bold text-white text-center">
            {game.isCheckmate() && (
              <>
                {game.getWinner() === 'white' && '⚪ White Wins by Checkmate!'}
                {game.getWinner() === 'black' && '⚫ Black Wins by Checkmate!'}
              </>
            )}
            {game.isDraw() && '🤝 Draw!'}
          </div>
        </div>
      )}
    </div>
  );
};

function getPieceSymbol(piece: string): string {
  const symbols: Record<string, string> = {
    'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚',
  };
  return symbols[piece] || '';
}
