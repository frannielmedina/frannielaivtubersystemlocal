import type { STTConfig } from '@/types';

export class STTService {
  private config: STTConfig;
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;

  constructor(config: STTConfig) {
    this.config = config;
    this.initializeRecognition();
  }

  private initializeRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️  Speech Recognition not available in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onResultCallback) {
        if (finalTranscript) {
          this.onResultCallback(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          this.onResultCallback(interimTranscript.trim(), false);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else if (event.error === 'aborted') {
        console.log('Speech recognition aborted');
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Auto-restart if continuous mode and still enabled
      if (this.config.enabled && this.config.continuous && this.isListening) {
        setTimeout(() => {
          this.start();
        }, 100);
      } else {
        this.isListening = false;
      }
    };
  }

  start(onResult: (text: string, isFinal: boolean) => void): void {
    if (!this.recognition) {
      console.error('Speech Recognition not initialized');
      return;
    }

    if (!this.config.enabled) {
      console.warn('STT is disabled in config');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    this.onResultCallback = onResult;
    this.isListening = true;

    try {
      this.recognition.start();
      console.log('✅ Speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return;

    try {
      this.isListening = false;
      this.recognition.stop();
      console.log('🛑 Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  updateConfig(config: STTConfig): void {
    this.config = config;
    
    if (this.recognition) {
      this.recognition.continuous = config.continuous;
      this.recognition.interimResults = config.interimResults;
      this.recognition.lang = config.language;
    }
  }

  isAvailable(): boolean {
    return this.recognition !== null;
  }

  isActive(): boolean {
    return this.isListening;
  }
}
