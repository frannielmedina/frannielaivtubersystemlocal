'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { CheckersGame } from '@/games/CheckersGame';
import { RefreshCw } from 'lucide-react';

export const CheckersBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage } = useStore();
  const [game, setGame] = useState<CheckersGame | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<number[]>([]);

  useEffect(() => {
    const newGame = new CheckersGame(gameState.aiColor === 'white' ? 'red' : 'black', async (move) => {
      let message = '';
      
      if (move.captured && move.captured.length > 0) {
        message = move.captured.length > 1 
          ? `Multi-jump! I captured ${move.captured.length} pieces! 🎯`
          : 'Got one of your pieces! 😈';
        setAnimation({ type: 'emote', name: 'celebrate', duration: 2000 });
      }

      // Check for winner
      const winner = game?.getWinner();
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

    if (selectedPiece !== null) {
      // Try to make a move
      const move = game.makeMove(selectedPiece, index);
      
      if (move) {
        setSelectedPiece(null);
        setLegalMoves([]);
        // AI will move automatically via useEffect
      } else if (piece && Math.sign(piece) === game.getCurrentPlayer()) {
        // Select different piece
        setSelectedPiece(index);
        setLegalMoves(game.getLegalMoves(index).map(m => m.to));
      }
    } else if (piece && Math.sign(piece) === game.getCurrentPlayer()) {
      // Select piece
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
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">⚫ Checkers</h2>
        <button 
          onClick={handleReset} 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white"
        >
          <RefreshCw size={16} /> New Game
        </button>
      </div>

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
                onClick={() => isDark && handleSquareClick(index)}
                className={`w-16 h-16 flex items-center justify-center text-5xl cursor-pointer transition-all ${
                  isDark ? 'bg-amber-800' : 'bg-amber-200'
                } ${isSelected ? 'ring-4 ring-blue-500' : ''} ${
                  isLegal ? 'ring-2 ring-green-400' : ''
                } ${isDark ? 'hover:opacity-80' : ''}`}
              >
                {piece !== null && (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    Math.abs(piece) === 2 ? 'border-4 border-yellow-400' : ''
                  } ${
                    piece > 0 ? 'bg-red-600' : 'bg-gray-900'
                  }`}>
                    {Math.abs(piece) === 2 && <span className="text-2xl">👑</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-white text-center">
        <p className="text-sm text-gray-400">
          Current Turn: {game.getCurrentPlayer() === 1 ? '🔴 Red (You)' : '⚫ Black (AI)'}
        </p>
      </div>

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
