import tmi from 'tmi.js';
import type { TwitchConfig, TwitchMessage } from '@/types';

export class TwitchService {
  private client: tmi.Client | null = null;
  private config: TwitchConfig;
  private messageCallback: ((message: TwitchMessage) => void) | null = null;

  constructor(config: TwitchConfig) {
    this.config = config;
  }

  async connect(onMessage: (message: TwitchMessage) => void): Promise<void> {
    if (!this.config.enabled || !this.config.channel) {
      throw new Error('Configuración de Twitch incompleta');
    }

    this.messageCallback = onMessage;

    // Build client options
    const clientOptions: tmi.Options = {
      options: { debug: false },
      connection: {
        reconnect: true,
        secure: true,
      },
      channels: [this.config.channel],
    };

    // If token is provided, use authenticated mode
    // Otherwise, connect anonymously (read-only)
    if (this.config.token && this.config.token.trim() !== '') {
      clientOptions.identity = {
        username: this.config.username || 'mikobot',
        password: this.config.token,
      };
      console.log('🔐 Connecting to Twitch with authentication');
    } else {
      // Anonymous connection (read-only)
      clientOptions.identity = {
        username: 'justinfan' + Math.floor(Math.random() * 100000),
      };
      console.log('👤 Connecting to Twitch anonymously (read-only mode)');
    }

    this.client = new tmi.Client(clientOptions);

    this.client.on('message', this.handleMessage.bind(this));
    
    this.client.on('connected', (address, port) => {
      console.log('✅ Connected to Twitch:', address, port);
      if (!this.config.token || this.config.token.trim() === '') {
        console.log('ℹ️  Read-only mode: Can receive messages but cannot send');
      }
    });
    
    this.client.on('disconnected', (reason) => {
      console.log('❌ Disconnected from Twitch:', reason);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting to Twitch...');
    });

    await this.client.connect();
  }

  private handleMessage(
    channel: string,
    tags: tmi.ChatUserstate,
    message: string,
    self: boolean
  ): void {
    // Ignore own messages
    if (self) return;

    // FIXED: Allow game commands (!move, !place) but ignore other ! commands
    const isGameCommand = this.isGameCommand(message);
    
    if (!isGameCommand) {
      // Ignore non-game commands starting with ! or containing @
      if (message.startsWith('!') || message.includes('@')) {
        console.log('🚫 Non-game command ignored:', message);
        return;
      }
    }

    const twitchMessage: TwitchMessage = {
      username: tags['display-name'] || tags.username || 'Anónimo',
      message: message,
      color: tags.color,
      badges: tags.badges,
      timestamp: Date.now(),
    };

    if (this.messageCallback) {
      this.messageCallback(twitchMessage);
    }
  }

  /**
   * Check if message is a valid game command
   */
  private isGameCommand(message: string): boolean {
    const msg = message.trim().toLowerCase();
    
    // Chess commands: !move E2 to E4
    if (/^!move\s+[a-h][1-8]\s+to\s+[a-h][1-8]$/i.test(msg)) {
      console.log('✅ Chess/Checkers command detected:', message);
      return true;
    }
    
    // Reversi commands: !place D3
    if (/^!place\s+[a-h][1-8]$/i.test(msg)) {
      console.log('✅ Reversi command detected:', message);
      return true;
    }
    
    return false;
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.client || !this.config.channel) {
      console.warn('⚠️  Cannot send message: Not connected');
      return;
    }

    // Check if we have authentication
    if (!this.config.token || this.config.token.trim() === '') {
      console.warn('⚠️  Cannot send message: Read-only mode (no OAuth token)');
      return;
    }

    try {
      await this.client.say(this.config.channel, message);
      console.log('📤 Message sent:', message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      console.log('👋 Disconnected from Twitch');
    }
  }

  updateConfig(config: TwitchConfig): void {
    this.config = config;
  }

  isConnected(): boolean {
    return this.client?.readyState() === 'OPEN';
  }

  canSendMessages(): boolean {
    return this.isConnected() && 
           this.config.token !== undefined && 
           this.config.token.trim() !== '';
  }
}
