"""
Backend TTS Server - FIXED for Ngrok + Next.js
Compatible con Google Colab y ngrok free tier
Versión 2.2 - Febrero 2026
"""

from flask import Flask, request, send_file, jsonify, make_response
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
    print("⚠️  TTS not available. Install with: pip install TTS")

# Language detection
try:
    from langdetect import detect
    LANGDETECT_AVAILABLE = True
    print("✅ Language detection available")
except ImportError:
    LANGDETECT_AVAILABLE = False
    print("⚠️  langdetect not available. Install with: pip install langdetect")

# Chinese support
try:
    from pypinyin import pinyin, Style
    PYPINYIN_AVAILABLE = True
    print("✅ Chinese support (pypinyin) available")
except ImportError:
    PYPINYIN_AVAILABLE = False
    print("⚠️  pypinyin not available. Install with: pip install pypinyin")

# Audio processing
try:
    import librosa
    import soundfile as sf
    import numpy as np
    from scipy import signal
    AUDIO_PROCESSING_AVAILABLE = True
    print("✅ Audio processing available")
except ImportError:
    AUDIO_PROCESSING_AVAILABLE = False
    print("⚠️  Audio processing not available. Install: pip install librosa soundfile scipy")

app = Flask(__name__)

# ================================
# CORS CONFIGURATION - CRITICAL
# ================================
# Manual CORS handling for ngrok free tier compatibility
@app.after_request
def after_request(response):
    """Add CORS headers to EVERY response including errors"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, ngrok-skip-browser-warning, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Expose-Headers'] = 'X-Emotion'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

# ================================
# LANGUAGE MAPPING
# ================================
LANGUAGE_MAP = {
    'es': 'es', 'en': 'en', 'fr': 'fr', 'de': 'de', 'it': 'it',
    'pt': 'pt', 'pl': 'pl', 'tr': 'tr', 'ru': 'ru', 'nl': 'nl',
    'cs': 'cs', 'ar': 'ar', 'zh-cn': 'zh-cn', 'zh': 'zh-cn',
    'ja': 'ja', 'ko': 'ko', 'hu': 'hu', 'hi': 'hi'
}

# Animation tags to remove
ANIMATION_TAGS = [
    r'\[WAVE\]', r'\[CELEBRATE\]', r'\[BOW\]', r'\[DANCE\]',
    r'\[THINK\]', r'\[THUMBSUP\]', r'\[HEART\]', r'\[SAD\]',
    r'\[ANGRY\]', r'\[SURPRISED\]'
]

# ================================
# TTS MODEL - LAZY LOADING
# ================================
tts_model = None
device = None

def get_tts_model():
    """Lazy load TTS model"""
    global tts_model, device
    
    if tts_model is None and COQUI_AVAILABLE:
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"🤖 Loading XTTS v2 model on {device}...")
            tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            print("✅ Model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return None
    
    return tts_model

# ================================
# HELPER FUNCTIONS
# ================================

def clean_text_for_tts(text: str) -> str:
    """Remove animation tags and extra formatting for TTS"""
    cleaned = text
    for tag_pattern in ANIMATION_TAGS:
        cleaned = re.sub(tag_pattern, '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def detect_emotion(text: str) -> dict:
    """Detect emotion from animation tags before cleaning"""
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
    """Detect language from text"""
    if not LANGDETECT_AVAILABLE:
        return 'en'
    
    try:
        lang = detect(text)
        return LANGUAGE_MAP.get(lang, 'en')
    except Exception as e:
        print(f"Language detection error: {e}")
        return 'en'

def preprocess_chinese(text: str) -> str:
    """Add pinyin for better Chinese pronunciation"""
    if not PYPINYIN_AVAILABLE:
        return text
    try:
        pinyin_list = pinyin(text, style=Style.TONE3)
        pinyin_text = ' '.join([p[0] for p in pinyin_list])
        return pinyin_text
    except Exception as e:
        print(f"Pinyin conversion error: {e}")
        return text

def optimize_audio(audio_path: str) -> str:
    """Optimize audio quality - remove throat strain"""
    if not AUDIO_PROCESSING_AVAILABLE:
        return audio_path
    
    try:
        # Load audio
        audio_data, sample_rate = librosa.load(audio_path, sr=24000)
        
        # 1. Apply gentle low-pass filter to reduce harshness
        nyquist = sample_rate // 2
        cutoff = 8000  # 8kHz cutoff
        b, a = signal.butter(4, cutoff / nyquist, btype='low')
        filtered_audio = signal.filtfilt(b, a, audio_data)
        
        # 2. Mix with original (70% filtered, 30% original)
        audio_data = 0.7 * filtered_audio + 0.3 * audio_data
        
        # 3. Normalize volume to -20dB RMS
        rms = np.sqrt(np.mean(audio_data ** 2))
        target_rms = 10 ** (-20 / 20)  # -20dB
        if rms > 0:
            audio_data = audio_data * (target_rms / rms)
        
        # 4. Apply soft limiter
        audio_data = np.clip(audio_data, -0.95, 0.95)
        
        # Save optimized audio
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
    """Check server status"""
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
    return jsonify({
        'status': 'ok',
        'tts_available': COQUI_AVAILABLE,
        'langdetect_available': LANGDETECT_AVAILABLE,
        'pypinyin_available': PYPINYIN_AVAILABLE,
        'audio_processing_available': AUDIO_PROCESSING_AVAILABLE,
        'model': 'xtts_v2' if COQUI_AVAILABLE else None,
        'device': device if device else 'not_initialized',
        'cors_enabled': True,
        'ngrok_compatible': True,
        'version': '2.2'
    })

@app.route('/tts', methods=['POST', 'OPTIONS'])
@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def generate_speech():
    """
    Generate TTS audio
    Compatible with both /tts and /api/tts routes
    """
    # Handle OPTIONS preflight
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
    if not COQUI_AVAILABLE:
        return jsonify({'error': 'TTS not available. Install Coqui TTS: pip install TTS'}), 503

    try:
        # Get TTS model
        model = get_tts_model()
        if model is None:
            return jsonify({'error': 'Failed to load TTS model'}), 500

        # Get request data
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        original_text = data.get('text', '')
        voice_path = data.get('voice')
        speed = float(data.get('speed', 1.0))
        language = data.get('language')

        if not original_text:
            return jsonify({'error': 'Text required'}), 400

        # Detect emotion BEFORE cleaning
        emotion = detect_emotion(original_text)
        print(f"😊 Detected emotion: {emotion}")

        # Clean text for TTS
        text = clean_text_for_tts(original_text)
        
        if not text:
            return jsonify({'error': 'No text to speak after cleaning tags'}), 400

        print(f"📝 Original: {original_text}")
        print(f"🧹 Cleaned: {text}")

        # Auto-detect language if not provided
        if not language:
            language = detect_language(text)
            print(f"🌍 Detected language: {language}")

        # Preprocess Chinese
        if language == 'zh-cn' and PYPINYIN_AVAILABLE:
            text = preprocess_chinese(text)
            print(f"🈳 Pinyin: {text}")

        # Generate speech
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name

        # Generate with or without voice cloning
        if voice_path and os.path.exists(voice_path):
            print(f"🎤 Generating with voice clone: {voice_path}")
            model.tts_to_file(
                text=text,
                speaker_wav=voice_path,
                language=language,
                file_path=tmp_path,
                speed=speed,
                split_sentences=True  # Better prosody
            )
        else:
            print(f"🎤 Generating without voice clone")
            model.tts_to_file(
                text=text,
                language=language,
                file_path=tmp_path,
                speed=speed,
                split_sentences=True
            )

        print(f"✅ Generated: {tmp_path}")

        # Optimize audio (remove throat strain)
        if AUDIO_PROCESSING_AVAILABLE:
            print("🎛️ Optimizing audio...")
            optimized_path = optimize_audio(tmp_path)
            final_path = optimized_path
        else:
            final_path = tmp_path

        # Read file and create response
        with open(final_path, 'rb') as f:
            audio_data = f.read()
        
        # Clean up temp files
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            if final_path != tmp_path and os.path.exists(final_path):
                os.unlink(final_path)
        except:
            pass

        # Create response with proper headers
        response = make_response(audio_data)
        response.headers['Content-Type'] = 'audio/wav'
        response.headers['Content-Disposition'] = 'attachment; filename=speech.wav'
        response.headers['X-Emotion'] = json.dumps(emotion)
        
        print(f"✅ Response sent: {len(audio_data)} bytes")
        
        return response

    except Exception as e:
        print(f"❌ Error generating TTS: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/detect-language', methods=['POST', 'OPTIONS'])
@app.route('/api/detect-language', methods=['POST', 'OPTIONS'])
def detect_lang():
    """Detect language from text"""
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
    if not LANGDETECT_AVAILABLE:
        return jsonify({'error': 'Language detection not available'}), 503
    
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text required'}), 400
        
        cleaned_text = clean_text_for_tts(text)
        lang = detect_language(cleaned_text)
        
        return jsonify({'language': lang})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/voices', methods=['GET', 'OPTIONS'])
@app.route('/api/voices', methods=['GET', 'OPTIONS'])
def list_voices():
    """List available voices and languages"""
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
    if not COQUI_AVAILABLE:
        return jsonify({'error': 'TTS not available'}), 503

    return jsonify({
        'voices': ['default', 'clone'],
        'languages': [
            {'code': 'en', 'name': 'English'},
            {'code': 'es', 'name': 'Spanish'},
            {'code': 'fr', 'name': 'French'},
            {'code': 'de', 'name': 'German'},
            {'code': 'it', 'name': 'Italian'},
            {'code': 'pt', 'name': 'Portuguese'},
            {'code': 'pl', 'name': 'Polish'},
            {'code': 'tr', 'name': 'Turkish'},
            {'code': 'ru', 'name': 'Russian'},
            {'code': 'nl', 'name': 'Dutch'},
            {'code': 'cs', 'name': 'Czech'},
            {'code': 'ar', 'name': 'Arabic'},
            {'code': 'zh-cn', 'name': 'Chinese'},
            {'code': 'ja', 'name': 'Japanese'},
            {'code': 'ko', 'name': 'Korean'},
            {'code': 'hu', 'name': 'Hungarian'},
            {'code': 'hi', 'name': 'Hindi'}
        ]
    })

# ================================
# MAIN
# ================================

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🎤 TTS Server v2.2 - Ngrok Compatible")
    print("="*70)
    print(f"✅ TTS: {'Available' if COQUI_AVAILABLE else 'Not Available'}")
    print(f"✅ LangDetect: {'Available' if LANGDETECT_AVAILABLE else 'Not Available'}")
    print(f"✅ Pypinyin: {'Available' if PYPINYIN_AVAILABLE else 'Not Available'}")
    print(f"✅ Audio Processing: {'Available' if AUDIO_PROCESSING_AVAILABLE else 'Not Available'}")
    print("\n🔧 Configuration:")
    print("  - CORS: Enabled for all origins")
    print("  - OPTIONS: Handled with 204 No Content")
    print("  - Ngrok: Free tier compatible")
    print("  - Routes: /tts and /api/tts (both work)")
    print("\n💡 Important:")
    print("  - Copy the ngrok URL EXACTLY as shown")
    print("  - Don't add trailing slash")
    print("  - Use HTTPS (ngrok always uses HTTPS)")
    print("="*70 + "\n")
    
    # Run on all interfaces
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
