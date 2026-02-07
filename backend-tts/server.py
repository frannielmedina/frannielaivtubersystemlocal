"""
Backend TTS Server with Coqui TTS XTTS-v2
Supports voice cloning and multilingual detection
"""

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import os
import tempfile
import re

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

app = Flask(__name__)
CORS(app)

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
            'ja': 'ja',
            'ko': 'ko',
        }
        
        return lang_map.get(lang, 'en')
    except Exception as e:
        print(f"Language detection error: {e}")
        return 'en'


@app.route('/api/health', methods=['GET'])
def health_check():
    """Check server status"""
    return jsonify({
        'status': 'ok',
        'tts_available': COQUI_AVAILABLE,
        'langdetect_available': LANGDETECT_AVAILABLE,
        'model': 'xtts_v2' if COQUI_AVAILABLE else None
    })


@app.route('/api/tts', methods=['POST'])
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
    if not COQUI_AVAILABLE or tts is None:
        return jsonify({'error': 'TTS not available'}), 503

    try:
        data = request.json
        text = data.get('text', '')
        voice_path = data.get('voice')
        speed = float(data.get('speed', 1.0))
        language = data.get('language')

        if not text:
            return jsonify({'error': 'Text required'}), 400

        # Auto-detect language if not provided
        if not language:
            language = detect_language(text)
            print(f"🌍 Detected language: {language}")

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

        # Send file and clean up
        return send_file(
            tmp_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='speech.wav'
        )

    except Exception as e:
        print(f"Error generating TTS: {e}")
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
        
        lang = detect_language(text)
        return jsonify({'language': lang})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available voices (for future extensions)"""
    if not COQUI_AVAILABLE:
        return jsonify({'error': 'TTS not available'}), 503

    return jsonify({
        'voices': ['default', 'clone'],
        'languages': ['es', 'en', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh-cn', 'ja', 'ko']
    })


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🎤 TTS Server for Miko AI VTuber")
    print("="*50)
    print(f"TTS Available: {'✅ Yes' if COQUI_AVAILABLE else '❌ No'}")
    print(f"Language Detection: {'✅ Yes' if LANGDETECT_AVAILABLE else '❌ No'}")
    print("Port: 5000")
    print("Endpoints:")
    print("  - GET  /api/health            → Server status")
    print("  - POST /api/tts               → Generate audio")
    print("  - POST /api/detect-language   → Detect language")
    print("  - GET  /api/voices            → List voices")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
