import type { TTSConfig } from '@/types';

// Emotion detection for facial expressions
export interface EmotionData {
  emotion: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';
  intensity: number;
}

export interface LipsyncData {
  phonemes: Array<{
    phoneme: string;
    time: number;
    duration: number;
  }>;
  duration: number;
}

export class TTSService {
  private config: TTSConfig;
  private queue: Array<{ text: string; emotion?: EmotionData }> = [];
  private speaking: boolean = false;
  private isBrowser: boolean;
  private currentAudio: HTMLAudioElement | null = null;
  private onLipsyncCallback: ((data: LipsyncData) => void) | null = null;
  private onEmotionCallback: ((emotion: EmotionData) => void) | null = null;

  constructor(config: TTSConfig) {
    this.config = config;
    this.isBrowser = typeof window !== 'undefined';
  }

  /**
   * Set callback for lipsync events
   */
  setLipsyncCallback(callback: (data: LipsyncData) => void) {
    this.onLipsyncCallback = callback;
  }

  /**
   * Set callback for emotion changes
   */
  setEmotionCallback(callback: (emotion: EmotionData) => void) {
    this.onEmotionCallback = callback;
  }

  /**
   * Detect emotion from animation tags
   */
  private detectEmotion(text: string): EmotionData | undefined {
    const emotionMap: Record<string, EmotionData> = {
      '[CELEBRATE]': { emotion: 'happy', intensity: 1.0 },
      '[WAVE]': { emotion: 'happy', intensity: 0.7 },
      '[HEART]': { emotion: 'happy', intensity: 0.9 },
      '[THUMBSUP]': { emotion: 'happy', intensity: 0.8 },
      '[DANCE]': { emotion: 'happy', intensity: 1.0 },
      '[SAD]': { emotion: 'sad', intensity: 0.9 },
      '[ANGRY]': { emotion: 'angry', intensity: 0.9 },
      '[SURPRISED]': { emotion: 'surprised', intensity: 1.0 },
      '[THINK]': { emotion: 'neutral', intensity: 0.5 },
      '[BOW]': { emotion: 'neutral', intensity: 0.3 },
    };

    for (const [tag, emotion] of Object.entries(emotionMap)) {
      if (text.includes(tag)) {
        return emotion;
      }
    }

    return undefined;
  }

  /**
   * Clean text - remove animation tags and formatting
   */
  private cleanText(text: string): string {
    // Remove all animation tags
    let cleaned = text.replace(/\[WAVE\]/gi, '');
    cleaned = cleaned.replace(/\[CELEBRATE\]/gi, '');
    cleaned = cleaned.replace(/\[BOW\]/gi, '');
    cleaned = cleaned.replace(/\[DANCE\]/gi, '');
    cleaned = cleaned.replace(/\[THINK\]/gi, '');
    cleaned = cleaned.replace(/\[THUMBSUP\]/gi, '');
    cleaned = cleaned.replace(/\[HEART\]/gi, '');
    cleaned = cleaned.replace(/\[SAD\]/gi, '');
    cleaned = cleaned.replace(/\[ANGRY\]/gi, '');
    cleaned = cleaned.replace(/\[SURPRISED\]/gi, '');
    
    // Remove any remaining brackets
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Generate simple phoneme-based lipsync data from audio
   * This is a simplified version - for production you'd use a proper phoneme analyzer
   */
  private generateLipsyncData(audioBuffer: AudioBuffer): LipsyncData {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    
    // Simple energy-based phoneme detection
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const phonemes: LipsyncData['phonemes'] = [];
    
    for (let i = 0; i < channelData.length; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = window.reduce((sum, val) => sum + Math.abs(val), 0) / window.length;
      
      // Map energy to phoneme (simplified)
      let phoneme = 'neutral';
      if (energy > 0.1) phoneme = 'aa'; // Open mouth
      else if (energy > 0.05) phoneme = 'ee'; // Slight open
      else phoneme = 'neutral'; // Closed
      
      phonemes.push({
        phoneme,
        time: i / sampleRate,
        duration: windowSize / sampleRate
      });
    }
    
    return { phonemes, duration };
  }

  /**
   * Main speak function with emotion detection and lipsync
   */
  async speak(text: string): Promise<void> {
    if (!this.isBrowser || !this.config.enabled || !text || text.trim() === '') return;

    // Detect emotion before cleaning
    const emotion = this.detectEmotion(text);
    
    // Clean text for TTS
    const cleanText = this.cleanText(text);
    
    if (!cleanText || cleanText.trim() === '') {
      console.log('No text to speak after cleaning tags');
      return;
    }

    // Add to queue
    this.queue.push({ text: cleanText, emotion });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.speaking || this.queue.length === 0) return;

    const { text, emotion } = this.queue.shift()!;
    this.speaking = true;

    try {
      // Trigger emotion callback if available
      if (emotion && this.onEmotionCallback) {
        this.onEmotionCallback(emotion);
      }

      // Generate speech based on provider
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
    return this.playAudioBlobWithLipsync(audioBlob);
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
    return this.playAudioBlobWithLipsync(audioBlob);
  }

  private async playAudioBlobWithLipsync(blob: Blob): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Create audio element
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = 1.0;
        
        this.currentAudio = audio;

        // Generate lipsync data if callback is set
        if (this.onLipsyncCallback) {
          // Decode audio to get buffer for lipsync analysis
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const lipsyncData = this.generateLipsyncData(audioBuffer);
          
          // Start lipsync animation
          this.onLipsyncCallback(lipsyncData);
        }

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          reject(error);
        };

        await audio.play();
      } catch (error) {
        reject(error);
      }
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

      // Simple lipsync for Web Speech (no detailed phoneme data available)
      if (this.onLipsyncCallback) {
        const estimatedDuration = text.length * 0.05; // Rough estimate
        const simpleLipsync: LipsyncData = {
          phonemes: [
            { phoneme: 'aa', time: 0, duration: estimatedDuration }
          ],
          duration: estimatedDuration
        };
        this.onLipsyncCallback(simpleLipsync);
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (!this.isBrowser) return;

    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

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

  isSpeaking(): boolean {
    return this.speaking;
  }
}
