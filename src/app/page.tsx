'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VTuberScene, BG_OPTIONS } from '@/components/VTuberScene';
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
import { Settings, MessageCircle, Video, Mic, X, Image } from 'lucide-react';

interface OverlayMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  color?: string;
}

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen]         = useState(true);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [selectedBg, setSelectedBg]     = useState('gradient-purple');
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef    = useRef(false);

  const [overlayMessages, setOverlayMessages] = useState<OverlayMessage[]>([]);
  const [currentGameContext, setCurrentGameContext] = useState<GameContext>({ game: null });

  const { config, addChatMessage, setAnimation, setConfig, chatMessages, gameState } = useStore();

  const [aiService]     = useState(() => new AIService(config.ai));
  const [ttsService]    = useState(() => new TTSService(config.tts));
  const [twitchService] = useState(() => new TwitchService(config.twitch));

  // ── Load saved config & bg ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('vtuber-config');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch {}
    }
    const savedBg = localStorage.getItem('vtuber-bg');
    if (savedBg) setSelectedBg(savedBg);
  }, []);

  // Save bg choice
  useEffect(() => {
    localStorage.setItem('vtuber-bg', selectedBg);
  }, [selectedBg]);

  // ── Game context sync ───────────────────────────────────
  useEffect(() => {
    setCurrentGameContext({
      game: gameState.currentGame,
      currentTurn: gameState.isPlayerTurn ? 'Player' : 'AI',
      winner: gameState.winner,
    });
  }, [gameState]);

  // ── Overlay messages ────────────────────────────────────
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (!last) return;
    setOverlayMessages([{ id: last.id, username: last.username, message: last.message, timestamp: last.timestamp, color: last.color }]);
    const t = setTimeout(() => setOverlayMessages([]), 60000);
    return () => clearTimeout(t);
  }, [chatMessages]);

  // ── Auto-hide controls (FIXED: no rapid flicker) ────────
  useEffect(() => {
    const show = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setControlsVisible(true);
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        setControlsVisible(false);
      }, 5000); // hide after 5s of no movement
    };

    window.addEventListener('mousemove', show);
    show();
    return () => {
      window.removeEventListener('mousemove', show);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // ── Services update ─────────────────────────────────────
  useEffect(() => {
    aiService.updateConfig(config.ai);
    ttsService.updateConfig(config.tts);

    if (config.twitch.enabled && config.twitch.channel?.trim()) {
      twitchService.updateConfig(config.twitch);
      if (!twitchService.isConnected()) {
        twitchService.connect(handleTwitchMessage).catch((err) => {
          addChatMessage({ id: Date.now().toString(), username: 'System', message: `Twitch error: ${err.message}`, timestamp: Date.now(), color: '#ef4444' });
        });
      }
    } else if (twitchService.isConnected()) {
      twitchService.disconnect();
    }
    return () => { if (twitchService.isConnected()) twitchService.disconnect(); };
  }, [config.ai, config.tts, config.twitch.enabled, config.twitch.channel, config.twitch.token]);

  const handleTwitchMessage = async (message: any) => {
    addChatMessage({ id: Date.now().toString(), username: message.username, message: message.message, timestamp: message.timestamp, color: message.color });
    if (!/^!(move|place)\s+/i.test(message.message)) {
      await processAIResponse(message.username, message.message);
    }
  };

  const handleDirectMessage = async (messageText: string) => {
    addChatMessage({ id: Date.now().toString(), username: 'You', message: messageText, timestamp: Date.now(), color: '#60a5fa' });
    await processAIResponse('You', messageText);
  };

  const processAIResponse = async (username: string, message: string) => {
    if (!config.ai.apiKey) {
      addChatMessage({ id: (Date.now() + 1).toString(), username: config.vtuber.name || 'VTuber', message: '❌ No API key configured. Add your key in Settings.', timestamp: Date.now(), isAI: true, color: '#ef4444' });
      return;
    }
    try {
      const messages = [
        { role: 'system' as const, content: config.ai.systemPrompt },
        { role: 'user'   as const, content: `${username} says: ${message}` },
      ];
      const response = await aiService.generateResponse(messages, currentGameContext);
      addChatMessage({ id: (Date.now() + 1).toString(), username: config.vtuber.name || 'VTuber', message: response, timestamp: Date.now(), isAI: true, color: '#9333ea' });
      if (config.tts.enabled) await ttsService.speak(response);

      // Detect animation trigger from response
      const trigger = detectAnimationTrigger(response);
      if (trigger) {
        setAnimation({ type: 'emote', name: trigger, duration: 4000 });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addChatMessage({ id: (Date.now() + 2).toString(), username: 'System', message: msg, timestamp: Date.now(), color: '#ef4444' });
    }
  };

  // Detect animation from AI response text
  function detectAnimationTrigger(text: string): string | null {
    const t = text.toUpperCase();
    if (t.includes('[DANCE]'))     return 'dance';
    if (t.includes('[ENERGETIC]')) return 'energetic';
    if (t.includes('[KAWAII]'))    return 'kawaii';
    if (t.includes('[WAVE]'))      return 'wave';
    if (t.includes('[CELEBRATE]')) return 'celebrate';
    if (t.includes('[BOW]'))       return 'bow';
    if (t.includes('[THINK]'))     return 'think';
    if (t.includes('[THUMBSUP]'))  return 'thumbsup';
    if (t.includes('[HEART]'))     return 'heart';
    if (t.includes('[SAD]'))       return 'sad';
    if (t.includes('[ANGRY]'))     return 'angry';
    if (t.includes('[SURPRISED]')) return 'surprised';
    if (t.includes('[SPIN]'))      return 'spin';
    if (t.includes('[SQUAT]'))     return 'squat';
    if (t.includes('[PEACE]'))     return 'peace';
    if (t.includes('[SHOOT]'))     return 'shoot';
    if (t.includes('[CRAZY]'))     return 'crazy';
    if (t.includes('[MODELPOSE]')) return 'modelpose';
    return null;
  }

  // Expose game context updater globally
  const updateGameContext = (context: Partial<GameContext>) => {
    setCurrentGameContext((prev) => ({ ...prev, ...context }));
  };
  useEffect(() => {
    (window as any).updateGameContext = updateGameContext;
    return () => { delete (window as any).updateGameContext; };
  }, []);

  // ── Modes ────────────────────────────────────────────────
  if (config.appMode === 'collab')  return <CollabMode />;
  if (config.appMode === 'gaming')  return <GamingMode />;

  const hasGame = !!gameState.currentGame;

  const renderGame = () => {
    switch (gameState.currentGame) {
      case 'chess':    return <ChessBoard />;
      case 'checkers': return <CheckersBoard />;
      case 'reversi':  return <ReversiBoard />;
      default:         return null;
    }
  };

  // Grid layout: if no game, 2 cols (vtuber + chat); if game, 3 cols
  const gridCols = hasGame
    ? (chatOpen ? 'grid-cols-12' : 'grid-cols-9')
    : (chatOpen ? 'grid-cols-8'  : 'grid-cols-5');

  const vtuberCols  = hasGame ? 'col-span-5' : 'col-span-5';
  const gameCols    = 'col-span-4';
  const chatCols    = 'col-span-3';

  return (
    <main className="h-screen w-screen overflow-hidden bg-black relative">
      <div className={`grid h-screen transition-all duration-300 ${gridCols}`}>

        {/* ── VTuber Scene ─────────────────────────────────── */}
        <div className={`${vtuberCols} relative h-screen`}>
          <VTuberScene bgId={selectedBg} />

          {/* Controls overlay — fade in/out smoothly */}
          <div
            className="absolute top-4 right-4 flex gap-2 transition-opacity duration-700 pointer-events-auto"
            style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
          >
            {/* Background picker */}
            <div className="relative">
              <button
                onClick={() => setBgPickerOpen((o) => !o)}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
                title="Change Background"
              >
                <Image size={22} color="white" />
              </button>
              {bgPickerOpen && (
                <div className="absolute right-0 top-12 bg-gray-900 border border-gray-700 rounded-lg p-3 z-50 w-52 shadow-xl">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Background</p>
                  {BG_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => { setSelectedBg(bg.id); setBgPickerOpen(false); }}
                      className={`w-full text-left text-sm px-3 py-2 rounded mb-1 flex items-center gap-2 transition-colors ${
                        selectedBg === bg.id ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded border border-gray-600 flex-shrink-0"
                        style={bg.style.startsWith('linear') ? { backgroundImage: bg.style } : { backgroundColor: bg.style === 'transparent' ? '#888' : bg.style }}
                      />
                      {bg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setConfig({ appMode: 'collab' })}  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors" title="Collab Mode"><Mic size={22} color="white" /></button>
            <button onClick={() => setConfig({ appMode: 'gaming' })}  className="p-3 bg-green-600 hover:bg-green-700 rounded-full transition-colors" title="Gaming Mode"><Video size={22} color="white" /></button>
            <button onClick={() => setChatOpen((o) => !o)}            className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors">{chatOpen ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}</button>
            <button onClick={() => setSettingsOpen(true)}             className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"><Settings size={22} color="white" /></button>
          </div>

          {/* VTuber name — minimal, no status */}
          <div
            className="absolute bottom-4 left-4 bg-black bg-opacity-60 rounded-lg px-4 py-2 transition-opacity duration-700"
            style={{ opacity: controlsVisible ? 1 : 0 }}
          >
            <h1 className="text-xl font-bold text-white">
              🎮 {config.vtuber.name || 'AI VTuber'}
            </h1>
            {config.twitch.enabled && config.twitch.channel && (
              <p className="text-blue-400 text-xs mt-0.5">💬 {config.twitch.channel}</p>
            )}
          </div>
        </div>

        {/* ── Game Board (only when a game is selected) ─────── */}
        {hasGame && (
          <div className={`${gameCols} bg-gray-900 p-4 h-screen overflow-y-auto`}>
            {renderGame()}
          </div>
        )}

        {/* ── Chat Panel ───────────────────────────────────── */}
        {chatOpen && (
          <div className={`${hasGame ? chatCols : 'col-span-3'} h-screen`}>
            <ChatPanel onDirectMessage={handleDirectMessage} />
          </div>
        )}
      </div>

      {/* Message overlay */}
      {overlayMessages.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 max-w-md">
          {overlayMessages.map((msg) => (
            <div key={msg.id} className="bg-black bg-opacity-80 backdrop-blur-sm px-4 py-3 rounded-lg shadow-2xl animate-fade-in mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm" style={{ color: msg.color || '#60a5fa' }}>{msg.username}</span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
