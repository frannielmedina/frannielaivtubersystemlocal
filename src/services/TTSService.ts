import type { TTSConfig } from '@/types';

export class TTSService {
  private config: TTSConfig;
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private localBackendUrl: string;
  private onLipSyncCallback: ((volume: number) => void) | null = null;

  constructor(config: TTSConfig, backendUrl: string = 'http://localhost:5000') {
    this.config = config;
    this.localBackendUrl = backendUrl;
    
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setLipSyncCallback(callback: (volume: number) => void) {
    this.onLipSyncCallback = callback;
  }

  async speak(text: string): Promise<void> {
    if (!this.config.enabled) return;

    this.stop();

    switch (this.config.provider) {
      case 'elevenlabs':
        await this.speakWithElevenLabs(text);
        break;
      case 'coqui-colab':
        await this.speakWithCoquiColab(text);
        break;
      case 'coqui-local':
        await this.speakWithCoquiLocal(text);
        break;
      case 'webspeech':
      default:
        await this.speakWithWebAPI(text);
        break;
    }
  }

  private async speakWithElevenLabs(text: string): Promise<void> {
    if (!this.config.elevenLabsApiKey) {
      console.error('ElevenLabs API key not configured');
      await this.speakWithWebAPI(text);
      return;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: this.config.elevenLabsModel || 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      await this.playAudioWithLipSync(audioUrl);
    } catch (error) {
      console.error('Error with ElevenLabs TTS:', error);
      await this.speakWithWebAPI(text);
    }
  }

  private async speakWithCoquiColab(text: string): Promise<void> {
    if (!this.config.colabUrl) {
      console.error('Colab URL not configured');
      await this.speakWithWebAPI(text);
      return;
    }

    try {
      let language = 'en';
      
      if (this.config.multilingualDetection) {
        try {
          const langResponse = await fetch(`${this.config.colabUrl}/api/detect-language`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          
          if (langResponse.ok) {
            const langData = await langResponse.json();
            language = langData.language || 'en';
          }
        } catch (err) {
          console.warn('Language detection failed, using default');
        }
      }

      const response = await fetch(`${this.config.colabUrl}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: this.config.cloneVoicePath,
          speed: this.config.speed,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Colab TTS error');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      await this.playAudioWithLipSync(audioUrl);
    } catch (error) {
      console.error('Error with Colab TTS:', error);
      await this.speakWithWebAPI(text);
    }
  }

  private async speakWithCoquiLocal(text: string): Promise<void> {
    try {
      let language = 'en';
      
      if (this.config.multilingualDetection) {
        try {
          const langResponse = await fetch(`${this.localBackendUrl}/api/detect-language`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          
          if (langResponse.ok) {
            const langData = await langResponse.json();
            language = langData.language || 'en';
          }
        } catch (err) {
          console.warn('Language detection failed');
        }
      }

      const response = await fetch(`${this.localBackendUrl}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: this.config.cloneVoicePath,
          speed: this.config.speed,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Local TTS backend error');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      await this.playAudioWithLipSync(audioUrl);
    } catch (error) {
      console.error('Error with local Coqui TTS:', error);
      await this.speakWithWebAPI(text);
    }
  }

  private async speakWithWebAPI(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.error('Web Speech API not available');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
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
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  private async playAudioWithLipSync(audioUrl: string): Promise<void> {
    return new Promise((resolve) => {
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.playbackRate = this.config.speed;

      if (this.audioContext && this.onLipSyncCallback) {
        const source = this.audioContext.createMediaElementSource(this.currentAudio);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        source.connect(analyser);
        analyser.connect(this.audioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateLipSync = () => {
          if (!this.currentAudio || this.currentAudio.paused) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const volume = average / 255;
          
          if (this.onLipSyncCallback) {
            this.onLipSyncCallback(volume);
          }
          
          requestAnimationFrame(updateLipSync);
        };
        
        updateLipSync();
      }

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.onLipSyncCallback) {
          this.onLipSyncCallback(0);
        }
        resolve();
      };

      this.currentAudio.onerror = () => {
        if (this.onLipSyncCallback) {
          this.onLipSyncCallback(0);
        }
        resolve();
      };

      this.currentAudio.play().catch(() => resolve());
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.onLipSyncCallback) {
      this.onLipSyncCallback(0);
    }
  }

  updateConfig(config: TTSConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    if (this.config.provider === 'webspeech') return true;
    
    if (this.config.provider === 'elevenlabs') {
      return !!this.config.elevenLabsApiKey;
    }

    const url = this.config.provider === 'coqui-colab' 
      ? this.config.colabUrl 
      : this.localBackendUrl;

    if (!url) return false;

    try {
      const response = await fetch(`${url}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
