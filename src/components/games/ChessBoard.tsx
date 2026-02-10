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
  const [aiThinking, setAiThinking] = useState(false);

  // Function to update game context for AI
  const updateGameContextForAI = (move?: any, isAIMove?: boolean) => {
    if (!game) return;

    const updateContext = (window as any).updateGameContext;
    if (!updateContext) return;

    const context: any = {
      game: 'chess',
      boardState: game.getFEN(),
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      currentTurn: game.turn() === 'w' ? 'White' : 'Black',
    };

    if (move) {
      const pieceNames: Record<string, string> = {
        p: 'Pawn', r: 'Rook', n: 'Knight', 
        b: 'Bishop', q: 'Queen', k: 'King'
      };

      context.lastMove = {
        player: isAIMove ? 'AI' : 'Player',
        from: move.from,
        to: move.to,
        piece: pieceNames[move.piece] || move.piece,
        captured: !!move.captured,
      };
    }

    console.log('♟️ Updating chess game context:', context);
    updateContext(context);
  };

  useEffect(() => {
    const newGame = new ChessGame(gameState.aiColor, async (move) => {
      // Update context when AI moves
      setTimeout(() => {
        if (newGame.isGameOver()) {
          const chessWinner = newGame.getWinner();
          let message = '';
          let gameStateWinner: 'player' | 'ai' | 'draw' | null = null;
          
          if (chessWinner === 'white') {
            gameStateWinner = gameState.aiColor === 'white' ? 'ai' : 'player';
            message = gameState.aiColor === 'white' ? 'Checkmate! I won! 👑' : 'Checkmate! You won! 🎉';
            setAnimation({ 
              type: 'emote', 
              name: gameState.aiColor === 'white' ? 'heart' : 'sad', 
              duration: 3000 
            });
          } else if (chessWinner === 'black') {
            gameStateWinner = gameState.aiColor === 'black' ? 'ai' : 'player';
            message = gameState.aiColor === 'black' ? 'Checkmate! I won! 👑' : 'Checkmate! You won! 🎉';
            setAnimation({ 
              type: 'emote', 
              name: gameState.aiColor === 'black' ? 'heart' : 'sad', 
              duration: 3000 
            });
          } else if (chessWinner === 'draw') {
            gameStateWinner = 'draw';
            message = 'Stalemate! It\'s a draw! 🤝';
            setAnimation({ type: 'emote', name: 'surprised', duration: 2000 });
          }
          
          setGameState({ winner: gameStateWinner });
          addChatMessage({
            id: Date.now().toString(),
            username: 'Miko',
            message,
            timestamp: Date.now(),
            isAI: true,
            color: '#9333ea'
          });
        }

        updateGameContextForAI(move, true);
      }, 100);
    });
    setGame(newGame);
  }, []);

  useEffect(() => {
    if (!game || aiThinking) return;

    const initAndPlay = async () => {
      const initialized = await game.waitForInit();
      if (!initialized) {
        console.error('❌ Game failed to initialize');
        return;
      }

      const aiPlayer = gameState.aiColor === 'white' ? 'w' : 'b';
      
      if (game.turn() === aiPlayer && !game.isGameOver()) {
        console.log('🤖 AI turn detected, making move...');
        setAiThinking(true);

        // Add message before AI thinks
        addChatMessage({
          id: Date.now().toString(),
          username: 'System',
          message: '🤔 AI is thinking about the next move...',
          timestamp: Date.now(),
          color: '#3b82f6'
        });

        try {
          const move = await game.makeAIMove();
          
          if (move) {
            // Announce AI's move
            const pieceNames: Record<string, string> = {
              p: 'Pawn', r: 'Rook', n: 'Knight', 
              b: 'Bishop', q: 'Queen', k: 'King'
            };

            let moveMessage = `🤖 AI moved ${pieceNames[move.piece] || move.piece} from ${move.from} to ${move.to}`;
            
            if (move.captured) {
              moveMessage += ` and captured your ${pieceNames[move.captured] || move.captured}!`;
            }
            
            if (move.isCheck && !move.isCheckmate) {
              moveMessage += ' ⚠️ CHECK!';
              setAnimation({ type: 'emote', name: 'surprised', duration: 2000 });
            }

            addChatMessage({
              id: (Date.now() + 1).toString(),
              username: 'Miko',
              message: moveMessage,
              timestamp: Date.now(),
              isAI: true,
              color: '#9333ea'
            });

            updateGameContextForAI(move, true);
          }
        } catch (error) {
          console.error('❌ Error making AI move:', error);
          addChatMessage({
            id: Date.now().toString(),
            username: 'System',
            message: 'AI encountered an error making a move',
            timestamp: Date.now(),
            color: '#ef4444'
          });
        } finally {
          setAiThinking(false);
        }
      }
    };

    initAndPlay();
  }, [game?.turn(), game?.isGameOver(), aiThinking]);

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

  useEffect(() => {
    if (!game) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.isAI) return;
    
    const message = lastMessage.message.trim().toLowerCase();
    
    const movePattern = /^!move\s+([a-h][1-8])\s+to\s+([a-h][1-8])$/i;
    const match = message.match(movePattern);
    
    if (match) {
      const [_, from, to] = match;
      handleCommandMove(from, to, lastMessage.username);
    }
  }, [chatMessages, game]);

  const handleCommandMove = (fromNotation: string, toNotation: string, username: string) => {
    if (!game || aiThinking) return;
    
    const from = fromNotation.toLowerCase();
    const to = toNotation.toLowerCase();
    
    const aiPlayer = gameState.aiColor === 'white' ? 'w' : 'b';
    
    if (game.turn() === aiPlayer) {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ It's AI's turn! Wait for your turn.`,
        timestamp: Date.now(),
        color: '#ef4444'
      });
      return;
    }
    
    const move = game.makePlayerMove(from, to);
    
    if (move) {
      const pieceNames: Record<string, string> = {
        p: 'Pawn', r: 'Rook', n: 'Knight', 
        b: 'Bishop', q: 'Queen', k: 'King'
      };

      let moveMessage = `✅ ${username} moved ${pieceNames[move.piece] || move.piece} from ${fromNotation.toUpperCase()} to ${toNotation.toUpperCase()}`;
      
      if (move.captured) {
        moveMessage += ` (captured ${pieceNames[move.captured] || move.captured})`;
      }
      
      if (move.isCheck && !move.isCheckmate) {
        moveMessage += ' ⚠️ CHECK!';
      }
      
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: moveMessage,
        timestamp: Date.now(),
        color: '#10b981'
      });
      
      updateGameContextForAI(move, false);
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      addChatMessage({
        id: Date.now().toString(),
        username: 'System',
        message: `❌ Invalid move: ${fromNotation.toUpperCase()} to ${toNotation.toUpperCase()}. The piece cannot move there, or it would leave your king in check.`,
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
    return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!game || game.isGameOver() || aiThinking) return;

    const aiPlayer = gameState.aiColor === 'white' ? 'w' : 'b';
    
    if (game.turn() === aiPlayer) {
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

    const square = rowColToChessNotation(row, col);

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const from = rowColToChessNotation(fromRow, fromCol);
      const to = square;
      
      const move = game.makePlayerMove(from, to);
      
      if (move) {
        const pieceNames: Record<string, string> = {
          p: 'Pawn', r: 'Rook', n: 'Knight', 
          b: 'Bishop', q: 'Queen', k: 'King'
        };

        let moveMessage = `✅ You moved ${pieceNames[move.piece] || move.piece} from ${from.toUpperCase()} to ${to.toUpperCase()}`;
        
        if (move.captured) {
          moveMessage += ` and captured AI's ${pieceNames[move.captured] || move.captured}!`;
        }
        
        if (move.isCheck && !move.isCheckmate) {
          moveMessage += ' ⚠️ CHECK!';
        }
        
        addChatMessage({
          id: Date.now().toString(),
          username: 'System',
          message: moveMessage,
          timestamp: Date.now(),
          color: '#10b981'
        });

        updateGameContextForAI(move, false);
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        const moves = game.getLegalMoves(square);
        if (moves.length > 0) {
          setSelectedSquare([row, col]);
          setLegalMoves(moves.map(m => {
            const { row: r, col: c } = chessNotationToRowCol(m);
            return [r, c] as [number, number];
          }));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const moves = game.getLegalMoves(square);
      if (moves.length > 0) {
        setSelectedSquare([row, col]);
        setLegalMoves(moves.map(m => {
          const { row: r, col: c } = chessNotationToRowCol(m);
          return [r, c] as [number, number];
        }));
      }
    }
  };

  const handleReset = () => {
    if (autoRestartTimer) {
      clearTimeout(autoRestartTimer);
      setAutoRestartTimer(null);
    }

    setAiThinking(false);
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

    updateGameContextForAI();
  };

  const handleHint = () => {
    if (!game) return;
    
    const board = game.getBoard();
    const turn = game.turn();
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = rowColToChessNotation(row, col);
        const piece = board[row][col];
        
        if (piece && piece[0] === turn) {
          const moves = game.getLegalMoves(square);
          if (moves.length > 0) {
            const to = moves[0];
            addChatMessage({
              id: Date.now().toString(),
              username: 'Miko',
              message: `💡 Hint: Move ${square.toUpperCase()} to ${to.toUpperCase()}`,
              timestamp: Date.now(),
              isAI: true,
              color: '#3b82f6'
            });
            setShowHint(true);
            setTimeout(() => setShowHint(false), 3000);
            return;
          }
        }
      }
    }
  };

  if (!game) return <div className="text-white">Loading...</div>;

  const board = game.getBoard();

  const getPieceSymbol = (piece: string): string => {
    if (!piece || piece.length < 2) return '';
    
    const color = piece[0] as 'w' | 'b';
    const type = piece[1] as 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
    
    const pieces: Record<string, { w: string; b: string }> = {
      p: { w: '♙', b: '♟' },
      r: { w: '♖', b: '♜' },
      n: { w: '♘', b: '♞' },
      b: { w: '♗', b: '♝' },
      q: { w: '♕', b: '♛' },
      k: { w: '♔', b: '♚' },
    };
    
    return pieces[type]?.[color] || '';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 overflow-y-auto">
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
            disabled={game.isGameOver() || aiThinking}
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

      {aiThinking && (
        <div className="mb-4 w-full bg-purple-900 bg-opacity-50 rounded-lg p-3 border border-purple-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-white font-semibold">AI is thinking...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 mb-4 flex-shrink-0">
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const isSelected = selectedSquare?.[0] === rowIdx && selectedSquare?.[1] === colIdx;
            const isLegalMove = legalMoves.some(([r, c]) => r === rowIdx && c === colIdx);
            const isLight = (rowIdx + colIdx) % 2 === 0;

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleSquareClick(rowIdx, colIdx)}
                className={`w-16 h-16 flex items-center justify-center cursor-pointer transition-all ${
                  isLight ? 'bg-amber-100' : 'bg-amber-700'
                } ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''} ${
                  isLegalMove ? 'ring-4 ring-green-400 ring-inset' : ''
                } ${aiThinking ? 'cursor-not-allowed opacity-70' : 'hover:opacity-80'}`}
              >
                {piece && (
                  <span className="text-5xl select-none">
                    {getPieceSymbol(piece)}
                  </span>
                )}
                {!piece && isLegalMove && !aiThinking && (
                  <div className="w-4 h-4 rounded-full bg-green-500 opacity-50" />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-white text-center flex-shrink-0">
        <p className="text-sm text-gray-400">
          Current Turn: {game.turn() === 'w' ? '⚪ White' : '⚫ Black'}
          {aiThinking && ' - AI is thinking...'}
        </p>
        {game.isCheck() && <p className="text-red-500 font-bold mt-2">⚠️ CHECK!</p>}
      </div>

      {game.isGameOver() && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex-shrink-0">
          <div className="text-2xl font-bold text-white text-center">
            {game.getWinner() === 'white' && '⚪ White Wins!'}
            {game.getWinner() === 'black' && '⚫ Black Wins!'}
            {game.getWinner() === 'draw' && '🤝 Draw!'}
          </div>
          <div className="text-sm text-white text-center mt-2">
            Game will restart in 10 seconds...
          </div>
        </div>
      )}
    </div>
  );
};
