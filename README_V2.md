# 🎮 Miko AI VTuber - Advanced Interactive System

**Version 2.0 - Complete with Collab Mode & Gaming Mode**

Advanced AI VTuber system with VRM model support, interactive games, Twitch integration, multilingual TTS with voice cloning, STT for voice input, and dual streaming modes.

## ✨ Features

### 🎭 Dual Operating Modes

#### 1. 🎤 **Collab Mode** (NEW!)
- **Full-screen VTuber display** for collab streams
- **Speech-to-Text (STT)** - Talk directly with your AI VTuber using your voice
- **VTuber positioning controls** - Move and rotate your character in real-time
- **Live voice interaction** - AI responds with voice and animations
- **Perfect for**: Just chatting streams, collaborations, Q&A sessions

#### 2. 🎮 **Gaming Mode** (NEW!)
- **Screen capture integration** - Stream any game or application
- **Corner VTuber overlay** - AI VTuber appears in the corner while you game
- **Chat message overlays** - Messages fade in/out on screen (1-minute duration)
- **Command display** - Show available commands on screen
- **Perfect for**: Gaming streams with AI VTuber commentary

#### 3. 🎲 **Classic Mode**
- **Interactive games** - Chess, Checkers, Reversi
- **Split-screen layout** - VTuber, game board, and chat
- **Perfect for**: Interactive game streams with viewers

### 🤖 AI VTuber Capabilities
- ✅ **VRM Model Support** (Vroid compatible)
- ✅ **10+ Emotes**: wave, celebrate, think, sad, angry, dance, heart, surprised, bow, thumbsup
- ✅ **Dynamic Dances**: idle, victory, casual, energetic
- ✅ **Facial Expressions**: happy, sad, angry, surprised, blink
- ✅ **Context-aware Reactions**: Responds to game events automatically

### 🎮 Interactive Games
- ✅ **Chess** - Full implementation with check/checkmate detection
  - Automatic messages: "Check!", "Checkmate!", "Can't do that - king in check!"
  - Strategic AI opponent
  - Visual legal move highlighting
  
- ✅ **Checkers** - Complete with multi-jump support
  - King promotion
  - Victory celebrations
  - Jump detection
  
- ✅ **Reversi/Othello** - Strategic tile-flipping game
  - Real-time score tracking
  - Legal move hints
  - Corner strategy AI

### 🌍 Multilingual AI Integration
- ✅ **4 AI Providers**: Groq, OpenRouter, Mistral AI, Perplexity
- ✅ **Customizable System Prompts**
- ✅ **Auto-language detection** - AI responds in any language
- ✅ **Multi-language support** in prompts

### 🔊 Advanced Text-to-Speech
- ✅ **Coqui TTS with XTTS-v2**
  - Voice cloning capability
  - **Multilingual auto-detection** - Automatically detects and speaks in the detected language
  - High-quality Spanish pronunciation (and 14+ other languages)
  - Adjustable speed and pitch
  
- ✅ **Web Speech API Fallback**
  - Works without backend
  - Instant setup
  
### 🎤 Speech-to-Text (NEW!)
- ✅ **Web Speech API** for voice input
- ✅ **10+ Language Support**: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, etc.
- ✅ **Continuous Recognition** - Keeps listening
- ✅ **Interim Results** - See what you're saying in real-time
- ✅ **Used in Collab Mode** for natural voice conversations

### 💬 Twitch Integration
- ✅ **Real-time chat connection**
- ✅ **Auto-filtering**: Ignores messages starting with `!` or containing `@`
- ✅ **AI-powered responses**
- ✅ **Bidirectional communication**
- ✅ **Message overlay in Gaming Mode**

### ⚙️ Advanced Configuration
- ✅ **Game Selection**: Switch between Chess, Checkers, Reversi
- ✅ **AI Provider Settings**: Choose and configure AI backend
- ✅ **TTS Configuration**: Voice cloning, speed, multilingual detection
- ✅ **STT Configuration**: Language, continuous mode
- ✅ **Twitch Settings**: OAuth token, channel, username
- ✅ **Overlay Settings**: Message duration, command visibility

---

## 🚀 Quick Start

### Installation
```bash
cd ai-vtuber-advanced
npm install
```

