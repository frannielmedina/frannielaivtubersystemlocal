// ========================================
// TTS SERVICE CORREGIDO CON SPEAKER_WAV
// ========================================

class TTSService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentAudio = null;
    this.ttsUrl = '';
    this.speakerWavUrl = ''; // 👈 NUEVO
  }

  // Actualizar configuración
  updateConfig(config) {
    console.log('🔄 Actualizando config de TTSService:', config);
    
    if (config.ttsUrl) {
      this.ttsUrl = config.ttsUrl;
      console.log('✅ TTS URL actualizada:', this.ttsUrl);
    }
    
    // 👇 NUEVO: Configurar la URL del archivo de voz
    if (config.speakerWavUrl) {
      this.speakerWavUrl = config.speakerWavUrl;
      console.log('✅ Speaker WAV URL configurada:', this.speakerWavUrl);
    } else {
      // URL por defecto (archivo en la carpeta public)
      this.speakerWavUrl = `${window.location.origin}/miko.wav`;
      console.log('⚠️ Usando Speaker WAV por defecto:', this.speakerWavUrl);
    }
  }

  // Método para hablar con Coqui TTS
  async speakCoqui(text, language = 'es') {
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

        audio.play().catch(error => {
          console.error('❌ Error playing audio:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Fetch error:', error);
      throw error;
    }
  }

  // Cola de procesamiento
  async speak(text, language = 'es') {
    this.queue.push({ text, language });
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { text, language } = this.queue.shift();

    try {
      await this.speakCoqui(text, language);
    } catch (error) {
      console.error('TTS Error:', error);
    }

    await this.processQueue();
  }

  // Detener el audio actual
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.queue = [];
    this.isProcessing = false;
  }
}

export default TTSService;
