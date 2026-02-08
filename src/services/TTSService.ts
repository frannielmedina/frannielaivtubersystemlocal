// ========================================
// TTS SERVICE - Versión completa corregida
// ========================================
// src/services/TTSService.ts

export type TTSProvider = 'coqui' | 'elevenlabs' | 'openai' | 'webspeech';

export interface TTSConfig {
  ttsUrl?: string;
  speakerWavUrl?: string;
  provider?: TTSProvider;
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  openaiApiKey?: string;
  voice?: string; // Para webspeech
  rate?: number;  // Para webspeech
  pitch?: number; // Para webspeech
}

export interface QueueItem {
  text: string;
  language?: string;
  animation?: string;
}

export class TTSService {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private ttsUrl: string = '';
  private speakerWavUrl: string = '';
  private provider: TTSProvider = 'coqui';
  private elevenlabsApiKey: string = '';
  private elevenlabsVoiceId: string = '';
  private openaiApiKey: string = '';
  private voice: string = '';
  private rate: number = 1;
  private pitch: number = 1;
  private onAnimationStart?: (animation: string) => void;
  private onAnimationEnd?: () => void;

  constructor(config?: TTSConfig) {
    console.log('🎤 TTSService initialized');
    if (config) {
      this.updateConfig(config);
    }
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  
  updateConfig(config: TTSConfig): void {
    console.log('🔄 Actualizando config de TTSService:', config);
    
    if (config.ttsUrl) {
      this.ttsUrl = config.ttsUrl;
      console.log('✅ TTS URL actualizada:', this.ttsUrl);
    }
    
    if (config.provider) {
      this.provider = config.provider;
      console.log('✅ Provider actualizado:', this.provider);
    }
    
    // 👇 NUEVO: Configurar la URL del archivo de voz
    if (config.speakerWavUrl) {
      this.speakerWavUrl = config.speakerWavUrl;
      console.log('✅ Speaker WAV URL configurada:', this.speakerWavUrl);
    } else if (typeof window !== 'undefined') {
      // URL por defecto (archivo en la carpeta public)
      this.speakerWavUrl = `${window.location.origin}/miko.wav`;
      console.log('⚠️ Usando Speaker WAV por defecto:', this.speakerWavUrl);
    }

    if (config.elevenlabsApiKey) {
      this.elevenlabsApiKey = config.elevenlabsApiKey;
      console.log('✅ ElevenLabs API Key configurada');
    }

    if (config.elevenlabsVoiceId) {
      this.elevenlabsVoiceId = config.elevenlabsVoiceId;
      console.log('✅ ElevenLabs Voice ID configurado');
    }

    if (config.openaiApiKey) {
      this.openaiApiKey = config.openaiApiKey;
      console.log('✅ OpenAI API Key configurada');
    }

    if (config.voice) {
      this.voice = config.voice;
      console.log('✅ WebSpeech Voice configurada:', this.voice);
    }

    if (config.rate !== undefined) {
      this.rate = config.rate;
      console.log('✅ WebSpeech Rate configurado:', this.rate);
    }

    if (config.pitch !== undefined) {
      this.pitch = config.pitch;
      console.log('✅ WebSpeech Pitch configurado:', this.pitch);
    }
  }

  setAnimationCallbacks(
    onStart?: (animation: string) => void,
    onEnd?: () => void
  ): void {
    this.onAnimationStart = onStart;
    this.onAnimationEnd = onEnd;
  }

  // ============================================
  // MÉTODO PRINCIPAL - HABLAR
  // ============================================
  
  async speak(text: string, language: string = 'es'): Promise<void> {
    // Extraer animación del texto
    const animationMatch = text.match(/\[([A-Z_]+)\]/);
    const animation = animationMatch ? animationMatch[1].toLowerCase() : '';
    
    // Limpiar el texto de tags de animación
    const cleanText = text.replace(/\[([A-Z_]+)\]/g, '').trim();
    
    if (!cleanText) {
      console.warn('⚠️ Texto vacío después de limpiar animaciones');
      return;
    }

    this.queue.push({ text: cleanText, language, animation });
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  // ============================================
  // COLA DE PROCESAMIENTO
  // ============================================
  
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();
    
    if (!item) {
      await this.processQueue();
      return;
    }

    const { text, language, animation } = item;

    try {
      // Disparar animación si existe
      if (animation && this.onAnimationStart) {
        console.log('🎬 Playing animation:', animation);
        this.onAnimationStart(animation);
      }

      // Generar y reproducir el audio
      switch (this.provider) {
        case 'coqui':
          await this.speakCoqui(text, language || 'es');
          break;
        case 'elevenlabs':
          await this.speakElevenLabs(text, language || 'en');
          break;
        case 'openai':
          await this.speakOpenAI(text);
          break;
        case 'webspeech':
          await this.speakWebSpeech(text, language || 'en-US');
          break;
        default:
          console.warn('⚠️ Provider no soportado:', this.provider);
      }

      // Terminar animación
      if (this.onAnimationEnd) {
        this.onAnimationEnd();
      }

    } catch (error) {
      console.error('❌ TTS Error:', error);
      if (this.onAnimationEnd) {
        this.onAnimationEnd();
      }
    }

    // Continuar con el siguiente item
    await this.processQueue();
  }

  // ============================================
  // COQUI TTS (XTTS v2)
  // ============================================
  
  private async speakCoqui(text: string, language: string = 'es'): Promise<void> {
    try {
      console.log('🔧 Adding Ngrok bypass header');
      console.log('🔊 Calling Coqui TTS:', this.ttsUrl);
      
      // 👇 CUERPO CORREGIDO CON SPEAKER_WAV
      const requestBody = {
        text: text,
        language: language,
        speaker_wav: this.speakerWavUrl // 👈 ESTO ES LO IMPORTANTE
      };
      
      console.log('📤 Request body:', requestBody);
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      
      console.log('📤 Headers:', headers);

      const response = await fetch(this.ttsUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Coqui TTS error:', response.status, errorText);
        throw new Error(`Coqui TTS error: ${response.status} - ${errorText}`);
      }

      console.log('✅ TTS response OK, getting audio blob');
      const audioBlob = await response.blob();
      console.log('📦 Audio blob size:', audioBlob.size, 'bytes');
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎵 Audio URL created:', audioUrl);

      // Reproducir el audio
      await this.playAudio(audioUrl);

    } catch (error) {
      console.error('❌ Coqui fetch error:', error);
      throw error;
    }
  }

  // ============================================
  // ELEVENLABS TTS
  // ============================================
  
  private async speakElevenLabs(text: string, language: string = 'en'): Promise<void> {
    try {
      console.log('🔊 Calling ElevenLabs TTS');

      if (!this.elevenlabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenlabsVoiceId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenlabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      await this.playAudio(audioUrl);

    } catch (error) {
      console.error('❌ ElevenLabs error:', error);
      throw error;
    }
  }

  // ============================================
  // OPENAI TTS
  // ============================================
  
  private async speakOpenAI(text: string): Promise<void> {
    try {
      console.log('🔊 Calling OpenAI TTS');

      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'nova',
          input: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI TTS error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      await this.playAudio(audioUrl);

    } catch (error) {
      console.error('❌ OpenAI TTS error:', error);
      throw error;
    }
  }

  // ============================================
  // WEB SPEECH API
  // ============================================
  
  private async speakWebSpeech(text: string, language: string = 'en-US'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔊 Calling Web Speech API');

        if (!('speechSynthesis' in window)) {
          throw new Error('Web Speech API not supported in this browser');
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        // Si se especificó una voz, buscarla
        if (this.voice) {
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(v => v.name === this.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.onend = () => {
          console.log('✅ Web Speech finished');
          resolve();
        };

        utterance.onerror = (error) => {
          console.error('❌ Web Speech error:', error);
          reject(error);
        };

        window.speechSynthesis.speak(utterance);

      } catch (error) {
        console.error('❌ Web Speech error:', error);
        reject(error);
      }
    });
  }

  // ============================================
  // REPRODUCIR AUDIO
  // ============================================
  
  private async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        console.log('✅ Audio playback finished');
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (error) => {
        console.error('❌ Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(error);
      };

      audio.play().catch((error) => {
        console.error('❌ Error playing audio:', error);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(error);
      });
    });
  }

  // ============================================
  // CONTROL
  // ============================================
  
  stop(): void {
    // Detener audio HTML
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Detener Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    this.queue = [];
    this.isProcessing = false;
    console.log('🛑 TTS stopped');
  }

  clearQueue(): void {
    this.queue = [];
    console.log('🗑️ Queue cleared');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }
}

// Singleton instance
let ttsServiceInstance: TTSService | null = null;

export const getTTSService = (): TTSService => {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
};

export default TTSService;
