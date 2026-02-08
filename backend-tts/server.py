# ============================================================
# 🎤 SERVIDOR XTTS v2 CORREGIDO - Para Google Colab + Ngrok
# ============================================================
# VERSIÓN 2.2 - ARREGLA ERROR 404 Y CORS
# Copia y pega este código en una celda de Colab
# ============================================================

from flask import Flask, request, send_file, jsonify, make_response
from pyngrok import ngrok
import io
import os
import tempfile
import re
import json

# TTS
try:
    from TTS.api import TTS
    COQUI_AVAILABLE = True
    print("✅ Coqui TTS available")
except ImportError:
    COQUI_AVAILABLE = False
    print("⚠️ Installing TTS...")
    !pip install -q TTS
    from TTS.api import TTS
    COQUI_AVAILABLE = True

# Language detection
try:
    from langdetect import detect
    LANGDETECT_AVAILABLE = True
    print("✅ Language detection available")
except ImportError:
    print("⚠️ Installing langdetect...")
    !pip install -q langdetect
    from langdetect import detect
    LANGDETECT_AVAILABLE = True

# Chinese support
try:
    from pypinyin import pinyin, Style
    PYPINYIN_AVAILABLE = True
    print("✅ Chinese support available")
except ImportError:
    print("⚠️ Installing pypinyin...")
    !pip install -q pypinyin
    from pypinyin import pinyin, Style
    PYPINYIN_AVAILABLE = True

# Audio processing
try:
    import librosa
    import soundfile as sf
    import numpy as np
    from scipy import signal
    AUDIO_PROCESSING_AVAILABLE = True
    print("✅ Audio processing available")
except ImportError:
    print("⚠️ Installing audio processing...")
    !pip install -q librosa soundfile scipy
    import librosa
    import soundfile as sf
    import numpy as np
    from scipy import signal
    AUDIO_PROCESSING_AVAILABLE = True

import torch

print("\n" + "="*70)
print("🎤 Servidor XTTS v2.2 - CORREGIDO")
print("="*70)

# ================================
# CONFIGURACIÓN
# ================================

app = Flask(__name__)

# CORS manual - compatible con ngrok free
@app.after_request
def after_request(response):
    """Add CORS headers to EVERY response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, ngrok-skip-browser-warning, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Expose-Headers'] = 'X-Emotion'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

# Language mapping
LANGUAGE_MAP = {
    'es': 'es', 'en': 'en', 'fr': 'fr', 'de': 'de', 'it': 'it',
    'pt': 'pt', 'pl': 'pl', 'tr': 'tr', 'ru': 'ru', 'nl': 'nl',
    'cs': 'cs', 'ar': 'ar', 'zh-cn': 'zh-cn', 'zh': 'zh-cn',
    'ja': 'ja', 'ko': 'ko', 'hu': 'hu', 'hi': 'hi'
}

# Animation tags
ANIMATION_TAGS = [
    r'\[WAVE\]', r'\[CELEBRATE\]', r'\[BOW\]', r'\[DANCE\]',
    r'\[THINK\]', r'\[THUMBSUP\]', r'\[HEART\]', r'\[SAD\]',
    r'\[ANGRY\]', r'\[SURPRISED\]'
]

# Device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🖥️ Device: {device}")

# Load model
print("🤖 Loading XTTS v2...")
tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print("✅ Model loaded!")

# ================================
# HELPER FUNCTIONS
# ================================

def clean_text_for_tts(text: str) -> str:
    """Remove animation tags"""
    cleaned = text
    for tag_pattern in ANIMATION_TAGS:
        cleaned = re.sub(tag_pattern, '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def detect_emotion(text: str) -> dict:
    """Detect emotion from tags"""
    emotion_map = {
        '[CELEBRATE]': {'emotion': 'happy', 'intensity': 1.0},
        '[WAVE]': {'emotion': 'happy', 'intensity': 0.7},
        '[HEART]': {'emotion': 'happy', 'intensity': 0.9},
        '[THUMBSUP]': {'emotion': 'happy', 'intensity': 0.8},
        '[DANCE]': {'emotion': 'happy', 'intensity': 1.0},
        '[SAD]': {'emotion': 'sad', 'intensity': 0.9},
        '[ANGRY]': {'emotion': 'angry', 'intensity': 0.9},
        '[SURPRISED]': {'emotion': 'surprised', 'intensity': 1.0},
        '[THINK]': {'emotion': 'neutral', 'intensity': 0.5},
        '[BOW]': {'emotion': 'neutral', 'intensity': 0.3},
    }
    
    for tag, emotion in emotion_map.items():
        if tag in text.upper():
            return emotion
    
    return {'emotion': 'neutral', 'intensity': 0.0}

def detect_language(text: str) -> str:
    """Detect language"""
    try:
        lang = detect(text)
        return LANGUAGE_MAP.get(lang, 'en')
    except:
        return 'en'

def preprocess_chinese(text: str) -> str:
    """Add pinyin for Chinese"""
    try:
        pinyin_list = pinyin(text, style=Style.TONE3)
        return ' '.join([p[0] for p in pinyin_list])
    except:
        return text

def optimize_audio(audio_path: str) -> str:
    """Remove throat strain"""
    try:
        # Load audio
        audio_data, sample_rate = librosa.load(audio_path, sr=24000)
        
        # Low-pass filter
        nyquist = sample_rate // 2
        cutoff = 8000
        b, a = signal.butter(4, cutoff / nyquist, btype='low')
        filtered_audio = signal.filtfilt(b, a, audio_data)
        
        # Mix
        audio_data = 0.7 * filtered_audio + 0.3 * audio_data
        
        # Normalize
        rms = np.sqrt(np.mean(audio_data ** 2))
        target_rms = 10 ** (-20 / 20)
        if rms > 0:
            audio_data = audio_data * (target_rms / rms)
        
        # Limit
        audio_data = np.clip(audio_data, -0.95, 0.95)
        
        # Save
        output_path = audio_path.replace('.wav', '_optimized.wav')
        sf.write(output_path, audio_data, sample_rate)
        
        return output_path
    except Exception as e:
        print(f"Audio optimization error: {e}")
        return audio_path

# ================================
# ROUTES
# ================================

@app.route('/health', methods=['GET', 'OPTIONS'])
@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check"""
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
    return jsonify({
        'status': 'ok',
        'model': 'xtts_v2',
        'device': device,
        'version': '2.2',
        'cors_enabled': True
    })

