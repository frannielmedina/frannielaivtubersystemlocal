import { create } from 'zustand';
import type { AppStore, AppConfig, ChatMessage, VTuberAnimation, GameState } from '@/types';

const defaultConfig: AppConfig = {
  ai: {
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.1-70b-versatile',
    systemPrompt: `You are Miko, a friendly and enthusiastic AI VTuber. You love playing chess, checkers, and Reversi with your followers. You are competitive but always kind. You can speak multiple languages naturally. When you win, you celebrate with joy. When you lose, you are a good sport. You always encourage your followers to keep playing.`,
    temperature: 0.8,
    maxTokens: 200,
  },
  tts: {
    enabled: true,
    voice: 'es-ES-Standard-A',
    speed: 1.0,
    pitch: 1.0,
    useClone: false,
    multilingualDetection: true,
  },
  stt: {
    enabled: false,
    language: 'en-US',
    continuous: true,
    interimResults: true,
  },
  twitch: {
    enabled: false,
    channel: '',
    username: '',
    token: '',
  },
  vtuber: {
    modelPath: '/models/miko.vrm',
    scale: 1.0,
    position: [0, -1, 0],
  },
  appMode: null,
  screenCapture: {
    enabled: false,
    source: null,
  },
  overlay: {
    showMessages: true,
    messageDuration: 60000, // 1 minute
    showCommands: true,
  },
};

const defaultGameState: GameState = {
  currentGame: null,
  playerColor: 'white',
  aiColor: 'black',
  isPlayerTurn: true,
  winner: null,
  moveHistory: [],
};

export const useStore = create<AppStore>((set) => ({
  config: defaultConfig,
  gameState: defaultGameState,
  chatMessages: [],
  currentAnimation: null,
  isProcessing: false,
  vtuberPosition: [0, -1, 0],
  vtuberRotation: [0, 0, 0],

  setConfig: (newConfig) =>
    set((state) => ({
      config: {
        ...state.config,
        ...newConfig,
        ai: { ...state.config.ai, ...(newConfig.ai || {}) },
        tts: { ...state.config.tts, ...(newConfig.tts || {}) },
        stt: { ...state.config.stt, ...(newConfig.stt || {}) },
        twitch: { ...state.config.twitch, ...(newConfig.twitch || {}) },
        vtuber: { ...state.config.vtuber, ...(newConfig.vtuber || {}) },
        screenCapture: { ...state.config.screenCapture, ...(newConfig.screenCapture || {}) },
        overlay: { ...state.config.overlay, ...(newConfig.overlay || {}) },
      },
    })),

  setGameState: (newState) =>
    set((state) => ({
      gameState: { ...state.gameState, ...newState },
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message].slice(-100), // Keep last 100 messages
    })),

  setAnimation: (animation) =>
    set({ currentAnimation: animation }),

  setProcessing: (processing) =>
    set({ isProcessing: processing }),

  setVTuberPosition: (position) =>
    set({ vtuberPosition: position }),

  setVTuberRotation: (rotation) =>
    set({ vtuberRotation: rotation }),

  resetGame: () =>
    set({ 
      gameState: { 
        ...defaultGameState, 
        currentGame: defaultGameState.currentGame 
      } 
    }),
}));
