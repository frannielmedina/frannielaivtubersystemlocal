'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ReversiGame } from '@/games/ReversiGame';
import { RefreshCw, HelpCircle } from 'lucide-react';

export const ReversiBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage } = useStore();
  const [game, setGame] = useState<ReversiGame | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const newGame = new ReversiGame(gameState.aiColor, async (move) => {
      // Update legal moves for next player
      setTimeout(() => {
        if (game) {
          setLegalMoves(game.getLegalMoves(game.getCurrentPlayer()));
        }
      }, 100);
    });
    setGame(newGame);
    setLegalMoves(newGame.getLegalMoves(newGame.getCurrentPlayer()));
  }, []);

  useEffect(() => {
    if (!game || game.isGameOver()) return;
    
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
    if (game.getCurrentPlayer() === aiPlayer) {
      setTimeout(async () => {
        await game.makeAIMove();
        
        const winner = game.getWinner();
        if (winner) {
          const score = game.getScore();
          let message = '';
          
          if (winner === 'ai') {
            message = `I win! Final score: AI ${score.ai} - You ${score.player} 🎉`;
            setAnimation({ type: 'emote', name: 'heart', duration: 3000 });
          } else if (winner === 'player') {
            message = `You won! Final score: You ${score.player} - AI ${score.ai} 👏`;
            setAnimation({ type: 'emote', name: 'sad', duration: 2000 });
          } else {
            message = `It's a draw! ${score.player} - ${score.ai} 🤝`;
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
      }, 800);
    }
  }, [game, gameState]);

  const handleSquareClick = (row: number, col: number) => {
    if (!game || game.isGameOver()) return;
    
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    if (game.getCurrentPlayer() === aiPlayer) return;

    const move = game.makeMove(row, col);
    
    if (move) {
      setLegalMoves(game.getLegalMoves(game.getCurrentPlayer()));
    }
  };

  const handleReset = () => {
    game?.reset();
    if (game) {
      setLegalMoves(game.getLegalMoves(game.getCurrentPlayer()));
    }
    setGameState({ winner: null, moveHistory: [] });
    setShowHint(false);
    
    addChatMessage({
      id: Date.now().toString(),
      username: 'Miko',
      message: 'New Reversi game! Good luck! 🎮',
      timestamp: Date.now(),
      isAI: true,
      color: '#9333ea'
    });
  };

  const handleHint = () => {
    if (!game) return;
    const hint = game.getHint();
    if (hint) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
  };

  if (!game) return <div className="text-white">Loading...</div>;

  const board = game.getBoard();
  const score = game.getScore();
  const hint = showHint ? game.getHint() : null;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">⚪ Reversi/Othello</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleHint} 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white"
            disabled={game.isGameOver()}
          >
            <HelpCircle size={16} /> Hint
          </button>
          <button 
            onClick={handleReset} 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white"
          >
            <RefreshCw size={16} /> New Game
          </button>
        </div>
      </div>

      {/* Score Display */}
      <div className="mb-4 flex gap-8 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-white"></div>
          <span className="font-bold">AI: {score.ai}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-900"></div>
          <span className="font-bold">You: {score.player}</span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 bg-green-700 mb-4">
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const isLegal = legalMoves.some(([r, c]) => r === rowIdx && c === colIdx);
            const isHint = hint && hint[0] === rowIdx && hint[1] === colIdx;

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleSquareClick(rowIdx, colIdx)}
                className={`w-16 h-16 flex items-center justify-center cursor-pointer transition-all border border-green-800 ${
                  isLegal ? 'hover:bg-green-600' : ''
                } ${isHint ? 'ring-4 ring-yellow-400 ring-inset' : ''}`}
              >
                {piece !== null && (
                  <div 
                    className={`w-12 h-12 rounded-full ${
                      piece === 1 ? 'bg-white' : 'bg-gray-900'
                    } border-2 ${
                      piece === 1 ? 'border-gray-300' : 'border-gray-700'
                    } shadow-lg transition-all duration-300 animate-fade-in`}
                  />
                )}
                {piece === null && isLegal && (
                  <div className="w-3 h-3 rounded-full bg-green-400 opacity-70" />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-white text-center">
        <p className="text-sm text-gray-400">
          Current Turn: {game.getCurrentPlayer() === 1 ? '⚪ White (You)' : '⚫ Black (AI)'}
        </p>
        {legalMoves.length === 0 && !game.isGameOver() && (
          <p className="text-yellow-400 mt-2">No legal moves - turn passes</p>
        )}
      </div>

      {game.isGameOver() && (
        <div className="mt-4 text-xl font-bold text-yellow-400">
          {game.getWinner() === 'player' && '🎉 You Won!'}
          {game.getWinner() === 'ai' && '🤖 AI Wins!'}
          {game.getWinner() === 'draw' && '🤝 Draw!'}
        </div>
      )}
    </div>
  );
};