### Basic Setup
1. **Configure Environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Groq API key (free at https://console.groq.com/keys)

2. **Add VRM Model**:
   - Download from VRoid Hub or create in VRoid Studio
   - Place in `/public/models/miko.vrm`

3. **Run**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

---

## 🎬 Operating Modes Guide

### 🎤 Using Collab Mode

1. Click the **🎤 Microphone icon** in the top-right
2. Grant microphone permissions when prompted
3. Click **"Start Listening"** to enable voice input
4. **Talk naturally** - Miko will respond with voice and animations
5. **Adjust Position**: Use position/rotation controls to frame Miko
6. **Exit**: Click "Exit Collab Mode" to return to classic view

**Tips**:
- Enable STT in Settings first
- Choose your language (Settings → STT → Language)
- Continuous mode keeps listening automatically
- Perfect for "Just Chatting" streams

### 🎮 Using Gaming Mode

1. Click the **🎮 Video icon** in the top-right
2. Click **"Start Screen Capture"**
3. Select the game window or screen to capture
4. Your game appears full-screen with Miko in the corner
5. Chat messages overlay on the left (fade after 1 minute)
6. **Toggle Messages**: Show/hide chat overlay
7. **Exit**: Click "Exit Gaming Mode" to return

**Tips**:
- Use OBS to capture this window for streaming
- Messages auto-fade after 1 minute (configurable)
- Commands display shows interactive options
- Perfect for gaming + AI commentary

### 🎲 Classic Mode (Default)

- Split-screen: VTuber | Game Board | Chat
- Interactive games with viewers
- Full chat panel
- Traditional streaming layout

---

## 🌐 Multilingual Support

### Auto-Detection (Coqui TTS)
When **Multilingual Detection** is enabled:
1. User sends message in any language
2. Backend auto-detects language
3. AI responds (can be in any language)
4. TTS speaks in the detected language

**Supported Languages**: Spanish, English, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese, Japanese, Korean

### Manual Language (STT)
In Settings → STT Configuration:
- Select your preferred voice input language
- Miko will understand speech in that language
- AI responds in the same or different language based on context

---

## 📦 Backend TTS Setup (Optional but Recommended)

### For Voice Cloning & Multilingual TTS:

```bash
# Terminal 1: Install Backend
cd backend-tts
pip install -r requirements.txt

# Terminal 2: Run Backend
python server.py

# Terminal 3: Run Frontend
cd ..
npm run dev
```

### Creating a Voice Sample:
1. Record 10-30 seconds of clear audio
2. Save as WAV (mono, 22050 Hz)
3. Path examples: `/path/to/miko_voice.wav`
4. Configure in Settings → TTS → Voice File Path

---

## 🎥 Streaming to Twitch Guide

### Method 1: OBS (Recommended for 60 FPS)

1. **Run the Application**:
   ```bash
   npm run dev
   ```

2. **OBS Setup**:
   - Add Source → Browser
   - URL: `http://localhost:3000`
   - Size: 1920x1080
   - FPS: 60
   - ✅ Control audio through OBS
   - ✅ Refresh browser when scene becomes active

3. **Choose Your Mode**:
   - **Classic Mode**: Games + Chat + VTuber split screen
   - **Collab Mode**: Full-screen VTuber for Just Chatting
   - **Gaming Mode**: Your game with VTuber overlay

4. **Configure Encoding**:
   - Bitrate: 6000 Kbps
   - Keyframe: 2
   - Preset: veryfast (or Quality for NVENC)
   - FPS: 60

5. **Stream!**

### Method 2: Deploy to Vercel (Frontend Only)

```bash
vercel deploy --prod
```

Then capture the Vercel URL in OBS instead of localhost.

**Note**: For voice cloning TTS, you'll still need the Python backend running locally or on a GPU server.

---

## ⚙️ Configuration Guide

### AI Configuration
1. Open Settings (⚙️ icon)
2. Select AI Provider (Groq recommended)
3. Enter API Key
4. Customize System Prompt:
   ```
   You are Miko, a friendly AI VTuber. You love playing games
   with your viewers. You speak multiple languages naturally.
   When you win, you celebrate. When you lose, you're a good sport.
   ```

### TTS Configuration
- **Enable TTS** ✅
- **Use Voice Clone**: For Coqui TTS with custom voice
- **Multilingual Detection**: Auto-detects language ✅
- **Speed**: 0.5x to 2.0x

### STT Configuration (for Collab Mode)
- **Enable STT** ✅
- **Language**: Choose your voice input language
- **Continuous**: Keep listening ✅
- **Interim Results**: See live transcription ✅

### Twitch Configuration
1. Get OAuth Token: https://twitchapps.com/tmi/
2. Settings → Twitch:
   - Enable Twitch ✅
   - Channel: `your_channel` (no #)
   - Token: `oauth:your_token_here`

---

## 🎮 Game Commands & Interactions

### Chess
- **"Check!"** - When AI puts you in check
- **"Can't do that - king in check!"** - When you try an illegal move while in check
- **"Checkmate!"** - Game over announcement
- Auto-restart with color assignment

### Checkers
- **"Multi-jump!"** - When capturing multiple pieces
- **Victory celebration** - Dance animation on win
- King promotion automatic

### Reversi
- **Score announcements** - Real-time tracking
- **Hint system** - Click hint button for suggested move
- **Draw detection** - Fair tie announcement

---

## 📁 Project Structure

```
ai-vtuber-advanced/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main app with mode switching
│   │   ├── layout.tsx            # Next.js layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── VTuberScene.tsx       # 3D VTuber rendering
│   │   ├── CollabMode.tsx        # 🎤 Collab Mode (NEW!)
│   │   ├── GamingMode.tsx        # 🎮 Gaming Mode (NEW!)
│   │   ├── SettingsPanel.tsx     # Configuration UI
│   │   ├── ChatPanel.tsx         # Twitch chat
│   │   └── games/
│   │       ├── ChessBoard.tsx    # Chess UI
│   │       ├── CheckersBoard.tsx # Checkers UI
│   │       └── ReversiBoard.tsx  # Reversi UI
│   ├── services/
│   │   ├── AIService.ts          # AI provider integration
│   │   ├── TTSService.ts         # Text-to-Speech
│   │   ├── STTService.ts         # Speech-to-Text (NEW!)
│   │   └── TwitchService.ts      # Twitch chat client
│   ├── games/
│   │   ├── ChessGame.ts          # Chess logic
│   │   ├── CheckersGame.ts       # Checkers logic
│   │   └── ReversiGame.ts        # Reversi logic
│   ├── store/
│   │   └── useStore.ts           # Global state (Zustand)
│   └── types/
│       └── index.ts              # TypeScript types
├── backend-tts/
│   ├── server.py                 # Flask TTS server with multilingual detection
│   └── requirements.txt          # Python dependencies
└── public/
    └── models/
        └── miko.vrm              # Your VRM model
```

---

## 🌟 What's New in v2.0

### Major Features:
1. ✅ **Collab Mode** - Full-screen VTuber with voice interaction
2. ✅ **Gaming Mode** - Game streaming with VTuber overlay
3. ✅ **Speech-to-Text** - Voice input support
4. ✅ **Multilingual Auto-Detection** - Automatic language detection for TTS
5. ✅ **VTuber Position Controls** - Move and rotate character
6. ✅ **Message Overlays** - Fade-in/out chat messages in Gaming Mode
7. ✅ **Complete Game UIs** - Visual chess, checkers, and reversi boards
8. ✅ **Enhanced Animations** - More reactive and context-aware

### UI/UX Improvements:
- Mode switching buttons (Collab/Gaming)
- Real-time STT feedback
- Message overlay system
- Screen capture integration
- Position/rotation controls
- Better visual feedback for game states

---

## 🐛 Troubleshooting

### "Microphone not working in Collab Mode"
- ✅ Grant microphone permissions in browser
- ✅ Enable STT in Settings
- ✅ Check browser console for errors
- ✅ Chrome/Edge work best (Firefox may have issues)

### "Screen capture not available"
- ✅ Use Chrome or Edge (best support)
- ✅ Grant screen sharing permissions
- ✅ Select correct window/screen

### "TTS speaks wrong language"
- ✅ Enable "Multilingual Detection" in Settings
- ✅ Check backend is running (`python server.py`)
- ✅ Install langdetect: `pip install langdetect`

### "Game not responding"
- ✅ Check it's your turn
- ✅ Click legal moves (green highlights)
- ✅ See console for errors

### "Twitch not connecting"
- ✅ Token must start with `oauth:`
- ✅ Channel name without `#`
- ✅ Check OAuth token is valid

---

## 📝 Best Practices

### For Streaming:
- **60 FPS**: Use OBS to capture the application
- **Layout**: Choose mode based on content (Collab/Gaming/Classic)
- **Interaction**: Enable Twitch for viewer participation
- **Voice**: Use Coqui TTS with voice clone for best quality

### For Development:
- Read console logs for debugging
- Test each mode separately
- Use STT test in Collab Mode before stream
- Verify screen capture works in Gaming Mode

---

## 📄 License

MIT - Free for personal and commercial use

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## 📧 Support

Issues, questions, or feedback? Open a GitHub issue with:
- Description of the problem
- Steps to reproduce
- Console logs
- Operating system

---

**Built with ❤️ for VTubers and streamers who love technology**

**Enjoy streaming with your AI VTuber!** 🎮✨🤖
