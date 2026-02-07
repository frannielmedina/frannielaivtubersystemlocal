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
    if (!this.config.enabled || !this.config.token || !this.config.channel) {
      throw new Error('Configuración de Twitch incompleta');
    }

    this.messageCallback = onMessage;

    this.client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: this.config.username,
        password: this.config.token,
      },
      channels: [this.config.channel],
    });

    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('connected', () => {
      console.log('✅ Conectado a Twitch');
    });
    this.client.on('disconnected', () => {
      console.log('❌ Desconectado de Twitch');
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

    // Ignore messages starting with ! or containing @
    if (message.startsWith('!') || message.includes('@')) {
      console.log('🚫 Mensaje ignorado:', message);
      return;
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

  async sendMessage(message: string): Promise<void> {
    if (this.client && this.config.channel) {
      await this.client.say(this.config.channel, message);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  updateConfig(config: TwitchConfig): void {
    this.config = config;
  }

  isConnected(): boolean {
    return this.client?.readyState() === 'OPEN';
  }
}
