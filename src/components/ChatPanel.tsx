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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastMessageCountRef = useRef(chatMessages.length);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only auto-scroll if user is not manually scrolling
    if (!isUserScrolling && chatMessages.length > lastMessageCountRef.current) {
      scrollToBottom();
    }
    
    lastMessageCountRef.current = chatMessages.length;
  }, [chatMessages, isUserScrolling]);

  // Detect if user is scrolling manually
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    if (!isAtBottom) {
      setIsUserScrolling(true);
      
      // Reset after 2 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000);
    } else {
      setIsUserScrolling(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    if (onDirectMessage) {
      onDirectMessage(inputMessage);
    }
    
    setInputMessage('');
    
    // Force scroll to bottom after sending
    setTimeout(() => {
      setIsUserScrolling(false);
      scrollToBottom();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 p-4 bg-purple-900 border-b border-purple-700">
        <h2 className="text-xl font-bold text-white">💬 Chat</h2>
        <p className="text-sm text-gray-300">
          {config.twitch.enabled ? `🟢 Connected to ${config.twitch.channel}` : '🔴 Disconnected'}
        </p>
      </div>

      {/* Messages - Scrollable area with FIXED height */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ 
          height: 0, // Important: Forces flex-1 to work correctly
          minHeight: 0 // Prevents flex child from growing
        }}
      >
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
            className={`p-3 rounded-lg animate-fade-in ${
              msg.isAI ? 'bg-purple-900 bg-opacity-50' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-bold text-sm"
                style={{ color: msg.color || (msg.isAI ? '#a855f7' : '#60a5fa') }}
              >
                {msg.username}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-white text-sm break-words">{msg.message}</p>
          </div>
        ))}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Show "New messages" indicator when user scrolls up */}
      {isUserScrolling && (
        <div className="flex-shrink-0 px-4 py-2 bg-purple-800 border-t border-purple-700">
          <button
            onClick={() => {
              setIsUserScrolling(false);
              scrollToBottom();
            }}
            className="w-full text-center text-sm text-white hover:text-purple-200 transition-colors"
          >
            ↓ New messages - Click to scroll down ↓
          </button>
        </div>
      )}

      {/* Input - Fixed height */}
      <div className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={config.twitch.enabled ? "Direct message (for testing)..." : "Send message to your VTuber..."}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 outline-none focus:border-purple-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors flex-shrink-0"
            aria-label="Send message"
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
