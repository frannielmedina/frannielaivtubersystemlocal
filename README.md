# 🎮 Miko AI VTuber - Sistema Avanzado con Juegos Interactivos

Sistema completo de AI VTuber con modelo VRM, integración de Twitch, múltiples juegos interactivos (Ajedrez, Damas, Reversi), TTS con clonación de voz, y múltiples proveedores de IA.

## ✨ Características

### 🤖 AI VTuber
- ✅ Modelo VRM con animaciones (Vroid compatible)
- ✅ Emotes: wave, celebrate, think, sad, angry, dance, heart, surprised, bow, thumbsup
- ✅ Danzas: idle, victory, casual, energetic
- ✅ Expresiones faciales dinámicas
- ✅ Animaciones de reacción según eventos del juego

### 🎮 Juegos Interactivos
- ✅ **Ajedrez** - Mensajes automáticos en jaque/jaque mate
- ✅ **Damas** - Reacciones al ganar/perder
- ✅ **Reversi/Othello** - Sistema de puntuación en tiempo real
- ✅ Reinicio automático de partidas
- ✅ Indicador de turno jugador/IA

### 🤖 Integración con múltiples AIs
- ✅ **Groq** (recomendado para español)
- ✅ **OpenRouter**
- ✅ **Mistral AI**
- ✅ **Perplexity**
- ✅ System prompts personalizables

### 🔊 Text-to-Speech Avanzado
- ✅ **Coqui TTS** con XTTS-v2 para clonación de voz
- ✅ Soporte nativo para español
- ✅ Fallback a Web Speech API
- ✅ Control de velocidad y tono

### 💬 Integración con Twitch
- ✅ Conexión en tiempo real
- ✅ Filtrado automático de mensajes (!comandos y @menciones)
- ✅ Respuestas automáticas con IA
- ✅ Sistema de chat bidireccional

## 📋 Requisitos Previos

### Para desarrollo local:
```bash
Node.js 18+ 
npm o yarn
GPU con CUDA (opcional, para Coqui TTS)
```

### APIs necesarias:
- API Key de Groq/OpenRouter/Mistral/Perplexity
- Token OAuth de Twitch (si usas integración)

## 🚀 Instalación Rápida

### 1. Clonar e instalar dependencias:
```bash
cd ai-vtuber-advanced
npm install
```

### 2. Configurar modelo VRM:
- Coloca tu archivo `.vrm` en `/public/models/miko.vrm`
- O modifica la ruta en configuración

### 3. Ejecutar en desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuración

### Configurar IA:
1. Click en el icono ⚙️ (arriba derecha)
2. Selecciona proveedor (Groq recomendado)
3. Ingresa tu API Key
4. Personaliza el system prompt
5. Guarda cambios

### Configurar TTS:

#### Opción 1: Web Speech API (Simple):
- Activar "Habilitar TTS"
- Desactivar "Usar Voice Clone"
- ✅ No requiere backend

#### Opción 2: Coqui TTS con clonación (Avanzado):
```bash
# En una terminal separada, instalar backend TTS
cd backend-tts
pip install TTS flask flask-cors
python server.py
```

- Activar "Habilitar TTS"
- Activar "Usar Voice Clone"
- Especificar ruta del archivo de voz de referencia
- ✅ Mejor calidad y naturalidad

