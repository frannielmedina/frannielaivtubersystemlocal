// App Modes
export type AppMode = 'collab' | 'gaming' | null;

// Game Types
export type GameType = 'chess' | 'checkers' | 'reversi' | null;

export interface ChessMove {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export interface CheckersMove {
  from: number;
  to: number;
  captured?: number[];
}

export interface ReversiMove {
  row: number;
  col: number;
  player: 'black' | 'white';
}

// VTuber Animation Types
export type EmoteType = 
  | 'wave'
  | 'celebrate'
  | 'think'
  | 'sad'
  | 'angry'
  | 'dance'
  | 'heart'
  | 'surprised'
  | 'bow'
  | 'thumbsup';

export type DanceType = 
  | 'idle'
  | 'victory'
  | 'casual'
  | 'energetic';

export interface VTuberExpression {
  preset: string;
  duration?: number;
}

export interface VTuberAnimation {
  type: 'emote' | 'dance' | 'expression';
  name: string;
  duration: number;
  blendDuration?: number;
}

// AI Provider Types
export type AIProvider = 'groq' | 'openrouter' | 'mistral' | 'perplexity';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// TTS Types - UPDATED with Fish Audio
export type TTSProvider = 
  | 'webspeech' 
  | 'elevenlabs' 
  | 'coqui-local' 
  | 'coqui-colab'
  | 'fish-audio-colab';  // NEW!

export interface TTSConfig {
  enabled: boolean;
  provider: TTSProvider;
  voice: string;
  speed: number;
  pitch: number;
  useClone: boolean;
  cloneVoicePath?: string;
  multilingualDetection: boolean;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModel?: string;
  colabUrl?: string;  // Used for both Coqui and Fish Audio
}

// STT Types
export interface STTConfig {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

// Twitch Types
export interface TwitchConfig {
  enabled: boolean;
  channel: string;
  username: string;
  token: string;
}

export interface TwitchMessage {
  username: string;
  message: string;
  color?: string;
  badges?: any;
  timestamp: number;
}

// Game State Types
export interface GameState {
  currentGame: GameType;
  playerColor: 'white' | 'black';
  aiColor: 'white' | 'black';
  isPlayerTurn: boolean;
  winner: 'player' | 'ai' | 'draw' | null;
  moveHistory: any[];
}

// App Configuration
export interface AppConfig {
  ai: AIConfig;
  tts: TTSConfig;
  stt: STTConfig;
  twitch: TwitchConfig;
  vtuber: {
    name: string;
    modelPath: string;
    scale: number;
    position: [number, number, number];
  };
  appMode: AppMode;
  screenCapture: {
    enabled: boolean;
    source: 'window' | 'screen' | null;
  };
  overlay: {
    showMessages: boolean;
    messageDuration: number; // milliseconds
    showCommands: boolean;
  };
}

// Chat Types
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isAI?: boolean;
  color?: string;
}

// Store State
export interface AppStore {
  config: AppConfig;
  gameState: GameState;
  chatMessages: ChatMessage[];
  currentAnimation: VTuberAnimation | null;
  isProcessing: boolean;
  vtuberPosition: [number, number, number];
  vtuberRotation: [number, number, number];
  
  setConfig: (config: Partial<AppConfig>) => void;
  setGameState: (state: Partial<GameState>) => void;
  addChatMessage: (message: ChatMessage) => void;
  setAnimation: (animation: VTuberAnimation | null) => void;
  setProcessing: (processing: boolean) => void;
  setVTuberPosition: (position: [number, number, number]) => void;
  setVTuberRotation: (rotation: [number, number, number]) => void;
  resetGame: () => void;
}
