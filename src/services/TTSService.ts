import type { TTSConfig } from '@/types';

export class TTSService {
  private config: TTSConfig;
  private queue: string[] = [];
  private speaking: boolean = false;
  private isBrowser: boolean;

  constructor(config: TTSConfig) {
    this.config = config;
    this.isBrowser = typeof window !== 'undefined';
  }

  async speak(text: string): Promise<void> {
    if (!this.isBrowser || !this.config.enabled || !text || text.trim() === '') return;

    const cleanText = this.cleanText(text);
    this.queue.push(cleanText);
    this.processQueue();
  }

  private cleanText(text: string): string {
    // Remove animation tags [ANIMATION]
    return text.replace(/\[.*?\]/g, '').trim();
  }

  private async processQueue(): Promise<void> {
    if (this.speaking || this.queue.length === 0) return;

    const text = this.queue.shift();
    if (!text) return;

    this.speaking = true;

    try {
      switch (this.config.provider) {
        case 'elevenlabs':
          await this.speakElevenLabs(text);
          break;
        case 'coqui-local':
        case 'coqui-colab':
          await this.speakCoqui(text);
          break;
        default:
          await this.speakWebSpeech(text);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to Web Speech
      try {
        await this.speakWebSpeech(text);
      } catch (fallbackError) {
        console.error('Fallback TTS also failed:', fallbackError);
      }
    } finally {
      this.speaking = false;
      // Process next in queue
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 300);
      }
    }
  }

  private async speakElevenLabs(text: string): Promise<void> {
    const apiKey = this.config.elevenLabsApiKey;
    const voiceId = this.config.elevenLabsVoiceId;

    if (!apiKey || !voiceId) {
      throw new Error('ElevenLabs API key and Voice ID required');
    }

    const model = this.config.elevenLabsModel || 'eleven_monolingual_v1';

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
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const audioBlob = await response.blob();
    return this.playAudioBlob(audioBlob);
  }

  private async speakCoqui(text: string): Promise<void> {
    const url = this.config.colabUrl || 'http://localhost:5000';
    const useClone = this.config.useClone;
    const voicePath = this.config.cloneVoicePath;

    const body: any = { 
      text,
      speed: this.config.speed || 1.0
    };

    if (useClone && voicePath) {
      body.voice = voicePath;
    }

    if (this.config.multilingualDetection) {
      body.detect_language = true;
    }

    const response = await fetch(`${url}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Coqui TTS error: ${response.status} - ${error}`);
    }

    const audioBlob = await response.blob();
    return this.playAudioBlob(audioBlob);
  }

  private playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;

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

  private async speakWebSpeech(text: string): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Browser does not support Web Speech API'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = this.config.speed || 1.0;
      utterance.pitch = this.config.pitch || 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (!this.isBrowser) return;

    // Stop Web Speech API
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    // Clear queue
    this.queue = [];
    this.speaking = false;
  }

  updateConfig(config: TTSConfig): void {
    this.config = config;
  }

  clearQueue(): void {
    this.queue = [];
  }
}
