'use client';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Send } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { chatMessages, config } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
            <p className="text-sm mt-2">Twitch messages will appear here</p>
          </div>
        )}

        {chatMessages.map((msg: any) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
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
            placeholder="Messages come from Twitch..."
            disabled
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 rounded border border-gray-600 outline-none"
          />
          <button
            disabled
            className="px-4 py-2 bg-gray-700 text-gray-500 rounded cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Messages starting with ! or containing @ are ignored
        </p>
      </div>
    </div>
  );
};
