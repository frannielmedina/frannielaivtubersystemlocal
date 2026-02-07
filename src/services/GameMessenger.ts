/**
 * GameMessenger - Sistema de mensajes automáticos para juegos
 * Integra chat y TTS automáticamente
 */

class GameMessenger {
  constructor(ttsService, chatService) {
    this.tts = ttsService;
    this.chat = chatService;
    this.animationQueue = [];
    this.vrmController = null;
  }
  
  setVRMController(controller) {
    this.vrmController = controller;
  }
  
  /**
   * Enviar mensaje de juego con TTS y animaciones automáticas
   */
  sendGameMessage(message, options = {}) {
    const {
      priority = false,
      showInChat = true,
      speakInTTS = true,
      animation = null,
      delay = 0
    } = options;
    
    const execute = () => {
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
        this.tts.speak(cleanMessage, priority);
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
  sendGameWelcome(gameName, commands, tips = '') {
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
  sendMoveSuccess(move, details = '', animation = 'CLAP') {
    let message = `¡Excelente! ${move}`;
    if (details) message += `. ${details}`;
    
    this.sendGameMessage(message, {
      animation: animation
    });
  }
  
  /**
   * Mensaje de movimiento inválido
   */
  sendMoveInvalid(reason, suggestion = '') {
    let message = `Movimiento inválido. ${reason}`;
    if (suggestion) message += ` ${suggestion}`;
    
    this.sendGameMessage(message, {
      animation: 'SHAKE'
    });
  }
  
  /**
   * Mensaje de victoria
   */
  sendVictory(winner, score = '') {
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
  sendDraw(message = '¡Es un empate!') {
    this.sendGameMessage(message, {
      priority: true,
      animation: 'THINK'
    });
  }
  
  /**
   * Mensaje de turno
   */
  sendTurnChange(player) {
    this.sendGameMessage(`Turno de ${player}`, {
      animation: 'POINT'
    });
  }
  
  /**
   * Mensaje de puntuación
   */
  sendScore(scores) {
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
  sendHelp(commands) {
    this.sendGameMessage(`Comandos disponibles: ${commands}`, {
      animation: 'THINK'
    });
  }
  
  /**
   * Mensaje de captura (para damas/ajedrez)
   */
  sendCapture(piece, position) {
    this.sendGameMessage(`¡Captura increíble! ${piece} en ${position}`, {
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje de promoción (para damas)
   */
  sendPromotion(position) {
    this.sendGameMessage(`¡Promoción a dama en ${position}!`, {
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje de jaque (para ajedrez)
   */
  sendCheck(player) {
    this.sendGameMessage(`¡Jaque al ${player}!`, {
      priority: true,
      animation: 'SURPRISED'
    });
  }
  
  /**
   * Mensaje de jaque mate (para ajedrez)
   */
  sendCheckmate(winner) {
    this.sendGameMessage(`¡Jaque mate! ${winner} gana la partida`, {
      priority: true,
      animation: 'CELEBRATE'
    });
  }
  
  /**
   * Mensaje personalizado con múltiples animaciones
   */
  sendCustom(message, animations = [], priority = false) {
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
  async sendSequence(messages) {
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
  playAnimation(animationName) {
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
  clear() {
    if (this.tts) {
      this.tts.clearQueue();
    }
    this.animationQueue = [];
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.GameMessenger = GameMessenger;
}

export default GameMessenger;
