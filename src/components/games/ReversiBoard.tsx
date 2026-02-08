'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ReversiGame } from '@/games/ReversiGame';
import { RefreshCw, HelpCircle, Info } from 'lucide-react';

export const ReversiBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage, chatMessages } = useStore();
  const [game, setGame] = useState<ReversiGame | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showCommands, setShowCommands] = useState(true);

  useEffect(() => {
    const newGame = new ReversiGame(gameState.aiColor, async (move) => {
      setTimeout(() => {
        if (newGame) {
          setLegalMoves(newGame.getLegalMoves(newGame.getCurrentPlayer()));
        }
      }, 100);
    });
    setGame(newGame);
    setLegalMoves(newGame.getLegalMoves(newGame.getCurrentPlayer()));
  }, []);

  // Listen for chat commands
  useEffect(() => {
    if (!game) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.isAI) return;
    
    const message = lastMessage.message.trim().toLowerCase();
    
    // Reversi command: !place A1 or !place 0,0
    const placePattern = /^!place\s+([a-h][1-8])$/i;
    const match = message.match(placePattern);
    
    if (match) {
      const [_, notation] = match;
      handleCommandPlace(notation);
    }
  }, [chatMessages, game]);

  const handleCommandPlace = (notation: string) => {
    if (!game) return;
    
    const { row, col } = chessNotationToRowCol(notation);
    
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
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
    
    const move = game.makeMove(row, col);
    
    if (move) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `✅ Placed piece at ${notation.toUpperCase()}`,
        timestamp: Date.now(),
        color: '#10b981'
      });
      setLegalMoves(game.getLegalMoves(game.getCurrentPlayer()));
    } else {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ Invalid placement at ${notation.toUpperCase()}`,
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
        
        setLegalMoves(game.getLegalMoves(game.getCurrentPlayer()));
      }, 800);
    }
  }, [game, gameState]);

  const handleSquareClick = (row: number, col: number) => {
    if (!game || game.isGameOver()) return;
    
    const aiPlayer = gameState.aiColor === 'white' ? 1 : -1;
    
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
      const notation = rowColToChessNotation(hint[0], hint[1]);
      addChatMessage({
        id: Date.now().toString(),
        username: 'Miko',
        message: `💡 Hint: Try placing at ${notation}`,
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
  const score = game.getScore();
  const hint = showHint ? game.getHint() : null;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Header */}
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">⚪ Reversi/Othello</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCommands(!showCommands)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white transition-colors"
          >
            <Info size={16} /> {showCommands ? 'Hide' : 'Show'} Commands
          </button>
          <button 
            onClick={handleHint} 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-white transition-colors"
            disabled={game.isGameOver()}
          >
            <HelpCircle size={16} /> Hint
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
              <code className="bg-gray-900 px-2 py-1 rounded text-green-400">!place [position]</code>
              <span className="text-gray-300">Place a piece (e.g., !place D3)</span>
            </div>
            <div className="text-xs text-gray-500 ml-2">
              • Columns: A-H (left to right)
              <br />
              • Rows: 1-8 (bottom to top)
              <br />
              • You must flip opponent's pieces
              <br />
              • Example: !place D3 (place in row 3, column D)
            </div>
          </div>
        </div>
      )}

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

      {/* Board */}
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
                  isLegal ? 'hover:bg-green-600' : 'hover:bg-green-750'
                } ${isHint ? 'ring-4 ring-yellow-400 ring-inset animate-pulse' : ''}`}
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

      {/* Game Status */}
      <div className="text-white text-center">
        <p className="text-sm text-gray-400">
          Current Turn: {game.getCurrentPlayer() === 1 ? '⚪ White (You)' : '⚫ Black (AI)'}
        </p>
        {legalMoves.length === 0 && !game.isGameOver() && (
          <p className="text-yellow-400 mt-2">No legal moves - turn passes</p>
        )}
      </div>

      {/* Game Over */}
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
