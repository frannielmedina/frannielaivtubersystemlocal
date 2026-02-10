'use client';

import React, { useState, useEffect } from 'react';
import { VTuberScene } from '@/components/VTuberScene';
import { SettingsPanel } from '@/components/SettingsPanel';
import { CollabMode } from '@/components/CollabMode';
import { GamingMode } from '@/components/GamingMode';
import { ChessBoard } from '@/components/games/ChessBoard';
import { CheckersBoard } from '@/components/games/CheckersBoard';
import { ReversiBoard } from '@/components/games/ReversiBoard';
import { ChatPanel } from '@/components/ChatPanel';
import { useStore } from '@/store/useStore';
import { AIService, GameContext } from '@/services/AIService';
import { TTSService } from '@/services/TTSService';
import { TwitchService } from '@/services/TwitchService';
import { Settings, MessageCircle, Video, Mic, X } from 'lucide-react';

interface OverlayMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  color?: string;
}

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mouseIdleTimeout, setMouseIdleTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [overlayMessages, setOverlayMessages] = useState<OverlayMessage[]>([]);
  
  // Game context state
  const [currentGameContext, setCurrentGameContext] = useState<GameContext>({ game: null });
  
  const { config, addChatMessage, setAnimation, setConfig, chatMessages, gameState } = useStore();
  
  const [aiService] = useState(() => new AIService(config.ai));
  const [ttsService] = useState(() => new TTSService(config.tts));
  const [twitchService] = useState(() => new TwitchService(config.twitch));

  // Load saved config
  useEffect(() => {
    const savedConfig = localStorage.getItem('vtuber-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        console.log('✅ Configuration loaded:', parsed);
      } catch (error) {
        console.error('❌ Error loading saved config:', error);
      }
    }
  }, [setConfig]);

  // Update game context when game state changes
  useEffect(() => {
    setCurrentGameContext({
      game: gameState.currentGame,
      currentTurn: gameState.isPlayerTurn ? 'Player' : 'AI',
      winner: gameState.winner,
    });
  }, [gameState]);

  // Handle overlay messages
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) return;

    setOverlayMessages([]);

    const overlayMsg: OverlayMessage = {
      id: lastMessage.id,
      username: lastMessage.username,
      message: lastMessage.message,
      timestamp: lastMessage.timestamp,
      color: lastMessage.color,
    };

    setOverlayMessages([overlayMsg]);

    const timeout = setTimeout(() => {
      setOverlayMessages([]);
    }, 60000);

    return () => clearTimeout(timeout);
  }, [chatMessages]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setControlsVisible(true);
      
      if (mouseIdleTimeout) {
        clearTimeout(mouseIdleTimeout);
      }
      
      const timeout = setTimeout(() => {
        setControlsVisible(false);
      }, 60000);
      
      setMouseIdleTimeout(timeout);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseIdleTimeout) {
        clearTimeout(mouseIdleTimeout);
      }
    };
  }, [mouseIdleTimeout]);

  // Update services when config changes
  useEffect(() => {
    console.log('🔄 Updating services with config:', config.ai);
    aiService.updateConfig(config.ai);
    ttsService.updateConfig(config.tts);
    
    const shouldConnect = config.twitch.enabled && 
                         config.twitch.channel && 
                         config.twitch.channel.trim() !== '';
    
    if (shouldConnect) {
      twitchService.updateConfig(config.twitch);
      
      if (!twitchService.isConnected()) {
        console.log('🔌 Connecting to Twitch with channel:', config.twitch.channel);
        twitchService.connect(handleTwitchMessage).catch(err => {
          console.error('❌ Error connecting to Twitch:', err);
          addChatMessage({
            id: Date.now().toString(),
            username: 'System',
            message: `Failed to connect to Twitch: ${err.message}. Check your channel name in settings.`,
            timestamp: Date.now(),
            color: '#ef4444',
          });
        });
      }
    } else {
      if (twitchService.isConnected()) {
        console.log('🔌 Disconnecting from Twitch...');
        twitchService.disconnect();
      }
    }

    return () => {
      if (twitchService.isConnected()) {
        twitchService.disconnect();
      }
    };
  }, [config.ai, config.tts, config.twitch.enabled, config.twitch.channel, config.twitch.token]);

  const handleTwitchMessage = async (message: any) => {
    console.log('💬 Twitch message received:', message);
    
    addChatMessage({
      id: Date.now().toString(),
      username: message.username,
      message: message.message,
      timestamp: message.timestamp,
      color: message.color,
    });

    // Don't respond to game commands with AI - they're handled by the game boards
    const isGameCommand = /^!(move|place)\s+/i.test(message.message);
    if (!isGameCommand) {
      await processAIResponse(message.username, message.message);
    }
  };

  const handleDirectMessage = async (messageText: string) => {
    console.log('💬 Direct message received:', messageText);
    
    addChatMessage({
      id: Date.now().toString(),
      username: 'You',
      message: messageText,
      timestamp: Date.now(),
      color: '#60a5fa',
    });

    await processAIResponse('You', messageText);
  };

  // IMPROVED: Process AI response WITH game context
  const processAIResponse = async (username: string, message: string) => {
    console.log('🤖 Processing AI response with game context...');
    console.log('📝 API Key present:', !!config.ai.apiKey);
    console.log('🔧 Provider:', config.ai.provider);
    console.log('🎯 Model:', config.ai.model);
    console.log('🎮 Game Context:', currentGameContext);

    if (!config.ai.apiKey) {
      console.error('❌ No API key configured');
      addChatMessage({
        id: (Date.now() + 1).toString(),
        username: config.vtuber.name || 'VTuber',
        message: '❌ Error: API key not configured. Please add your API key in Settings.',
        timestamp: Date.now(),
        isAI: true,
        color: '#ef4444',
      });
      return;
    }

    try {
      const messages = [
        { role: 'system' as const, content: config.ai.systemPrompt },
        { role: 'user' as const, content: `${username} says: ${message}` },
      ];

      console.log('📤 Sending to API with game context');
      
      // PASS GAME CONTEXT TO AI
      const response = await aiService.generateResponse(messages, currentGameContext);
      
      console.log('✅ Response received:', response);

      addChatMessage({
        id: (Date.now() + 1).toString(),
        username: config.vtuber.name || 'VTuber',
        message: response,
        timestamp: Date.now(),
        isAI: true,
        color: '#9333ea',
      });

      if (config.tts.enabled) {
        console.log('🔊 Speaking response...');
        await ttsService.speak(response);
      }

      const emotes = ['wave', 'celebrate', 'think', 'heart'];
      const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];
      setAnimation({
        type: 'emote',
        name: randomEmote,
        duration: 2000,
      });

    } catch (error) {
      console.error('❌ Error processing AI response:', error);
      
      let errorMessage = 'Error generating response. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      }
      
      addChatMessage({
        id: (Date.now() + 2).toString(),
        username: 'System',
        message: errorMessage,
        timestamp: Date.now(),
        color: '#ef4444',
      });
    }
  };

  // Function to update game context (call this from game boards)
  const updateGameContext = (context: Partial<GameContext>) => {
    setCurrentGameContext(prev => ({ ...prev, ...context }));
  };

  // Make updateGameContext available globally
  useEffect(() => {
    (window as any).updateGameContext = updateGameContext;
    return () => {
      delete (window as any).updateGameContext;
    };
  }, []);

  if (config.appMode === 'collab') {
    return <CollabMode />;
  }

  if (config.appMode === 'gaming') {
    return <GamingMode />;
  }

  const renderGame = () => {
    switch (gameState.currentGame) {
      case 'chess':
        return <ChessBoard />;
      case 'checkers':
        return <CheckersBoard />;
      case 'reversi':
        return <ReversiBoard />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-xl">Select a game in settings</p>
          </div>
        );
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-black relative">
      <div className={`grid h-screen transition-all duration-300 ${
        chatOpen ? 'grid-cols-12' : 'grid-cols-9'
      }`}>
        {/* VTuber Scene */}
        <div className={`${chatOpen ? 'col-span-5' : 'col-span-5'} relative h-screen`}>
          <VTuberScene />
          
          {/* Controls Overlay */}
          <div 
            className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-500 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={() => setConfig({ appMode: 'collab' })}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              title="Collab Mode"
            >
              <Mic size={24} color="white" />
            </button>
            <button
              onClick={() => setConfig({ appMode: 'gaming' })}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              title="Gaming Mode"
            >
              <Video size={24} color="white" />
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
            >
              {chatOpen ? <X size={24} color="white" /> : <MessageCircle size={24} color="white" />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
            >
              <Settings size={24} color="white" />
            </button>
          </div>

          {/* VTuber Info */}
          <div 
            className={`absolute bottom-4 left-4 bg-black bg-opacity-60 rounded-lg p-4 transition-opacity duration-500 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <h1 className="text-2xl font-bold text-white">
              🎮 {config.vtuber.name || 'AI VTuber'}
            </h1>
            <p className="text-gray-300">
              {gameState.currentGame === 'chess' && '♟️ Playing Chess'}
              {gameState.currentGame === 'checkers' && '⚫ Playing Checkers'}
              {gameState.currentGame === 'reversi' && '⚪ Playing Reversi'}
              {!gameState.currentGame && '💤 Waiting'}
            </p>
            {config.ai.apiKey ? (
              <p className="text-green-400 text-sm mt-1">✅ API Connected</p>
            ) : (
              <p className="text-red-400 text-sm mt-1">❌ No API Key</p>
            )}
            {config.twitch.enabled && config.twitch.channel ? (
              <p className="text-blue-400 text-sm mt-1">
                💬 Twitch: {config.twitch.channel}
                {!config.twitch.token || config.twitch.token.trim() === '' ? ' (read-only)' : ''}
              </p>
            ) : null}
          </div>
        </div>

        {/* Game Board */}
        <div className={`${chatOpen ? 'col-span-4' : 'col-span-4'} bg-gray-900 p-4 h-screen overflow-y-auto transition-all duration-300`}>
          {renderGame()}
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="col-span-3 h-screen transition-all duration-300">
            <ChatPanel onDirectMessage={handleDirectMessage} />
          </div>
        )}
      </div>

      {/* Message Overlay */}
      {overlayMessages.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 max-w-md">
          {overlayMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black bg-opacity-80 backdrop-blur-sm px-4 py-3 rounded-lg shadow-2xl animate-fade-in mb-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="font-bold text-sm"
                  style={{ color: msg.color || '#60a5fa' }}
                >
                  {msg.username}
                </span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      {!controlsVisible && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-60 px-4 py-2 rounded-full text-white text-xs animate-pulse">
          💤 Move mouse to show controls
        </div>
      )}
    </main>
  );
}
