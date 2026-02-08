"""
Backend TTS Server - NGROK FREE FIX
Solución para ngrok Free con advertencia
"""

from flask import Flask, request, send_file, jsonify, make_response
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

# ✅ NGROK FIX: Disable CORS library and add manual headers
# This is needed because ngrok Free shows a warning page
app.config['CORS_HEADERS'] = 'Content-Type'

@app.after_request
def after_request(response):
    """Add CORS headers to every response"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,ngrok-skip-browser-warning,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'X-Emotion')
    return response

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
        lang_map = {
            'es': 'es', 'en': 'en', 'fr': 'fr', 'de': 'de', 'it': 'it',
            'pt': 'pt', 'pl': 'pl', 'tr': 'tr', 'ru': 'ru', 'nl': 'nl',
            'cs': 'cs', 'ar': 'ar', 'zh-cn': 'zh-cn', 'zh': 'zh-cn',
            'ja': 'ja', 'ko': 'ko', 'hu': 'hu', 'hi': 'hi'
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
        'model': 'xtts_v2' if COQUI_AVAILABLE else None,
        'cors_enabled': True,
        'ngrok_compatible': True
    })


@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def generate_speech():
    """
    Generate TTS audio
    ✅ Ngrok Free compatible with OPTIONS handling
    """
    # Handle OPTIONS preflight
    if request.method == 'OPTIONS':
        return make_response('', 204)
    
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
            tts.tts_to_file(
                text=text,
                speaker_wav=voice_path,
                language=language,
                file_path=tmp_path,
                speed=speed
            )
        else:
            tts.tts_to_file(
                text=text,
                language=language,
                file_path=tmp_path,
                speed=speed
            )

        print(f"✅ Generated: {tmp_path}")

        # Read file and create response
        with open(tmp_path, 'rb') as f:
            audio_data = f.read()
        
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass

        # Create response with proper headers
        response = make_response(audio_data)
        response.headers['Content-Type'] = 'audio/wav'
        response.headers['Content-Disposition'] = 'attachment; filename=speech.wav'
        response.headers['X-Emotion'] = json.dumps(emotion)
        
        return response

    except Exception as e:
        print(f"Error generating TTS: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


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


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎤 TTS Server - NGROK FREE COMPATIBLE")
    print("="*60)
    print(f"TTS: {'✅' if COQUI_AVAILABLE else '❌'}")
    print(f"LangDetect: {'✅' if LANGDETECT_AVAILABLE else '❌'}")
    print(f"Pypinyin: {'✅' if PYPINYIN_AVAILABLE else '❌'}")
    print("\n🔧 Configuration:")
    print("  - CORS: Enabled for all origins")
    print("  - OPTIONS: Handled with 204 No Content")
    print("  - Ngrok: Free tier compatible")
    print("\n💡 Important:")
    print("  - Copy the ngrok URL EXACTLY as shown")
    print("  - Don't add trailing slash")
    print("  - Use HTTPS (ngrok always uses HTTPS)")
    print("="*60 + "\n")
    
    # Run on all interfaces
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
