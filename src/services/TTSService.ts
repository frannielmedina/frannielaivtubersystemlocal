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
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Generate simple phoneme-based lipsync data from audio
   */
  private generateLipsyncData(audioBuffer: AudioBuffer): LipsyncData {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    
    const windowSize = Math.floor(sampleRate * 0.05);
    const phonemes: LipsyncData['phonemes'] = [];
    
    for (let i = 0; i < channelData.length; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = window.reduce((sum, val) => sum + Math.abs(val), 0) / window.length;
      
      let phoneme = 'neutral';
      if (energy > 0.1) phoneme = 'aa';
      else if (energy > 0.05) phoneme = 'ee';
      else phoneme = 'neutral';
      
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

    const emotion = this.detectEmotion(text);
    const cleanText = this.cleanText(text);
    
    if (!cleanText || cleanText.trim() === '') {
      console.log('No text to speak after cleaning tags');
      return;
    }

    this.queue.push({ text: cleanText, emotion });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.speaking || this.queue.length === 0) return;

    const { text, emotion } = this.queue.shift()!;
    this.speaking = true;

    try {
      if (emotion && this.onEmotionCallback) {
        this.onEmotionCallback(emotion);
      }

      switch (this.config.provider) {
        case 'edge-tts':
          await this.speakEdgeTTS(text);
          break;
        case 'elevenlabs':
          await this.speakElevenLabs(text);
          break;
        case 'coqui-local':
        case 'coqui-colab':
          await this.speakCoqui(text);
          break;
        case 'fish-audio-colab':
          await this.speakFishAudio(text);
          break;
        default:
          await this.speakWebSpeech(text);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      try {
        await this.speakWebSpeech(text);
      } catch (fallbackError) {
        console.error('Fallback TTS also failed:', fallbackError);
      }
    } finally {
      this.speaking = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 300);
      }
    }
  }

  /**
   * Edge TTS - Using Web Speech API with enhanced voice selection
   * FIXED: No longer uses broken external API
   */
  private async speakEdgeTTS(text: string): Promise<void> {
    const voiceConfig = this.config.edgeTTSVoice || 'en-US-AnaNeural';
    const pitch = this.config.edgeTTSPitch || '+8Hz';
    const rate = this.config.edgeTTSRate || '+5%';

    console.log('🎤 Edge TTS (Web Speech):', { voiceConfig, pitch, rate });

    // Parse pitch and rate
    const pitchValue = this.parsePitchValue(pitch);
    const rateValue = this.parseRateValue(rate);

    // Use enhanced Web Speech API
    return this.speakWebSpeechEnhanced(text, voiceConfig, pitchValue, rateValue);
  }

  /**
   * Parse pitch value from Edge TTS format (+8Hz) to Web Speech format (0.5-2.0)
   */
  private parsePitchValue(pitchStr: string): number {
    const match = pitchStr.match(/([+-]?\d+)/);
    if (!match) return 1.0;
    
    const hz = parseInt(match[1]);
    // Convert Hz offset to pitch multiplier (0.5 = low, 1.0 = normal, 2.0 = high)
    // +8Hz = 1.2, +15Hz = 1.4, +20Hz = 1.5, etc.
    return 1.0 + (hz / 40);
  }

  /**
   * Parse rate value from Edge TTS format (+5%) to Web Speech format (0.1-10.0)
   */
  private parseRateValue(rateStr: string): number {
    const match = rateStr.match(/([+-]?\d+)/);
    if (!match) return 1.0;
    
    const percent = parseInt(match[1]);
    // Convert percentage to rate multiplier
    return 1.0 + (percent / 100);
  }

  /**
   * Enhanced Web Speech API with voice matching
   */
  private async speakWebSpeechEnhanced(
    text: string, 
    voiceConfig: string, 
    pitch: number, 
    rate: number
  ): Promise<void> {
    if (!this.isBrowser || !window.speechSynthesis) {
      throw new Error('Web Speech API not available');
    }

    return new Promise((resolve, reject) => {
      // Wait for voices to load
      const voices = window.speechSynthesis.getVoices();
      
      const speakWithVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        
        // Find best matching voice
        const selectedVoice = this.findBestVoice(availableVoices, voiceConfig);

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
          console.log('🎤 Using voice:', selectedVoice.name, selectedVoice.lang);
        } else {
          // Default to English
          utterance.lang = 'en-US';
          console.log('🎤 Using default voice');
        }

        utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
        utterance.rate = Math.max(0.5, Math.min(2.0, rate));
        utterance.volume = 1.0;

        console.log('🎤 TTS Settings:', {
          pitch: utterance.pitch,
          rate: utterance.rate,
          voice: selectedVoice?.name || 'default'
        });

        if (this.onLipsyncCallback) {
          const estimatedDuration = text.length * 0.05;
          const simpleLipsync: LipsyncData = {
            phonemes: [{ phoneme: 'aa', time: 0, duration: estimatedDuration }],
            duration: estimatedDuration
          };
          this.onLipsyncCallback(simpleLipsync);
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(event);

        window.speechSynthesis.speak(utterance);
      };

      // If voices aren't loaded yet, wait for them
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          speakWithVoices();
        };
      } else {
        speakWithVoices();
      }
    });
  }

  /**
   * Find best matching voice for Edge TTS voice name
   */
  private findBestVoice(voices: SpeechSynthesisVoice[], voiceConfig: string): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;

    // Edge TTS voice name mapping to Web Speech API
    const voiceMap: Record<string, string[]> = {
      // English (US) - Female
      'en-US-AnaNeural': ['Samantha', 'Victoria', 'Karen', 'Moira', 'Tessa', 'Fiona'],
      'en-US-JennyNeural': ['Samantha', 'Victoria', 'Karen'],
      'en-US-AriaNeural': ['Samantha', 'Victoria'],
      'en-US-MichelleNeural': ['Karen', 'Moira'],
      'en-US-SaraNeural': ['Tessa', 'Fiona'],
      
      // Japanese - Female
      'ja-JP-NanamiNeural': ['Kyoko', 'Otoya'],
      'ja-JP-AoiNeural': ['Kyoko'],
      'ja-JP-MayuNeural': ['Kyoko'],
      
      // Spanish - Female
      'es-ES-ElviraNeural': ['Monica', 'Paulina'],
      'es-MX-DaliaNeural': ['Paulina'],
      
      // French - Female
      'fr-FR-DeniseNeural': ['Amelie', 'Thomas'],
      
      // German - Female
      'de-DE-KatjaNeural': ['Anna', 'Helena'],
    };

    // Get language from voice config (e.g., 'en-US' from 'en-US-AnaNeural')
    const langMatch = voiceConfig.match(/^([a-z]{2}-[A-Z]{2})/);
    const targetLang = langMatch ? langMatch[1] : 'en-US';

    // Try to find exact voice name match first
    const preferredNames = voiceMap[voiceConfig] || [];
    
    for (const preferredName of preferredNames) {
      const voice = voices.find(v => 
        v.name.includes(preferredName) && 
        v.lang.startsWith(targetLang.split('-')[0])
      );
      if (voice) return voice;
    }

    // Fallback: find any voice with matching language and gender (female preferred)
    const femaleVoice = voices.find(v => 
      v.lang.startsWith(targetLang.split('-')[0]) && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') ||
       !v.name.toLowerCase().includes('male'))
    );
    if (femaleVoice) return femaleVoice;

    // Fallback: find any voice with matching language
    const langVoice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
    if (langVoice) return langVoice;

    // Last resort: return first available voice
    return voices[0];
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
    let url = this.config.colabUrl || 'http://localhost:5000';
    url = url.replace(/\/+$/, '');
    
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (url.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(`${url}/api/tts`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      mode: 'cors',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Coqui TTS error: ${response.status} - ${error}`);
    }

    const audioBlob = await response.blob();
    return this.playAudioBlobWithLipsync(audioBlob);
  }

  private async speakFishAudio(text: string): Promise<void> {
    let url = this.config.colabUrl || 'http://localhost:5000';
    url = url.replace(/\/+$/, '');
    
    const body: any = { 
      text,
      speed: this.config.speed || 1.0
    };

    if (this.config.multilingualDetection) {
      body.detect_language = true;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (url.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(`${url}/api/tts`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      mode: 'cors',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fish Audio TTS error: ${response.status} - ${error}`);
    }

    const audioBlob = await response.blob();
    
    const emotionHeader = response.headers.get('X-Emotion');
    if (emotionHeader && this.onEmotionCallback) {
      try {
        const emotion = JSON.parse(emotionHeader);
        this.onEmotionCallback(emotion);
      } catch (e) {
        console.warn('Could not parse emotion header:', e);
      }
    }
    
    return this.playAudioBlobWithLipsync(audioBlob);
  }

  private async playAudioBlobWithLipsync(blob: Blob): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = 1.0;
        
        this.currentAudio = audio;

        if (this.onLipsyncCallback) {
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const lipsyncData = this.generateLipsyncData(audioBuffer);
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
      utterance.lang = 'en-US';
      utterance.rate = this.config.speed || 1.0;
      utterance.pitch = this.config.pitch || 1.0;
      utterance.volume = 1.0;

      if (this.onLipsyncCallback) {
        const estimatedDuration = text.length * 0.05;
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

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }

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
