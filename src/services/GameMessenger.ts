/**
 * GameMessenger - Sistema de mensajes automáticos para juegos (TypeScript)
 * Integra chat y TTS automáticamente
 */

import { TTSService } from './TTSService';

interface GameMessageOptions {
  priority?: boolean;
  showInChat?: boolean;
  speakInTTS?: boolean;
  animation?: string | null;
  delay?: number;
}

interface SequenceMessage {
  text: string;
  animation?: string;
  delay?: number;
}

interface VRMController {
  playAnimation: (name: string) => void;
}

interface ChatService {
  addSystemMessage: (message: string) => void;
}

export class GameMessenger {
  private tts: TTSService | undefined;
  private chat: ChatService | undefined;
  private animationQueue: string[];
  private vrmController: VRMController | null;

  constructor(ttsService?: TTSService, chatService?: ChatService) {
    this.tts = ttsService;
    this.chat = chatService;
    this.animationQueue = [];
    this.vrmController = null;
  }
  
  setVRMController(controller: VRMController): void {
    this.vrmController = controller;
  }
  
  /**
   * Enviar mensaje de juego con TTS y animaciones automáticas
   */
  sendGameMessage(message: string, options: GameMessageOptions = {}): void {
    const {
      priority = false,
      showInChat = true,
      speakInTTS = true,
      animation = null,
      delay = 0
    } = options;
    
    const execute = (): void => {
      // Construir mensaje completo con animación
      const fullMessage = animation 
        ? `${message} [${animation.toUpperCase()}]`
        : message;
      
      // Mostrar en chat
      if (showInChat && this.chat) {
        this.chat.addSystemMessage(fullMessage);
      }
      
      // Hablar con TTS (sin tags de animación)
      if (speakInTTS && this.tts) {
        const cleanMessage = message.replace(/\[.*?\]/g, '').trim();
        // TTSService.speak() solo acepta 1 argumento
        this.tts.speak(cleanMessage);
      }
      
      // Ejecutar animación en VRM
      if (animation && this.vrmController) {
        this.playAnimation(animation);
      }
    };
    
    if (delay > 0) {
      setTimeout(execute, delay);
    } else {
      execute();
    }
  }
  
  /**
   * Mensaje de bienvenida de juego
   */
  sendGameWelcome(gameName: string, commands: string, tips: string = ''): void {
    let message = `¡Bienvenido a ${gameName}!`;
    if (commands) message += ` ${commands}`;
    if (tips) message += ` ${tips}`;
    
    this.sendGameMessage(message, {
      priority: true,
      animation: 'WAVE'
    });
  }
  
  /**
   * Mensaje de movimiento exitoso
   */
  sendMoveSuccess(move: string, details: string = '', animation: string = 'CLAP'): void {
    let message = `¡Excelente! ${move}`;
    if (details) message += `. ${details}`;
    
    this.sendGameMessage(message, {
      animation: animation
    });
  }
  
  /**
   * Mensaje de movimiento inválido
   */
  sendMoveInvalid(reason: string, suggestion: string = ''): void {
    let message = `Movimiento inválido. ${reason}`;
    if (suggestion) message += ` ${suggestion}`;
    
    this.sendGameMessage(message, {
      animation: 'SHAKE'
    });
  }
  
  /**
   * Mensaje de victoria
   */
  sendVictory(winner: string, score: string = ''): void {
    let message = `¡${winner} ha ganado la partida! ¡Felicitaciones!`;
    if (score) message += ` ${score}`;
    
    this.sendGameMessage(message, {
      priority: true,
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje de empate
   */
  sendDraw(message: string = '¡Es un empate!'): void {
    this.sendGameMessage(message, {
      priority: true,
      animation: 'THINK'
    });
  }
  
  /**
   * Mensaje de turno
   */
  sendTurnChange(player: string): void {
    this.sendGameMessage(`Turno de ${player}`, {
      animation: 'POINT'
    });
  }
  
  /**
   * Mensaje de puntuación
   */
  sendScore(scores: Record<string, number>): void {
    const message = Object.entries(scores)
      .map(([player, score]) => `${player}: ${score}`)
      .join(', ');
    
    this.sendGameMessage(`Puntuación: ${message}`, {
      animation: 'HAPPY'
    });
  }
  
  /**
   * Mensaje de ayuda
   */
  sendHelp(commands: string): void {
    this.sendGameMessage(`Comandos disponibles: ${commands}`, {
      animation: 'THINK'
    });
  }
  
  /**
   * Mensaje de captura (para damas/ajedrez)
   */
  sendCapture(piece: string, position: string): void {
    this.sendGameMessage(`¡Captura increíble! ${piece} en ${position}`, {
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje de promoción (para damas)
   */
  sendPromotion(position: string): void {
    this.sendGameMessage(`¡Promoción a dama en ${position}!`, {
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje de jaque (para ajedrez)
   */
  sendCheck(player: string): void {
    this.sendGameMessage(`¡Jaque al ${player}!`, {
      priority: true,
      animation: 'SURPRISED'
    });
  }
  
  /**
   * Mensaje de jaque mate (para ajedrez)
   */
  sendCheckmate(winner: string): void {
    this.sendGameMessage(`¡Jaque mate! ${winner} gana la partida`, {
      priority: true,
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje personalizado con múltiples animaciones
   */
  sendCustom(message: string, animations: string[] = [], priority: boolean = false): void {
    // Añadir todas las animaciones al mensaje
    const animTags = animations.map(a => `[${a.toUpperCase()}]`).join(' ');
    const fullMessage = `${message} ${animTags}`;
    
    this.sendGameMessage(fullMessage, {
      priority: priority
    });
  }
  
  /**
   * Secuencia de mensajes con delays
   */
  async sendSequence(messages: SequenceMessage[]): Promise<void> {
    for (const msg of messages) {
      const { text, animation, delay = 1000 } = msg;
      
      this.sendGameMessage(text, { animation });
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Ejecutar animación en VRM
   */
  playAnimation(animationName: string): void {
    if (!this.vrmController) return;
    
    try {
      this.vrmController.playAnimation(animationName.toLowerCase());
    } catch (error) {
      console.error('Error playing animation:', error);
    }
  }
  
  /**
   * Limpiar cola de mensajes
   */
  clear(): void {
    if (this.tts) {
      this.tts.clearQueue();
    }
    this.animationQueue = [];
  }
}

// Export default también para compatibilidad
export default GameMessenger;
