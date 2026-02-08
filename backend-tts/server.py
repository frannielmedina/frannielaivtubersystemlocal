"""
Backend TTS Server MEJORADO con Coqui TTS XTTS-v2
✅ CORS configurado para ngrok y Vercel
✅ Limpieza automática de tags de animación
✅ Detección de emociones
✅ 17 idiomas con auto-detección
"""

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import os
import tempfile
import re
import json

try:
    from TTS.api import TTS
    COQUI_AVAILABLE = True
except ImportError:
    COQUI_AVAILABLE = False
    print("⚠️  TTS not available. Install with: pip install TTS")

try:
    from langdetect import detect
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False
    print("⚠️  langdetect not available. Install with: pip install langdetect")

try:
    from pypinyin import pinyin, Style
    PYPINYIN_AVAILABLE = True
except ImportError:
    PYPINYIN_AVAILABLE = False
    print("⚠️  pypinyin not available. Install with: pip install pypinyin")

app = Flask(__name__)

# ✅ CORS Configuration - Allow all origins for ngrok compatibility
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins (needed for ngrok)
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "ngrok-skip-browser-warning"],
        "expose_headers": ["X-Emotion"]
    }
})

# Initialize TTS model
tts = None
if COQUI_AVAILABLE:
    try:
        print("🔊 Loading XTTS-v2 model...")
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        COQUI_AVAILABLE = False


# Animation tags to remove
ANIMATION_TAGS = [
    r'\[WAVE\]', r'\[CELEBRATE\]', r'\[BOW\]', r'\[DANCE\]',
    r'\[THINK\]', r'\[THUMBSUP\]', r'\[HEART\]', r'\[SAD\]',
    r'\[ANGRY\]', r'\[SURPRISED\]'
]


def clean_text_for_tts(text: str) -> str:
    """
    Remove animation tags and extra formatting for TTS
    """
    cleaned = text
    
    # Remove all animation tags
    for tag_pattern in ANIMATION_TAGS:
        cleaned = re.sub(tag_pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Remove any remaining brackets
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    
    # Clean up whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned


def detect_emotion(text: str) -> dict:
    """
    Detect emotion from animation tags before cleaning
    """
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
        
        # Map to supported languages
        lang_map = {
            'es': 'es',
            'en': 'en',
            'fr': 'fr',
            'de': 'de',
            'it': 'it',
            'pt': 'pt',
            'pl': 'pl',
            'tr': 'tr',
            'ru': 'ru',
            'nl': 'nl',
            'cs': 'cs',
            'ar': 'ar',
            'zh-cn': 'zh-cn',
            'zh': 'zh-cn',
            'ja': 'ja',
            'ko': 'ko',
            'hu': 'hu',
            'hi': 'hi'
        }
        
        return lang_map.get(lang, 'en')
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


@app.route('/api/health', methods=['GET'])
def health_check():
    """Check server status"""
    return jsonify({
        'status': 'ok',
        'tts_available': COQUI_AVAILABLE,
        'langdetect_available': LANGDETECT_AVAILABLE,
        'pypinyin_available': PYPINYIN_AVAILABLE,
        'model': 'xtts_v2' if COQUI_AVAILABLE else None,
        'features': {
            'animation_tag_cleaning': True,
            'emotion_detection': True,
            'multilingual': True,
            'pypinyin': PYPINYIN_AVAILABLE
        }
    })


@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def generate_speech():
    """
    Generate TTS audio
    Body: {
        "text": "text to synthesize",
        "voice": "path/to/voice/file.wav" (optional),
        "speed": 1.0,
        "language": "es" (optional, auto-detected if not provided)
    }
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        return response, 200
    
    if not COQUI_AVAILABLE or tts is None:
        return jsonify({'error': 'TTS not available'}), 503

    try:
        data = request.json
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

        if voice_path and os.path.exists(voice_path):
            # Voice cloning
            tts.tts_to_file(
                text=text,
                speaker_wav=voice_path,
                language=language,
                file_path=tmp_path,
                speed=speed
            )
        else:
            # Default voice
            tts.tts_to_file(
                text=text,
                language=language,
                file_path=tmp_path,
                speed=speed
            )

        print(f"✅ Generated: {tmp_path}")

        # Send file with emotion metadata in headers
        response = send_file(
            tmp_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='speech.wav'
        )
        
        # Add emotion data to response headers
        response.headers['X-Emotion'] = json.dumps(emotion)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Expose-Headers'] = 'X-Emotion'
        
        return response

    except Exception as e:
        print(f"Error generating TTS: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/detect-language', methods=['POST'])
def detect_lang():
    """Detect language from text"""
    if not LANGDETECT_AVAILABLE:
        return jsonify({'error': 'Language detection not available'}), 503
    
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text required'}), 400
        
        # Clean text first
        cleaned_text = clean_text_for_tts(text)
        lang = detect_language(cleaned_text)
        
        return jsonify({'language': lang})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clean-text', methods=['POST'])
def clean_text_endpoint():
    """Clean text by removing animation tags"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text required'}), 400
        
        cleaned = clean_text_for_tts(text)
        emotion = detect_emotion(text)
        
        return jsonify({
            'original': text,
            'cleaned': cleaned,
            'emotion': emotion
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available voices and languages"""
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
            {'code': 'zh-cn', 'name': 'Chinese (Mandarin)'},
            {'code': 'ja', 'name': 'Japanese'},
            {'code': 'ko', 'name': 'Korean'},
            {'code': 'hu', 'name': 'Hungarian'},
            {'code': 'hi', 'name': 'Hindi'}
        ]
    })


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🎤 TTS Server MEJORADO para Miko AI VTuber")
    print("="*50)
    print(f"TTS Available: {'✅ Yes' if COQUI_AVAILABLE else '❌ No'}")
    print(f"Language Detection: {'✅ Yes' if LANGDETECT_AVAILABLE else '❌ No'}")
    print(f"Pypinyin: {'✅ Yes' if PYPINYIN_AVAILABLE else '❌ No'}")
    print("Port: 5000")
    print("\nEndpoints:")
    print("  - GET  /api/health            → Server status")
    print("  - POST /api/tts               → Generate audio (auto-cleans tags)")
    print("  - POST /api/detect-language   → Detect language")
    print("  - POST /api/clean-text        → Clean animation tags")
    print("  - GET  /api/voices            → List voices")
    print("\nFeatures:")
    print("  ✅ Automatic animation tag removal")
    print("  ✅ Emotion detection")
    print("  ✅ 17 language support")
    print("  ✅ Pypinyin for Chinese")
    print("  ✅ CORS enabled for ngrok/Vercel")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
