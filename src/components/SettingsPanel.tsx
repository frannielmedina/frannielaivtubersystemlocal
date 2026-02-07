import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { AIProvider, GameType } from '@/types';
import { X, Save, Play, StopCircle } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { config, setConfig, gameState, setGameState } = useStore();
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    setConfig(localConfig);
    onClose();
  };

  const handleGameChange = (game: GameType) => {
    setGameState({ currentGame: game, winner: null, moveHistory: [] });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">⚙️ Configuración</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Game Selection */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎮 Juego Activo</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['chess', 'checkers', 'reversi'] as GameType[]).map((game) => (
              <button
                key={game || 'none'}
                onClick={() => handleGameChange(game)}
                className={`p-4 rounded-lg font-semibold transition-all ${
                  gameState.currentGame === game
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {game === 'chess' && '♟️ Ajedrez'}
                {game === 'checkers' && '⚫ Damas'}
                {game === 'reversi' && '⚪ Reversi'}
              </button>
            ))}
          </div>
        </section>

        {/* AI Configuration */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🤖 Configuración de IA</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proveedor de IA
              </label>
              <select
                value={localConfig.ai.provider}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  ai: { ...localConfig.ai, provider: e.target.value as AIProvider }
                })}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
              >
                <option value="groq">Groq</option>
                <option value="openrouter">OpenRouter</option>
                <option value="mistral">Mistral AI</option>
                <option value="perplexity">Perplexity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={localConfig.ai.apiKey}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  ai: { ...localConfig.ai, apiKey: e.target.value }
                })}
                placeholder="Ingresa tu API key"
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Modelo
              </label>
              <input
                type="text"
                value={localConfig.ai.model}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  ai: { ...localConfig.ai, model: e.target.value }
                })}
                placeholder="Ej: llama-3.1-70b-versatile"
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={localConfig.ai.systemPrompt}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  ai: { ...localConfig.ai, systemPrompt: e.target.value }
                })}
                rows={4}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {/* TTS Configuration */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🔊 TTS Configuration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Enable TTS
              </label>
              <input
                type="checkbox"
                checked={localConfig.tts.enabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  tts: { ...localConfig.tts, enabled: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Use Voice Clone (Coqui TTS)
              </label>
              <input
                type="checkbox"
                checked={localConfig.tts.useClone}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  tts: { ...localConfig.tts, useClone: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Multilingual Auto-Detection
              </label>
              <input
                type="checkbox"
                checked={localConfig.tts.multilingualDetection}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  tts: { ...localConfig.tts, multilingualDetection: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            {localConfig.tts.useClone && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice File Path
                </label>
                <input
                  type="text"
                  value={localConfig.tts.cloneVoicePath || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    tts: { ...localConfig.tts, cloneVoicePath: e.target.value }
                  })}
                  placeholder="/path/to/voice.wav"
                  className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Speed: {localConfig.tts.speed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={localConfig.tts.speed}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  tts: { ...localConfig.tts, speed: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* STT Configuration */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎤 STT Configuration (Speech-to-Text)</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Enable STT
              </label>
              <input
                type="checkbox"
                checked={localConfig.stt.enabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  stt: { ...localConfig.stt, enabled: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={localConfig.stt.language}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  stt: { ...localConfig.stt, language: e.target.value }
                })}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
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
                <option value="zh-CN">Chinese (Mandarin)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Continuous Recognition
              </label>
              <input
                type="checkbox"
                checked={localConfig.stt.continuous}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  stt: { ...localConfig.stt, continuous: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            <p className="text-xs text-gray-500">
              💡 STT is used in Collab Mode for voice interaction
            </p>
          </div>
        </section>

        {/* Twitch Configuration */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">💬 Configuración de Twitch</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Habilitar Twitch
              </label>
              <input
                type="checkbox"
                checked={localConfig.twitch.enabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  twitch: { ...localConfig.twitch, enabled: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Canal
              </label>
              <input
                type="text"
                value={localConfig.twitch.channel}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  twitch: { ...localConfig.twitch, channel: e.target.value }
                })}
                placeholder="tu_canal"
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token OAuth
              </label>
              <input
                type="password"
                value={localConfig.twitch.token}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  twitch: { ...localConfig.twitch, token: e.target.value }
                })}
                placeholder="oauth:..."
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Save size={20} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
