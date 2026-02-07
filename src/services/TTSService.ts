/**
 * TTSService - Servicio unificado de Text-to-Speech
 * Soporta: ElevenLabs, Coqui TTS (remoto/local), Browser Web Speech API
 */

class TTSService {
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
  
  loadConfig() {
    try {
      const saved = localStorage.getItem('tts-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.provider = parsed.provider || 'browser';
        this.config = { ...this.config, ...parsed.config };
        console.log('🔊 TTS config loaded:', this.provider);
      }
    } catch (error) {
      console.error('Error loading TTS config:', error);
    }
  }
  
  saveConfig() {
    try {
      const toSave = {
        provider: this.provider,
        config: this.config
      };
      localStorage.setItem('tts-config', JSON.stringify(toSave));
      console.log('💾 TTS config saved');
    } catch (error) {
      console.error('Error saving TTS config:', error);
    }
  }
  
  updateConfig(newConfig) {
    this.provider = newConfig.provider || this.provider;
    this.config = { ...this.config, ...newConfig.config };
    this.saveConfig();
    console.log('🔄 TTS config updated:', this.provider);
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  async speak(text, priority = false) {
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
  
  _cleanText(text) {
    // Remover tags de animación [ANIMATION]
    let clean = text.replace(/\[.*?\]/g, '');
    // Remover emojis si es necesario (opcional)
    // clean = clean.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    return clean.trim();
  }
  
  async _speak(text) {
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
  
  async _speakElevenLabs(text) {
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
  
  async _speakCoquiRemote(text) {
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
  
  async _speakCoquiLocal(text) {
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
  
  _playAudioBlob(blob) {
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
  
  async _speakBrowser(text) {
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
      
      utterance.onend = resolve;
      utterance.onerror = reject;
      
      speechSynthesis.speak(utterance);
    });
  }
  
  async _processQueue() {
    if (this.speaking || this.queue.length === 0) return;
    
    const text = this.queue.shift();
    await this._speak(text);
    
    // Procesar siguiente en cola con pequeña pausa
    if (this.queue.length > 0) {
      setTimeout(() => this._processQueue(), 300);
    }
  }
  
  stop() {
    // Detener Web Speech API
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    // Limpiar cola
    this.queue = [];
    this.speaking = false;
  }
  
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    console.log('🔊 TTS', this.enabled ? 'habilitado' : 'deshabilitado');
    return this.enabled;
  }
  
  clearQueue() {
    this.queue = [];
  }
  
  getQueueLength() {
    return this.queue.length;
  }
  
  isEnabled() {
    return this.enabled;
  }
  
  isSpeaking() {
    return this.speaking;
  }
  
  getProvider() {
    return this.provider;
  }
  
  // Test de audio
  async test() {
    const testMessages = {
      'browser': '¡Hola! Soy el sistema de voz del navegador.',
      'elevenlabs': 'Probando ElevenLabs Text to Speech.',
      'coqui-remote': 'Probando Coqui TTS remoto.',
      'coqui-local': 'Probando Coqui TTS local.'
    };
    
    const message = testMessages[this.provider] || testMessages['browser'];
    await this.speak(message, true);
  }
}

// Exportar instancia global
if (typeof window !== 'undefined') {
  window.TTSService = TTSService;
  window.ttsService = new TTSService();
}

export default TTSService;