@app.route('/tts', methods=['POST', 'OPTIONS'])
@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def generate_speech():
    """Generate TTS - RUTAS CORREGIDAS"""
    # Handle OPTIONS
    if request.method == 'OPTIONS':
        print("✅ OPTIONS request handled")
        return make_response('', 204)
    
    print(f"📥 {request.method} request to {request.path}")
    
    try:
        # Get data
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data'}), 400

        original_text = data.get('text', '')
        voice_path = data.get('voice')
        speed = float(data.get('speed', 1.0))
        language = data.get('language')

        if not original_text:
            return jsonify({'error': 'Text required'}), 400

        # Process
        emotion = detect_emotion(original_text)
        text = clean_text_for_tts(original_text)
        
        if not text:
            return jsonify({'error': 'No text after cleaning'}), 400

        print(f"📝 Text: {text[:50]}...")

        # Detect language
        if not language:
            language = detect_language(text)
        
        print(f"🌍 Language: {language}")

        # Chinese preprocessing
        if language == 'zh-cn':
            text = preprocess_chinese(text)

        # Generate
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name

        if voice_path and os.path.exists(voice_path):
            print(f"🎤 With voice clone")
            tts_model.tts_to_file(
                text=text,
                speaker_wav=voice_path,
                language=language,
                file_path=tmp_path,
                speed=speed,
                split_sentences=True
            )
        else:
            print(f"🎤 Without voice clone")
            tts_model.tts_to_file(
                text=text,
                language=language,
                file_path=tmp_path,
                speed=speed,
                split_sentences=True
            )

        # Optimize
        final_path = optimize_audio(tmp_path)

        # Read and send
        with open(final_path, 'rb') as f:
            audio_data = f.read()
        
        # Cleanup
        try:
            os.unlink(tmp_path)
            if final_path != tmp_path:
                os.unlink(final_path)
        except:
            pass

        # Response
        response = make_response(audio_data)
        response.headers['Content-Type'] = 'audio/wav'
        response.headers['Content-Disposition'] = 'attachment; filename=speech.wav'
        response.headers['X-Emotion'] = json.dumps(emotion)
        
        print(f"✅ Sent: {len(audio_data)} bytes")
        
        return response

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ================================
# START SERVER
# ================================

print("\n" + "="*70)
print("🌐 Starting server...")
print("="*70)

# Start ngrok
public_url = ngrok.connect(5000)

print(f"\n✅ SERVER RUNNING!")
print(f"🌍 Public URL: {public_url}")
print(f"\n📋 COPY THIS URL TO YOUR APP:")
print(f"   {public_url}")
print(f"\n💡 Important:")
print(f"   - Use BOTH /tts and /api/tts routes work")
print(f"   - CORS is enabled")
print(f"   - OPTIONS requests handled")
print(f"\n⚠️ Keep this cell running!")
print("="*70 + "\n")

# Run Flask
app.run(port=5000)
