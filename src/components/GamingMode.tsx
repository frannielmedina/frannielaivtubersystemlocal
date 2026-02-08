'use client';
import React, { useState, useEffect, useRef } from 'react';
import { VTuberScene } from '@/components/VTuberScene';
import { useStore } from '@/store/useStore';
import { X, Monitor, MessageCircle } from 'lucide-react';

interface DisplayedMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  color?: string;
}

export const GamingMode: React.FC = () => {
  const { config, setConfig, chatMessages } = useStore();
  const [displayedMessages, setDisplayedMessages] = useState<DisplayedMessage[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    // Show messages and fade them out after duration
    const latestMessages = chatMessages.slice(-5); // Last 5 messages
    
    setDisplayedMessages(latestMessages.map(msg => ({
      id: msg.id,
      username: msg.username,
      message: msg.message,
      timestamp: msg.timestamp,
      color: msg.color
    })));

    // Remove messages after duration
    const timers = latestMessages.map(msg => {
      return setTimeout(() => {
        setDisplayedMessages(prev => prev.filter(m => m.id !== msg.id));
      }, config.overlay.messageDuration);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [chatMessages, config.overlay.messageDuration]);

  const startCapture = async () => {
    try {
      setCaptureError(null);
      console.log('🎥 Starting screen capture...');

      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture not supported in this browser. Please use Chrome or Edge.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 60 }
        } as any,
        audio: false
      });

      console.log('✅ Screen capture stream obtained:', stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          console.log('✅ Video playing');
          setIsCapturing(true);
        }).catch(err => {
          console.error('❌ Error playing video:', err);
          throw new Error('Failed to play video stream');
        });
      } else {
        throw new Error('Video element not found');
      }

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🛑 Screen capture stopped by user');
        stopCapture();
      });

    } catch (error) {
      console.error('❌ Error starting screen capture:', error);
      
      let errorMessage = 'Screen capture failed. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Screen capture permission denied. Please allow screen sharing and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No screen available to capture.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Screen capture not supported. Please use Chrome or Edge browser.';
        } else {
          errorMessage += error.message;
        }
      }
      
      setCaptureError(errorMessage);
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track stopped:', track.kind);
      });
      videoRef.current.srcObject = null;
      setIsCapturing(false);
      console.log('✅ Screen capture stopped');
    }
  };

  const exitGamingMode = () => {
    stopCapture();
    setConfig({ appMode: null });
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Game Capture / Screen Share */}
      <div className="absolute inset-0">
        {!isCapturing ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center max-w-md px-4">
              <Monitor size={64} className="text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Screen Capture</h2>
              <p className="text-gray-400 mb-4">
                Click "Start Capture" to share your game screen, application, or entire screen
              </p>
              {captureError && (
                <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded text-red-200 text-sm">
                  ⚠️ {captureError}
                </div>
              )}
              <button
                onClick={startCapture}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded text-white font-semibold transition-colors"
              >
                <Monitor size={20} className="inline mr-2" />
                Start Screen Capture
              </button>
              <div className="mt-4 text-xs text-gray-500">
                <p>💡 Make sure to:</p>
                <p>• Use Chrome or Edge browser</p>
                <p>• Allow screen sharing permission</p>
                <p>• Select the window/screen you want to capture</p>
              </div>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            autoPlay
            playsInline
            muted
            style={{
              objectFit: 'contain',
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>

      {/* VTuber in Corner */}
      <div className="absolute bottom-4 right-4 w-80 h-96 rounded-lg overflow-hidden border-4 border-purple-600 shadow-2xl bg-gradient-to-b from-purple-900 to-blue-900">
        <VTuberScene />
      </div>

      {/* Message Overlay */}
      {config.overlay.showMessages && (
        <div className="absolute bottom-4 left-4 space-y-2 max-w-md">
          {displayedMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black bg-opacity-80 backdrop-blur-sm px-4 py-2 rounded-lg animate-fade-in shadow-lg"
              style={{
                animation: 'slideInLeft 0.3s ease-out, fadeOut 0.5s ease-out ' + 
                          ((config.overlay.messageDuration - 500) / 1000) + 's forwards'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={14} className="text-purple-400" />
                <span 
                  className="font-bold text-sm"
                  style={{ color: msg.color || '#60a5fa' }}
                >
                  {msg.username}
                </span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Game Commands Overlay */}
      {config.overlay.showCommands && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <span>🎮</span> Available Commands
          </h3>
          <div className="space-y-1 text-sm text-gray-300">
            <div>• Type in chat to interact with Miko</div>
            <div>• Messages starting with ! are ignored</div>
            <div>• Messages with @ are ignored</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={exitGamingMode}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center gap-2 text-white shadow-lg"
        >
          <X size={20} /> Exit Gaming Mode
        </button>

        {isCapturing && (
          <button
            onClick={stopCapture}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded flex items-center gap-2 text-white shadow-lg"
          >
            <Monitor size={20} /> Stop Capture
          </button>
        )}

        {!isCapturing && (
          <button
            onClick={startCapture}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-white shadow-lg"
          >
            <Monitor size={20} /> Start Capture
          </button>
        )}

        <button
          onClick={() => setConfig({ 
            overlay: { 
              ...config.overlay, 
              showMessages: !config.overlay.showMessages 
            } 
          })}
          className={`px-4 py-2 rounded flex items-center gap-2 text-white shadow-lg ${
            config.overlay.showMessages 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          <MessageCircle size={20} /> 
          {config.overlay.showMessages ? 'Hide' : 'Show'} Messages
        </button>
      </div>

      {/* Status Info */}
      {isCapturing && (
        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black bg-opacity-60 p-4 rounded max-w-xs">
          <h2 className="text-xl font-bold text-white mb-2">🎮 Gaming Mode Active</h2>
          <p className="text-gray-300 text-sm">
            ✅ Screen capture active
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Chat messages appear as overlays and Miko is ready to interact!
          </p>
        </div>
      )}
    </div>
  );
};
