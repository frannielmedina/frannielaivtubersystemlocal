/**
 * TTSService - Servicio unificado de Text-to-Speech (TypeScript)
 * Soporta: ElevenLabs, Coqui TTS (remoto/local), Browser Web Speech API
 */

interface TTSConfig {
  elevenlabs: { apiKey: string; voiceId: string };
  coquiRemote: { apiUrl: string; voiceId: string };
  coquiLocal: { serverUrl: string };
}

interface SavedConfig {
  provider: string;
  config: TTSConfig;
}

type TTSProvider = 'browser' | 'elevenlabs' | 'coqui-remote' | 'coqui-local';

export class TTSService {
  provider: TTSProvider;
  config: TTSConfig;
  queue: string[];
  speaking: boolean;
  enabled: boolean;
  volume: number;

  constructor() {
    this.provider = 'browser';
    this.config = {
      elevenlabs: { apiKey: '', voiceId: '' },
      coquiRemote: { apiUrl: '', voiceId: '' },
      coquiLocal: { serverUrl: 'http://localhost:5002' }
    };
    this.queue = [];
    this.speaking = false;
    this.enabled = true;
    this.volume = 1.0;
    
    // Cargar configuración guardada
    this.loadConfig();
  }
  
  loadConfig(): void {
    try {
      const saved = localStorage.getItem('tts-config');
      if (saved) {
        const parsed: SavedConfig = JSON.parse(saved);
        this.provider = parsed.provider as TTSProvider || 'browser';
        this.config = { ...this.config, ...parsed.config };
        console.log('🔊 TTS config loaded:', this.provider);
      }
    } catch (error) {
      console.error('Error loading TTS config:', error);
    }
  }
  
  saveConfig(): void {
    try {
      const toSave: SavedConfig = {
        provider: this.provider,
        config: this.config
      };
      localStorage.setItem('tts-config', JSON.stringify(toSave));
      console.log('💾 TTS config saved');
    } catch (error) {
      console.error('Error saving TTS config:', error);
    }
  }
  
  updateConfig(newConfig: Partial<SavedConfig>): void {
    this.provider = (newConfig.provider as TTSProvider) || this.provider;
    this.config = { ...this.config, ...newConfig.config };
    this.saveConfig();
    console.log('🔄 TTS config updated:', this.provider);
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  async speak(text: string, priority: boolean = false): Promise<void> {
    if (!this.enabled || !text || text.trim() === '') return;
    
    // Limpiar texto de tags de animación
    const cleanText = this._cleanText(text);
    
    if (priority) {
      // Detener audio actual y hablar inmediatamente
      this.stop();
      await this._speak(cleanText);
    } else {
      // Añadir a cola
      this.queue.push(cleanText);
      this._processQueue();
    }
  }
  
  private _cleanText(text: string): string {
    // Remover tags de animación [ANIMATION]
    let clean = text.replace(/\[.*?\]/g, '');
    return clean.trim();
  }
  
  private async _speak(text: string): Promise<void> {
    if (this.speaking) return;
    this.speaking = true;
    
    try {
      switch (this.provider) {
        case 'elevenlabs':
          await this._speakElevenLabs(text);
          break;
        case 'coqui-remote':
          await this._speakCoquiRemote(text);
          break;
        case 'coqui-local':
          await this._speakCoquiLocal(text);
          break;
        default:
          await this._speakBrowser(text);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback a browser TTS
      try {
        await this._speakBrowser(text);
      } catch (fallbackError) {
        console.error('Fallback TTS also failed:', fallbackError);
      }
    } finally {
      this.speaking = false;
    }
  }
  
  private async _speakElevenLabs(text: string): Promise<void> {
    const { apiKey, voiceId } = this.config.elevenlabs || {};
    
    if (!apiKey || !voiceId) {
      throw new Error('ElevenLabs no configurado correctamente');
    }
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    return this._playAudioBlob(audioBlob);
  }
  
  private async _speakCoquiRemote(text: string): Promise<void> {
    const { apiUrl } = this.config.coquiRemote || {};
    
    if (!apiUrl) {
      throw new Error('Coqui Remote no configurado correctamente');
    }
    
    const response = await fetch(`${apiUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Coqui Remote API error: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    return this._playAudioBlob(audioBlob);
  }
  
  private async _speakCoquiLocal(text: string): Promise<void> {
    const { serverUrl } = this.config.coquiLocal || {};
    const url = serverUrl || 'http://localhost:5002';
    
    const response = await fetch(`${url}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Coqui Local API error: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    return this._playAudioBlob(audioBlob);
  }
  
  private _playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.volume = this.volume;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.play().catch(reject);
    });
  }
  
  private async _speakBrowser(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Browser no soporta Web Speech API'));
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Español
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = this.volume;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);
      
      speechSynthesis.speak(utterance);
    });
  }
  
  private async _processQueue(): Promise<void> {
    if (this.speaking || this.queue.length === 0) return;
    
    const text = this.queue.shift();
    if (text) {
      await this._speak(text);
    }
    
    // Procesar siguiente en cola con pequeña pausa
    if (this.queue.length > 0) {
      setTimeout(() => this._processQueue(), 300);
    }
  }
  
  stop(): void {
    // Detener Web Speech API
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    // Limpiar cola
    this.queue = [];
    this.speaking = false;
  }
  
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    console.log('🔊 TTS', this.enabled ? 'habilitado' : 'deshabilitado');
    return this.enabled;
  }
  
  clearQueue(): void {
    this.queue = [];
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  isSpeaking(): boolean {
    return this.speaking;
  }
  
  getProvider(): TTSProvider {
    return this.provider;
  }
  
  // Test de audio
  async test(): Promise<void> {
    const testMessages: Record<TTSProvider, string> = {
      'browser': '¡Hola! Soy el sistema de voz del navegador.',
      'elevenlabs': 'Probando ElevenLabs Text to Speech.',
      'coqui-remote': 'Probando Coqui TTS remoto.',
      'coqui-local': 'Probando Coqui TTS local.'
    };
    
    const message = testMessages[this.provider] || testMessages['browser'];
    await this.speak(message, true);
  }
}

// Export default también para compatibilidad
export default TTSService;
