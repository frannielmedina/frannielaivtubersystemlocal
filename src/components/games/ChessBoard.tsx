'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ChessGame } from '@/games/ChessGame';
import { RefreshCw } from 'lucide-react';

export const ChessBoard: React.FC = () => {
  const { gameState, setGameState, setAnimation, addChatMessage } = useStore();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  useEffect(() => {
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
        const winner = game?.getWinner();
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
    
    setGame(newGame);
    
    // If AI is white, make first move
    if (gameState.aiColor === 'white') {
      setTimeout(() => newGame.makeAIMove(), 1000);
    }
  }, []);

  useEffect(() => {
    if (!game || game.isGameOver()) return;
    
    const currentTurn = game.turn();
    const aiTurn = gameState.aiColor === 'white' ? 'w' : 'b';
    
    if (currentTurn === aiTurn) {
      setTimeout(() => game.makeAIMove(), 500);
    }
  }, [game?.turn()]);

  const handleSquareClick = (square: string) => {
    if (!game || game.isGameOver()) return;
    
    // Check if it's player's turn
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
        
        // Check if player tried to make illegal move while in check
        if (game.isCheck() && !move) {
          addChatMessage({
            id: Date.now().toString(),
            username: 'Miko',
            message: 'You can\'t do that! Your king is in check! 🚫',
            timestamp: Date.now(),
            isAI: true,
            color: '#9333ea'
          });
        }
      } else {
        // Try selecting new square
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

  const handleReset = () => {
    game?.reset();
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
    
    // If AI is white, make first move
    if (gameState.aiColor === 'white') {
      setTimeout(() => game?.makeAIMove(), 1000);
    }
  };

  if (!game) return <div className="text-white">Loading chess game...</div>;

  const board = game.getBoard();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 flex justify-between w-full items-center">
        <h2 className="text-2xl font-bold text-white">♟️ Chess</h2>
        <button 
          onClick={handleReset} 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white transition-colors"
        >
          <RefreshCw size={16} /> New Game
        </button>
      </div>

      {game.isCheck() && !game.isCheckmate() && (
        <div className="mb-2 px-4 py-2 bg-red-600 text-white rounded animate-pulse">
          ⚠️ CHECK! King is in danger!
        </div>
      )}

      <div className="relative">
        {/* Rank labels (left) */}
        <div className="absolute -left-6 top-0 h-full flex flex-col justify-around text-gray-400 text-sm">
          {ranks.map(rank => (
            <div key={rank} className="h-16 flex items-center">{rank}</div>
          ))}
        </div>

        {/* Board */}
        <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 shadow-2xl">
          {board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              const square = `${files[colIdx]}${8 - rowIdx}`;
              const isLight = (rowIdx + colIdx) % 2 === 0;
              const isSelected = square === selectedSquare;
              const isLegal = legalMoves.includes(square);
              const isLastMove = false; // TODO: track last move

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`w-16 h-16 flex items-center justify-center text-5xl cursor-pointer transition-all relative ${
                    isLight ? 'bg-amber-100' : 'bg-amber-700'
                  } ${isSelected ? 'ring-4 ring-inset ring-blue-500' : ''} ${
                    isLegal ? 'ring-2 ring-inset ring-green-400' : ''
                  } ${isLastMove ? 'bg-yellow-300' : ''} hover:opacity-80`}
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

        {/* File labels (bottom) */}
        <div className="flex justify-around text-gray-400 text-sm mt-1">
          {files.map(file => (
            <div key={file} className="w-16 text-center">{file}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-white text-center">
        <p className="text-sm text-gray-400">
          Turn: {game.turn() === 'w' ? '⚪ White' : '⚫ Black'}
        </p>
        {game.isCheck() && (
          <p className="text-red-400 font-bold mt-1">IN CHECK!</p>
        )}
      </div>

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
