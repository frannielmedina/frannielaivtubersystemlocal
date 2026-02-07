'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, Save } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { config, setConfig, setGameState } = useStore();
  const [localConfig, setLocalConfig] = useState(config);

  if (!isOpen) return null;

  const handleSave = () => {
    setConfig(localConfig);
    onClose();
  };

  const handleGameChange = (game: 'chess' | 'checkers' | 'reversi') => {
    setGameState({ currentGame: game, winner: null, moveHistory: [] });
    setLocalConfig({ ...localConfig });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* Game Selection */}
          <section>
            <h3 className="text-xl font-bold text-white mb-3">🎮 Game Selection</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleGameChange('chess')}
                className={`p-4 rounded border-2 transition-all ${
                  config.gameState?.currentGame === 'chess'
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
                  config.gameState?.currentGame === 'checkers'
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
                  config.gameState?.currentGame === 'reversi'
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
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      ai: { ...localConfig.ai, provider: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                >
                  <option value="groq">Groq (Recommended)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="mistral">Mistral AI</option>
                  <option value="perplexity">Perplexity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={localConfig.ai.apiKey}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      ai: { ...localConfig.ai, apiKey: e.target.value },
                    })
                  }
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                />
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.tts.useClone}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      tts: { ...localConfig.tts, useClone: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-white">Use Voice Clone (requires backend)</span>
              </label>

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

              {localConfig.tts.useClone && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Voice File Path</label>
                  <input
                    type="text"
                    value={localConfig.tts.cloneVoicePath || ''}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        tts: { ...localConfig.tts, cloneVoicePath: e.target.value },
                      })
                    }
                    placeholder="/path/to/voice.wav"
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                  />
                </div>
              )}

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
                <label className="block text-sm text-gray-300 mb-1">Channel</label>
                <input
                  type="text"
                  value={localConfig.twitch.channel}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      twitch: { ...localConfig.twitch, channel: e.target.value },
                    })
                  }
                  placeholder="your_channel"
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
                  Get token at: https://twitchapps.com/tmi/
                </p>
              </div>
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
            <Save size={20} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
