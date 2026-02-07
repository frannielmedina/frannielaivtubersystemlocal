import type { TTSConfig } from '@/types';

export class TTSService {
  private config: TTSConfig;
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private backendUrl: string;

  constructor(config: TTSConfig, backendUrl: string = 'http://localhost:5000') {
    this.config = config;
    this.backendUrl = backendUrl;
    
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.config.enabled) return;

    // Stop any currently playing audio
    this.stop();

    if (this.config.useClone && this.config.cloneVoicePath) {
      // Use Coqui TTS with voice cloning (requires backend)
      await this.speakWithCoqui(text);
    } else {
      // Fallback to Web Speech API
      await this.speakWithWebAPI(text);
    }
  }

  private async speakWithCoqui(text: string): Promise<void> {
    try {
      // Detect language if multilingual detection is enabled
      let language = 'en';
      
      if (this.config.multilingualDetection) {
        try {
          const langResponse = await fetch(`${this.backendUrl}/api/detect-language`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
          });
          
          if (langResponse.ok) {
            const langData = await langResponse.json();
            language = langData.language || 'en';
            console.log(`🌍 Detected language: ${language}`);
          }
        } catch (err) {
          console.warn('Language detection failed, using default');
        }
      }

      const response = await fetch(`${this.backendUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: this.config.cloneVoicePath,
          speed: this.config.speed,
          language: language,
        }),
      });

      if (!response.ok) {
        console.error('TTS backend error, using fallback');
        await this.speakWithWebAPI(text);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.playbackRate = this.config.speed;
      
      await this.currentAudio.play();
      
      return new Promise((resolve) => {
        if (this.currentAudio) {
          this.currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
        }
      });
    } catch (error) {
      console.error('Error with Coqui TTS:', error);
      await this.speakWithWebAPI(text);
    }
  }

  private async speakWithWebAPI(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.error('Web Speech API no está disponible');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get Spanish voices
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('es'));
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.lang = 'es-ES';
      utterance.rate = this.config.speed;
      utterance.pitch = this.config.pitch;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => {
        console.error('Error en Web Speech API:', error);
        resolve(); // Resolve anyway to not block the flow
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    // Stop Coqui audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Stop Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  updateConfig(config: TTSConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.useClone) return true;

    try {
      const response = await fetch(`${this.backendUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
