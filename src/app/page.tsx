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
import { AIService } from '@/services/AIService';
import { TTSService } from '@/services/TTSService';
import { TwitchService } from '@/services/TwitchService';
import { Settings, MessageCircle, Video, Mic } from 'lucide-react';

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const { config, addChatMessage, setAnimation, setConfig } = useStore();
  
  const [aiService] = useState(() => new AIService(config.ai));
  const [ttsService] = useState(() => new TTSService(config.tts));
  const [twitchService] = useState(() => new TwitchService(config.twitch));

  // Load saved config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('vtuber-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        console.log('✅ Configuración cargada:', parsed);
      } catch (error) {
        console.error('❌ Error loading saved config:', error);
      }
    }
  }, [setConfig]);

  // Update services when config changes
  useEffect(() => {
    console.log('🔄 Actualizando servicios con config:', config.ai);
    aiService.updateConfig(config.ai);
    ttsService.updateConfig(config.tts);
    
    // Only attempt Twitch connection if enabled AND channel is properly set
    const shouldConnect = config.twitch.enabled && 
                         config.twitch.channel && 
                         config.twitch.channel.trim() !== '';
    
    if (shouldConnect) {
      // Update Twitch config first
      twitchService.updateConfig(config.twitch);
      
      if (!twitchService.isConnected()) {
        console.log('🔌 Conectando a Twitch con canal:', config.twitch.channel);
        twitchService.connect(handleTwitchMessage).catch(err => {
          console.error('❌ Error conectando a Twitch:', err);
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
      // Disconnect if Twitch is disabled or no channel set
      if (twitchService.isConnected()) {
        console.log('🔌 Desconectando de Twitch...');
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
    console.log('💬 Mensaje de Twitch recibido:', message);
    
    addChatMessage({
      id: Date.now().toString(),
      username: message.username,
      message: message.message,
      timestamp: message.timestamp,
      color: message.color,
    });

    await processAIResponse(message.username, message.message);
  };

  const handleDirectMessage = async (messageText: string) => {
    console.log('💬 Mensaje directo recibido:', messageText);
    
    // Add user message
    addChatMessage({
      id: Date.now().toString(),
      username: 'You',
      message: messageText,
      timestamp: Date.now(),
      color: '#60a5fa',
    });

    await processAIResponse('You', messageText);
  };

  const processAIResponse = async (username: string, message: string) => {
    console.log('🤖 Procesando respuesta de IA...');
    console.log('📝 API Key presente:', !!config.ai.apiKey);
    console.log('🔧 Provider:', config.ai.provider);
    console.log('🎯 Model:', config.ai.model);

    if (!config.ai.apiKey) {
      console.error('❌ No API key configurada');
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

      console.log('📤 Enviando a API:', { provider: config.ai.provider, model: config.ai.model });
      
      const response = await aiService.generateResponse(messages);
      
      console.log('✅ Respuesta recibida:', response);

      addChatMessage({
        id: (Date.now() + 1).toString(),
        username: config.vtuber.name || 'VTuber',
        message: response,
        timestamp: Date.now(),
        isAI: true,
        color: '#9333ea',
      });

      // Speak response if TTS enabled
      if (config.tts.enabled) {
        console.log('🔊 Hablando respuesta...');
        await ttsService.speak(response);
      }

      // Random emote
      const emotes = ['wave', 'celebrate', 'think', 'heart'];
      const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];
      setAnimation({
        type: 'emote',
        name: randomEmote,
        duration: 2000,
      });

    } catch (error) {
      console.error('❌ Error procesando respuesta de IA:', error);
      
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

  const gameState = useStore((state: any) => state.gameState);

  // Render modes
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
    <main className="h-screen w-screen overflow-hidden bg-black">
      <div className="grid grid-cols-12 h-full">
        {/* VTuber Scene - Left Side */}
        <div className="col-span-5 relative">
          <VTuberScene />
          
          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 flex gap-2">
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
              <MessageCircle size={24} color="white" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
            >
              <Settings size={24} color="white" />
            </button>
          </div>

          {/* VTuber Info */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 rounded-lg p-4">
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

        {/* Game Board - Center */}
        <div className="col-span-4 bg-gray-900 p-4">
          {renderGame()}
        </div>

        {/* Chat Panel - Right Side */}
        <div className={`col-span-3 transition-all ${chatOpen ? '' : 'hidden'}`}>
          <ChatPanel onDirectMessage={handleDirectMessage} />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
