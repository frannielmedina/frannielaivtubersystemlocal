'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { X, Save, Upload, Download, FileUp } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Model options for each provider
const AI_MODELS = {
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Latest, Recommended)' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Fast)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  openrouter: [
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { value: 'google/gemini-pro', label: 'Gemini Pro' },
    { value: 'mistralai/mixtral-8x7b-instruct', label: 'Mixtral 8x7B' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large (Latest)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-small-latest', label: 'Mistral Small' },
    { value: 'open-mistral-7b', label: 'Open Mistral 7B' },
  ],
  perplexity: [
    { value: 'llama-3.1-sonar-large-128k-online', label: 'Sonar Large 128K (Online)' },
    { value: 'llama-3.1-sonar-small-128k-online', label: 'Sonar Small 128K (Online)' },
    { value: 'llama-3.1-sonar-large-128k-chat', label: 'Sonar Large 128K (Chat)' },
    { value: 'llama-3.1-sonar-small-128k-chat', label: 'Sonar Small 128K (Chat)' },
  ],
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { config, gameState, setConfig, setGameState } = useStore();
  const [localConfig, setLocalConfig] = useState(config);
  const vrmInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  // Update localConfig when config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = () => {
    console.log('💾 Guardando configuración:', localConfig);
    
    // Update global config
    setConfig(localConfig);
    
    // Save to localStorage
    localStorage.setItem('vtuber-config', JSON.stringify(localConfig));
    console.log('✅ Configuración guardada en localStorage');
    
    // Close panel
    onClose();
    
    // Force reload to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleGameChange = (game: 'chess' | 'checkers' | 'reversi') => {
    setGameState({ currentGame: game, winner: null, moveHistory: [] });
    setLocalConfig({ ...localConfig });
  };

  const handleVRMUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const blob = new Blob([event.target?.result as ArrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      setLocalConfig({
        ...localConfig,
        vtuber: {
          ...localConfig.vtuber,
          modelPath: url,
        },
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const blob = new Blob([event.target?.result as ArrayBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      setLocalConfig({
        ...localConfig,
        tts: {
          ...localConfig.tts,
          cloneVoicePath: url,
        },
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveConfig = () => {
    const configJSON = JSON.stringify(localConfig, null, 2);
    const blob = new Blob([configJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localConfig.vtuber.name || 'vtuber'}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedConfig = JSON.parse(event.target?.result as string);
        setLocalConfig(loadedConfig);
        alert('Configuration loaded successfully! Click Save to apply.');
      } catch (error) {
        alert('Error loading configuration file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const currentModels = AI_MODELS[localConfig.ai.provider as keyof typeof AI_MODELS] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
          >
            <X size={24} color="white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* VTuber Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🎭 VTuber Settings</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">VTuber Name</label>
                <input
                  type="text"
                  value={localConfig.vtuber.name || 'Miko'}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      vtuber: { ...localConfig.vtuber, name: e.target.value },
                    })
                  }
                  placeholder="Enter VTuber name"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">VRM Model</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.vtuber.modelPath}
                    readOnly
                    placeholder="No model loaded"
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 text-sm"
                  />
                  <button
                    onClick={() => vrmInputRef.current?.click()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white transition-colors"
                  >
                    <Upload size={16} /> Load VRM
                  </button>
                  <input
                    ref={vrmInputRef}
                    type="file"
                    accept=".vrm"
                    onChange={handleVRMUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a .vrm file from VRoid Studio or VRoid Hub
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Scale: {localConfig.vtuber.scale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={localConfig.vtuber.scale}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      vtuber: { ...localConfig.vtuber, scale: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Game Selection */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🎮 Game Selection</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleGameChange('chess')}
                className={`p-4 rounded border-2 transition-all ${
                  gameState.currentGame === 'chess'
                    ? 'border-purple-500 bg-purple-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-4xl mb-2">♟️</div>
                <div className="text-white font-semibold">Chess</div>
              </button>
              <button
                onClick={() => handleGameChange('checkers')}
                className={`p-4 rounded border-2 transition-all ${
                  gameState.currentGame === 'checkers'
                    ? 'border-purple-500 bg-purple-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-4xl mb-2">⚫</div>
                <div className="text-white font-semibold">Checkers</div>
              </button>
              <button
                onClick={() => handleGameChange('reversi')}
                className={`p-4 rounded border-2 transition-all ${
                  gameState.currentGame === 'reversi'
                    ? 'border-purple-500 bg-purple-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-4xl mb-2">⚪</div>
                <div className="text-white font-semibold">Reversi</div>
              </button>
            </div>
          </section>

          {/* AI Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🤖 AI Configuration</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Provider</label>
                <select
                  value={localConfig.ai.provider}
                  onChange={(e) => {
                    const provider = e.target.value as any;
                    const defaultModel = AI_MODELS[provider as keyof typeof AI_MODELS]?.[0]?.value || '';
                    setLocalConfig({
                      ...localConfig,
                      ai: { 
                        ...localConfig.ai, 
                        provider,
                        model: defaultModel 
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                >
                  <option value="groq">Groq (Recommended - Free)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="mistral">Mistral AI</option>
                  <option value="perplexity">Perplexity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Model</label>
                <select
                  value={localConfig.ai.model}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      ai: { ...localConfig.ai, model: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                >
                  {currentModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">API Key</label>
                <input
                  type="text"
                  value={localConfig.ai.apiKey}
                  onChange={(e) => {
                    console.log('🔑 API Key actualizada:', e.target.value.substring(0, 10) + '...');
                    setLocalConfig({
                      ...localConfig,
                      ai: { ...localConfig.ai, apiKey: e.target.value },
                    });
                  }}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {localConfig.ai.provider === 'groq' && 'Get free API key at: console.groq.com/keys'}
                  {localConfig.ai.provider === 'openrouter' && 'Get API key at: openrouter.ai'}
                  {localConfig.ai.provider === 'mistral' && 'Get API key at: console.mistral.ai'}
                  {localConfig.ai.provider === 'perplexity' && 'Get API key at: perplexity.ai'}
                </p>
                {localConfig.ai.apiKey && (
                  <p className="text-xs text-green-400 mt-1">
                    ✅ API Key: {localConfig.ai.apiKey.substring(0, 10)}... ({localConfig.ai.apiKey.length} chars)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">System Prompt</label>
                <textarea
                  value={localConfig.ai.systemPrompt}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      ai: { ...localConfig.ai, systemPrompt: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
              </div>
            </div>
          </section>

          {/* TTS Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🔊 Text-to-Speech</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.tts.enabled}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, enabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Enable TTS</span>
              </label>

              <div>
                <label className="block text-sm text-gray-300 mb-1">TTS Provider</label>
                <select
                  value={localConfig.tts.provider}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, provider: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                >
                  <option value="webspeech">Web Speech API (Built-in)</option>
                  <option value="coqui-local">Coqui TTS (Local Backend)</option>
                  <option value="elevenlabs">ElevenLabs (Premium)</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.tts.multilingualDetection}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, multilingualDetection: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Multilingual Detection</span>
              </label>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Speed: {localConfig.tts.speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={localConfig.tts.speed}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, speed: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* STT Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🎤 Speech-to-Text</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.stt.enabled}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      stt: { ...localConfig.stt, enabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Enable STT</span>
              </label>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Language</label>
                <select
                  value={localConfig.stt.language}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      stt: { ...localConfig.stt, language: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="es-MX">Spanish (Mexico)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.stt.continuous}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      stt: { ...localConfig.stt, continuous: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Continuous Recognition</span>
              </label>
            </div>
          </section>

          {/* Twitch Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">💬 Twitch Integration</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.twitch.enabled}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      twitch: { ...localConfig.twitch, enabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Enable Twitch</span>
              </label>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Bot Username</label>
                <input
                  type="text"
                  value={localConfig.twitch.username}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      twitch: { ...localConfig.twitch, username: e.target.value.toLowerCase() },
                    })
                  }
                  placeholder="your_bot_username"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Channel to Join</label>
                <input
                  type="text"
                  value={localConfig.twitch.channel}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      twitch: { ...localConfig.twitch, channel: e.target.value.toLowerCase() },
                    })
                  }
                  placeholder="channel_name"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">OAuth Token</label>
                <input
                  type="password"
                  value={localConfig.twitch.token}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      twitch: { ...localConfig.twitch, token: e.target.value },
                    })
                  }
                  placeholder="oauth:..."
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get token at: <a href="https://twitchapps.com/tmi/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">twitchapps.com/tmi</a>
                </p>
              </div>
            </div>
          </section>

          {/* Save/Load Configuration */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">💾 Configuration Management</h3>
            <div className="flex gap-3">
              <button
                onClick={handleSaveConfig}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center gap-2 text-white transition-colors"
              >
                <Download size={20} /> Export Config
              </button>
              <button
                onClick={() => configInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center gap-2 text-white transition-colors"
              >
                <Upload size={20} /> Import Config
              </button>
              <input
                ref={configInputRef}
                type="file"
                accept=".json"
                onChange={handleLoadConfig}
                className="hidden"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2 transition-colors"
          >
            <Save size={20} /> Save & Reload
          </button>
        </div>
      </div>
    </div>
  );
};
