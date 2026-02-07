/**
 * ChessGame - Integración de Ajedrez con comandos y TTS (TypeScript)
 */

import React, { useState, useEffect } from 'react';
import { Chess, Move } from 'chess.js';
import GameMessenger from '../services/GameMessenger';
import TTSService from '../services/TTSService';

interface ChessGameProps {
  ttsService?: TTSService;
  chatService?: any;
  vrmController?: any;
}

interface ChatMessage {
  text: string;
  user?: string;
}

const ChessGame: React.FC<ChessGameProps> = ({ ttsService, chatService, vrmController }) => {
  const [game, setGame] = useState(new Chess());
  const [gameMessenger] = useState(() => new GameMessenger(ttsService, chatService));
  const [showHelp, setShowHelp] = useState(true);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  useEffect(() => {
    // Configurar VRM controller
    if (vrmController) {
      gameMessenger.setVRMController(vrmController);
    }

    // Mensaje de bienvenida
    gameMessenger.sendGameWelcome(
      'Ajedrez',
      'Usa !move [origen] to [destino] para mover. Ejemplo: !move E2 to E4',
      'Las columnas van de A a H y las filas de 1 a 8.'
    );

    // Escuchar comandos del chat
    const handleChatMessage = (message: ChatMessage) => {
      if (message.text) {
        handleChessCommand(message.text);
      }
    };

    chatService?.on('message', handleChatMessage);

    return () => {
      chatService?.off('message', handleChatMessage);
    };
  }, [chatService, gameMessenger, vrmController]);

  /**
   * Manejar comandos de chat
   */
  const handleChessCommand = (message: string): void => {
    const text = message.toLowerCase().trim();

    // Comando !move
    const movePattern = /!move\s+([a-h][1-8])\s+to\s+([a-h][1-8])/i;
    const moveMatch = text.match(movePattern);
    
    if (moveMatch) {
      const [_, from, to] = moveMatch;
      makeMove(from.toLowerCase(), to.toLowerCase());
      return;
    }

    // Comando !reset
    if (text === '!reset') {
      resetGame();
      return;
    }

    // Comando !hint
    if (text === '!hint') {
      showHint();
      return;
    }

    // Comando !undo
    if (text === '!undo') {
      undoMove();
      return;
    }

    // Comando !moves
    if (text === '!moves') {
      showPossibleMoves();
      return;
    }

    // Comando !help
    if (text === '!help' || text === '!comandos') {
      showCommands();
      return;
    }
  };

  /**
   * Realizar movimiento
   */
  const makeMove = (from: string, to: string): void => {
    try {
      const move = game.move({
        from: from,
        to: to,
        promotion: 'q' // Siempre promocionar a reina
      });

      if (move) {
        // Movimiento exitoso
        setGame(new Chess(game.fen()));
        setMoveHistory([...moveHistory, move]);

        // Determinar tipo de movimiento
        let details = '';
        let animation = 'CLAP';

        if (move.captured) {
          details = `Capturaste ${getPieceName(move.captured)}`;
          animation = 'CELEBRATE';
          gameMessenger.sendCapture(getPieceName(move.piece), to.toUpperCase());
        } else {
          details = `${getPieceName(move.piece)} de ${from.toUpperCase()} a ${to.toUpperCase()}`;
        }

        gameMessenger.sendMoveSuccess('Movimiento exitoso', details, animation);

        // Verificar estado del juego
        checkGameState();
      }
    } catch (error) {
      // Movimiento inválido
      gameMessenger.sendMoveInvalid(
        `No puedes mover de ${from.toUpperCase()} a ${to.toUpperCase()}`,
        'Intenta con otra posición válida.'
      );
    }
  };

  /**
   * Verificar estado del juego
   */
  const checkGameState = (): void => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Negras' : 'Blancas';
      gameMessenger.sendCheckmate(winner);
    } else if (game.isCheck()) {
      const player = game.turn() === 'w' ? 'Rey Blanco' : 'Rey Negro';
      gameMessenger.sendCheck(player);
    } else if (game.isDraw()) {
      gameMessenger.sendDraw('¡La partida terminó en empate!');
    } else if (game.isStalemate()) {
      gameMessenger.sendDraw('¡Tablas por ahogado!');
    } else if (game.isThreefoldRepetition()) {
      gameMessenger.sendDraw('¡Tablas por repetición triple!');
    } else if (game.isInsufficientMaterial()) {
      gameMessenger.sendDraw('¡Tablas por material insuficiente!');
    } else {
      // Cambio de turno normal
      const player = game.turn() === 'w' ? 'Blancas' : 'Negras';
      gameMessenger.sendTurnChange(player);
    }
  };

  /**
   * Resetear juego
   */
  const resetGame = (): void => {
    setGame(new Chess());
    setMoveHistory([]);
    gameMessenger.sendGameMessage('Juego reiniciado. ¡Buena suerte!', {
      animation: 'HAPPY'
    });
  };

  /**
   * Deshacer movimiento
   */
  const undoMove = (): void => {
    const move = game.undo();
    if (move) {
      setGame(new Chess(game.fen()));
      setMoveHistory(moveHistory.slice(0, -1));
      gameMessenger.sendGameMessage('Movimiento deshecho', {
        animation: 'THINK'
      });
    } else {
      gameMessenger.sendGameMessage('No hay movimientos para deshacer', {
        animation: 'SHAKE'
      });
    }
  };

  /**
   * Mostrar pista
   */
  const showHint = (): void => {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    // Seleccionar movimiento aleatorio
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const hint = `Intenta mover de ${randomMove.from.toUpperCase()} a ${randomMove.to.toUpperCase()}`;
    
    gameMessenger.sendGameMessage(hint, {
      animation: 'THINK'
    });
  };

  /**
   * Mostrar movimientos posibles
   */
  const showPossibleMoves = (): void => {
    const moves = game.moves({ verbose: true });
    const count = moves.length;
    
    gameMessenger.sendGameMessage(
      `Hay ${count} movimientos posibles en esta posición`,
      { animation: 'THINK' }
    );
  };

  /**
   * Mostrar comandos
   */
  const showCommands = (): void => {
    const commands = [
      '!move [origen] to [destino] - Mover pieza',
      '!hint - Obtener pista',
      '!undo - Deshacer movimiento',
      '!moves - Ver cantidad de movimientos',
      '!reset - Reiniciar partida'
    ].join(', ');
    
    gameMessenger.sendHelp(commands);
  };

  /**
   * Obtener nombre de pieza en español
   */
  const getPieceName = (piece: string): string => {
    const pieces: Record<string, string> = {
      'p': 'Peón',
      'n': 'Caballo',
      'b': 'Alfil',
      'r': 'Torre',
      'q': 'Reina',
      'k': 'Rey'
    };
    return pieces[piece.toLowerCase()] || piece;
  };

  return (
    <div className="chess-game">
      {/* Panel de ayuda */}
      {showHelp && (
        <div className="help-panel">
          <button className="close-btn" onClick={() => setShowHelp(false)}>✕</button>
          <h3>📋 Comandos de Ajedrez</h3>
          <div className="command-list">
            <div className="command">
              <code>!move [origen] to [destino]</code>
              <span>Mover pieza. Ejemplo: <code>!move E2 to E4</code></span>
            </div>
            <div className="command">
              <code>!hint</code>
              <span>Obtener una pista de movimiento</span>
            </div>
            <div className="command">
              <code>!undo</code>
              <span>Deshacer último movimiento</span>
            </div>
            <div className="command">
              <code>!moves</code>
              <span>Ver cantidad de movimientos posibles</span>
            </div>
            <div className="command">
              <code>!reset</code>
              <span>Reiniciar la partida</span>
            </div>
          </div>
          <div className="notation-guide">
            <h4>📍 Notación del tablero</h4>
            <p>Columnas: <strong>A - H</strong> (izquierda a derecha)</p>
            <p>Filas: <strong>1 - 8</strong> (abajo a arriba)</p>
            <p>Ejemplo: E4 = columna E, fila 4</p>
          </div>
        </div>
      )}

      {/* Tablero de ajedrez */}
      <div className="chess-board">
        {/* Implementa tu tablero aquí */}
      </div>

      {/* Historial de movimientos */}
      <div className="move-history">
        <h4>Historial</h4>
        {moveHistory.map((move, index) => (
          <div key={index} className="move-item">
            {index + 1}. {move.san}
          </div>
        ))}
      </div>

      {/* Botón para mostrar ayuda */}
      <button className="help-toggle" onClick={() => setShowHelp(!showHelp)}>
        {showHelp ? 'Ocultar' : 'Mostrar'} Comandos
      </button>
    </div>
  );
};

export default ChessGame;
