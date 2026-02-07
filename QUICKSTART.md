# 🚀 Quick Start - Miko AI VTuber

## Inicio Rápido en 5 Minutos

### 1️⃣ Instalación
```bash
cd ai-vtuber-advanced
npm install
```

### 2️⃣ Configurar Variables de Entorno
```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tu API key de Groq:
```
NEXT_PUBLIC_GROQ_API_KEY=gsk_tu_key_aqui
```

**¿No tienes API key?**
- Groq (gratis): https://console.groq.com/keys
- OpenRouter: https://openrouter.ai/keys
- Mistral: https://console.mistral.ai/api-keys

### 3️⃣ Agregar Modelo VRM
Opción A: Usar modelo de prueba
```bash
# Descarga un modelo VRM de ejemplo de VRoid Hub
# https://hub.vroid.com/
# Colócalo en: public/models/miko.vrm
```

Opción B: Crear tu propio modelo
- Usa VRoid Studio: https://vroid.com/studio
- Exporta como .vrm
- Coloca en `public/models/miko.vrm`

### 4️⃣ Ejecutar
```bash
npm run dev
```

Abre http://localhost:3000

### 5️⃣ Configurar en la Aplicación

1. Click en ⚙️ (arriba derecha)
2. Selecciona un juego (Ajedrez, Damas, o Reversi)
3. Verifica que tu API key esté configurada
4. ¡Empieza a jugar!

---

## 🎮 Primer Juego

1. **Ajedrez**: Click en una pieza blanca → Click en destino válido
2. **Damas**: Click en pieza roja → Click en destino
3. **Reversi**: Click en cualquier casilla válida (círculos verdes)

La IA jugará automáticamente después de tu turno.

---

## 💬 Activar Twitch (Opcional)

### Paso 1: Obtener Token
```
https://twitchapps.com/tmi/
```

### Paso 2: Configurar
1. Click en ⚙️
2. Sección "Twitch"
3. Habilitar Twitch ✅
4. Canal: tu_canal (sin #)
5. Token: oauth:el_token_que_obtuviste
6. Guardar

### Paso 3: ¡Chatear!
Los mensajes de tu chat aparecerán automáticamente y Miko responderá.

**Nota:** Los mensajes con `!` o `@` son ignorados automáticamente.

---

## 🔊 Activar TTS (Opcional)

### Opción Simple (Web Speech API):
1. Click en ⚙️
2. Habilitar TTS ✅
3. Guardar

✅ Funciona inmediatamente, sin configuración adicional

### Opción Avanzada (Coqui TTS con voice clone):

#### Paso 1: Instalar Backend
```bash
cd backend-tts
pip install -r requirements.txt
```

#### Paso 2: Ejecutar Backend
```bash
python server.py
```

Debe decir: `✅ Modelo cargado correctamente`

#### Paso 3: Configurar en App
1. Click en ⚙️
2. Habilitar TTS ✅
3. Usar Voice Clone ✅
4. Ruta de voz: `/path/to/your/voice.wav`
5. Guardar

**Crear archivo de voz:**
- Graba 10-30 segundos de audio claro
- Formato: WAV, mono, 22050 Hz
- Usa Audacity para editar si necesitas

---

## 🎬 Stream a Twitch

### Método 1: OBS (Recomendado)

1. **Instalar OBS**: https://obsproject.com/

2. **Agregar Fuente:**
   - Fuentes → Navegador
   - URL: `http://localhost:3000`
   - Tamaño: 1920x1080
   - FPS: 60

3. **Configurar Stream:**
   - Configuración → Emisión
   - Servicio: Twitch
   - Agregar tu stream key

4. **¡Iniciar Stream!**

### Método 2: Ver DEPLOYMENT.md
Para opciones avanzadas de hosting y streaming.

---

## ❓ Problemas Comunes

### "No se carga el modelo VRM"
- ✅ Verifica que el archivo esté en `public/models/miko.vrm`
- ✅ Abre la consola del navegador (F12) para ver errores

### "La IA no responde"
- ✅ Verifica tu API key en Settings
- ✅ Checa la consola para errores de API

### "TTS no funciona"
- ✅ Si usas Coqui: verifica que el backend esté corriendo
- ✅ Si usas Web Speech: verifica permisos de audio en el navegador

### "Twitch no conecta"
- ✅ El token debe empezar con `oauth:`
- ✅ El canal no lleva `#`
- ✅ Verifica que tu bot tenga permisos

---

## 📚 Siguiente Pasos

1. ✅ Personaliza el system prompt en Settings
2. ✅ Prueba diferentes modelos de IA
3. ✅ Crea tu propio modelo VRM
4. ✅ Configura voice cloning para TTS más natural
5. ✅ Lee DEPLOYMENT.md para streaming avanzado

---

## 🆘 Ayuda

¿Problemas? Abre un issue en GitHub con:
- Descripción del problema
- Pasos para reproducir
- Logs de la consola
- Tu sistema operativo

---

**¡Disfruta streameando con tu AI VTuber!** 🎉✨
