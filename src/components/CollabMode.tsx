'use client';
import React, { useState, useEffect } from 'react';
import { VTuberScene } from '@/components/VTuberScene';
import { useStore } from '@/store/useStore';
import { STTService } from '@/services/STTService';
import { AIService } from '@/services/AIService';
import { TTSService } from '@/services/TTSService';
import { Mic, MicOff, X, Move, RotateCw } from 'lucide-react';

export const CollabMode: React.FC = () => {
  const { config, vtuberPosition, vtuberRotation, setVTuberPosition, setVTuberRotation, setConfig, addChatMessage, setAnimation } = useStore();
  const [sttService] = useState(() => new STTService(config.stt));
  const [aiService] = useState(() => new AIService(config.ai));
  const [ttsService] = useState(() => new TTSService(config.tts));
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    sttService.updateConfig(config.stt);
    aiService.updateConfig(config.ai);
    ttsService.updateConfig(config.tts);
  }, [config]);

  const toggleListening = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      sttService.start((text, isFinal) => {
        if (isFinal) {
          handleSpeechInput(text);
          setInterimText('');
        } else {
          setInterimText(text);
        }
      });
      setIsListening(true);
    }
  };

  const handleSpeechInput = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addChatMessage({
      id: Date.now().toString(),
      username: 'You',
      message: text,
      timestamp: Date.now(),
      color: '#60a5fa'
    });

    try {
      // Get AI response
      const response = await aiService.generateResponse([
        { role: 'system', content: config.ai.systemPrompt },
        { role: 'user', content: text }
      ]);

      // Add AI response
      addChatMessage({
        id: (Date.now() + 1).toString(),
        username: 'Miko',
        message: response,
        timestamp: Date.now(),
        isAI: true,
        color: '#9333ea'
      });

      // Speak response
      await ttsService.speak(response);

      // Random reaction
      const reactions = ['wave', 'think', 'heart', 'thumbsup'];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      setAnimation({ type: 'emote', name: randomReaction, duration: 2000 });

    } catch (error) {
      console.error('Error processing speech:', error);
    }
  };

  const exitCollabMode = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
    }
    setConfig({ appMode: null });
  };

  const moveVTuber = (axis: 'x' | 'y' | 'z', delta: number) => {
    const newPos: [number, number, number] = [...vtuberPosition];
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    newPos[axisIndex] += delta;
    setVTuberPosition(newPos);
  };

  const rotateVTuber = (axis: 'x' | 'y' | 'z', delta: number) => {
    const newRot: [number, number, number] = [...vtuberRotation];
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    newRot[axisIndex] += delta;
    setVTuberRotation(newRot);
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* VTuber Scene */}
      <div className="absolute inset-0">
        <VTuberScene />
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-3">
        {/* Exit Button */}
        <button
          onClick={exitCollabMode}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center gap-2 text-white shadow-lg"
        >
          <X size={20} /> Exit Collab Mode
        </button>

        {/* STT Toggle */}
        {config.stt.enabled && (
          <button
            onClick={toggleListening}
            className={`px-4 py-2 rounded flex items-center gap-2 text-white shadow-lg transition-colors ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        )}

        {/* Position Controls */}
        <div className="bg-gray-900 bg-opacity-90 p-4 rounded shadow-lg">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <Move size={16} /> Position
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => moveVTuber('x', -0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">← X</button>
            <button onClick={() => moveVTuber('x', 0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">X →</button>
            <button onClick={() => moveVTuber('y', 0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">↑ Y</button>
            <button onClick={() => moveVTuber('y', -0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Y ↓</button>
            <button onClick={() => moveVTuber('z', 0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Z +</button>
            <button onClick={() => moveVTuber('z', -0.5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Z -</button>
          </div>
        </div>

        {/* Rotation Controls */}
        <div className="bg-gray-900 bg-opacity-90 p-4 rounded shadow-lg">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <RotateCw size={16} /> Rotation
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => rotateVTuber('y', -0.2)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">← Rotate</button>
            <button onClick={() => rotateVTuber('y', 0.2)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Rotate →</button>
          </div>
        </div>
      </div>

      {/* STT Status */}
      {isListening && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 bg-opacity-90 px-6 py-3 rounded-full shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">
              {interimText || 'Listening...'}
            </span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 p-4 rounded">
        <h2 className="text-xl font-bold text-white mb-2">🎤 Collab Mode</h2>
        <p className="text-gray-300 text-sm">Talk directly with your AI VTuber!</p>
        {!config.stt.enabled && (
          <p className="text-yellow-400 text-sm mt-2">
            ⚠️ Enable STT in settings to use voice input
          </p>
        )}
      </div>
    </div>
  );
};