### Configurar Twitch:
1. Obtén OAuth token en: https://twitchapps.com/tmi/
2. En configuración:
   - Habilitar Twitch
   - Canal: tu_canal (sin #)
   - Token: oauth:tu_token_aqui

## 🎲 Cómo Jugar

### Ajedrez:
- Arrastra las piezas para mover
- La IA responde automáticamente
- Mensajes especiales en jaque/jaque mate
- Reinicio automático al terminar partida

### Damas:
- Click en pieza → Click en destino
- Saltos obligatorios detectados automáticamente
- Coronación automática al llegar al final

### Reversi:
- Click en casilla válida
- Puntaje en tiempo real
- Ayuda visual de movimientos legales

## 📦 Estructura del Proyecto

```
ai-vtuber-advanced/
├── src/
│   ├── app/
│   │   └── page.tsx              # Página principal
│   ├── components/
│   │   ├── VTuberScene.tsx       # Renderizado 3D del VTuber
│   │   ├── SettingsPanel.tsx     # Panel de configuración
│   │   ├── ChatPanel.tsx         # Chat de Twitch
│   │   └── games/
│   │       ├── ChessBoard.tsx    # Tablero de ajedrez
│   │       ├── CheckersBoard.tsx # Tablero de damas
│   │       └── ReversiBoard.tsx  # Tablero de Reversi
│   ├── services/
│   │   ├── AIService.ts          # Integración con AIs
│   │   ├── TTSService.ts         # Text-to-Speech
│   │   └── TwitchService.ts      # Cliente de Twitch
│   ├── games/
│   │   ├── ChessGame.ts          # Lógica de ajedrez
│   │   ├── CheckersGame.ts       # Lógica de damas
│   │   └── ReversiGame.ts        # Lógica de Reversi
│   ├── store/
│   │   └── useStore.ts           # Estado global (Zustand)
│   └── types/
│       └── index.ts              # Tipos TypeScript
├── public/
│   └── models/
│       └── miko.vrm              # Tu modelo VRM
└── backend-tts/                  # Backend opcional para TTS
    └── server.py
```

## 🌐 Opciones de Hosting

### ❌ NO RECOMENDADO para streaming a 60 FPS:
- **Vercel/Netlify**: Solo frontend estático
- **Google Colab**: Temporal, se desconecta

### ✅ RECOMENDADO:

#### Opción 1: Local + OBS (MEJOR para streaming):
```bash
# 1. Ejecutar aplicación localmente
npm run dev

# 2. En OBS:
# - Agregar fuente "Navegador"
# - URL: http://localhost:3000
# - Resolución: 1920x1080
# - FPS: 60
# - Streamear a Twitch normalmente
```

#### Opción 2: VPS (Railway, Render, DigitalOcean):
```bash
# Deploy frontend
npm run build
npm start

# Backend TTS en servidor con GPU
# Necesario para Coqui TTS
```

## 🎥 Streaming a Twitch a 60 FPS

### Con OBS (Recomendado):
1. Configura la aplicación en localhost:3000
2. OBS → Fuente → Navegador → http://localhost:3000
3. Configura streaming:
   - Bitrate: 6000 kbps
   - Keyframe: 2
   - Preset: veryfast o faster
   - FPS: 60

### Requisitos de hardware:
- CPU: i5/Ryzen 5 o superior
- RAM: 8GB mínimo
- GPU: Dedicada recomendada
- Upload: 10 Mbps mínimo

## 🔧 Backend TTS (Opcional)

Si quieres usar Coqui TTS con clonación de voz:

```python
# backend-tts/server.py
from flask import Flask, request, send_file
from flask_cors import CORS
from TTS.api import TTS
import io

app = Flask(__name__)
CORS(app)

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

@app.route('/api/tts', methods=['POST'])
def generate_speech():
    data = request.json
    text = data['text']
    voice_path = data.get('voice', 'default_voice.wav')
    
    # Generate speech
    wav = tts.tts(text=text, speaker_wav=voice_path, language="es")
    
    # Return audio
    audio_io = io.BytesIO()
    # Save wav to audio_io
    audio_io.seek(0)
    return send_file(audio_io, mimetype='audio/wav')

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(port=5000)
```

## 📝 Notas Importantes

### Filtrado de mensajes de Twitch:
- ❌ Ignora mensajes que empiezan con `!`
- ❌ Ignora mensajes que contienen `@`
- ✅ Procesa el resto normalmente

### Animaciones automáticas:
- Jaque en ajedrez → "surprised"
- Jaque mate → "celebrate" (si gana) / "sad" (si pierde)
- Victoria en damas → "dance"
- Victoria en Reversi → "heart"

### Rendimiento:
- El modelo VRM afecta FPS según complejidad
- Usa modelos optimizados para VTubing
- 60 FPS requiere GPU dedicada

## 🐛 Troubleshooting

### "No se carga el modelo VRM":
- Verifica que el archivo esté en `/public/models/`
- Revisa la consola del navegador
- Asegúrate que sea un archivo .vrm válido

### "TTS no funciona":
- Si usas voice clone: verifica que el backend esté corriendo
- Si falla: automáticamente usa Web Speech API
- En Firefox: Web Speech API puede no estar disponible

### "Twitch no conecta":
- Verifica el OAuth token
- El token debe empezar con `oauth:`
- El nombre de canal no lleva #

### "La IA no responde":
- Verifica la API key
- Revisa límites de rate limit
- Mira la consola para errores

## 📄 Licencia

MIT - Usa libremente para proyectos personales y comerciales

## 🤝 Contribuciones

¡Pull requests bienvenidos! Para cambios grandes, abre un issue primero.

## 📧 Soporte

Si encuentras bugs o necesitas ayuda, crea un issue en GitHub.

---

**Creado con ❤️ para streamers que aman la tecnología**
