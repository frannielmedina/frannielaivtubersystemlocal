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

  useEffect(() => {
    aiService.updateConfig(config.ai);
    ttsService.updateConfig(config.tts);
    
    if (config.twitch.enabled && !twitchService.isConnected()) {
      twitchService.connect(async (message) => {
        addChatMessage({
          id: Date.now().toString(),
          username: message.username,
          message: message.message,
          timestamp: message.timestamp,
          color: message.color,
        });

        // Process message with AI
        try {
          const response = await aiService.generateResponse([
            { role: 'system', content: config.ai.systemPrompt },
            { role: 'user', content: `${message.username} says: ${message.message}` },
          ]);

          addChatMessage({
            id: (Date.now() + 1).toString(),
            username: 'Miko',
            message: response,
            timestamp: Date.now(),
            isAI: true,
            color: '#9333ea',
          });

          // Speak response
          await ttsService.speak(response);

          // Random emote
          const emotes = ['wave', 'celebrate', 'think', 'heart'];
          const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];
          setAnimation({
            type: 'emote',
            name: randomEmote,
            duration: 2000,
          });

        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
    }

    return () => {
      if (twitchService.isConnected()) {
        twitchService.disconnect();
      }
    };
  }, [config, aiService, ttsService, twitchService, addChatMessage, setAnimation]);

  const gameState = useStore(state => state.gameState);

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
            <h1 className="text-2xl font-bold text-white">🎮 Miko AI VTuber</h1>
            <p className="text-gray-300">
              {gameState.currentGame === 'chess' && '♟️ Playing Chess'}
              {gameState.currentGame === 'checkers' && '⚫ Playing Checkers'}
              {gameState.currentGame === 'reversi' && '⚪ Playing Reversi'}
              {!gameState.currentGame && '💤 Waiting'}
            </p>
          </div>
        </div>

        {/* Game Board - Center */}
        <div className="col-span-4 bg-gray-900 p-4">
          {renderGame()}
        </div>

        {/* Chat Panel - Right Side */}
        <div className={`col-span-3 transition-all ${chatOpen ? '' : 'hidden'}`}>
          <ChatPanel />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
