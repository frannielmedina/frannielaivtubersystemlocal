'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Send } from 'lucide-react';

interface ChatPanelProps {
  onDirectMessage?: (message: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onDirectMessage }) => {
  const { chatMessages, config } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    if (onDirectMessage) {
      onDirectMessage(inputMessage);
    }
    
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="p-4 bg-purple-900 border-b border-purple-700">
        <h2 className="text-xl font-bold text-white">💬 Chat</h2>
        <p className="text-sm text-gray-300">
          {config.twitch.enabled ? `🟢 Connected to ${config.twitch.channel}` : '🔴 Disconnected'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm mt-2">
              {config.twitch.enabled 
                ? 'Twitch messages will appear here' 
                : 'Send a direct message to test!'}
            </p>
          </div>
        )}

        {chatMessages.map((msg: any) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg animate-slide-in-left ${
              msg.isAI ? 'bg-purple-900 bg-opacity-50' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-bold"
                style={{ color: msg.color || (msg.isAI ? '#a855f7' : '#60a5fa') }}
              >
                {msg.username}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-white">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={config.twitch.enabled ? "Direct message (for testing)..." : "Send message to your VTuber..."}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {config.twitch.enabled 
            ? '💡 Messages starting with ! or containing @ are ignored from Twitch'
            : '💬 Direct messaging mode - useful for testing without Twitch'}
        </p>
      </div>
    </div>
  );
};
