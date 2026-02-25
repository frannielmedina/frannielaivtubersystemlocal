'use client';

/**
 * OBSLinkButton - Botón para copiar el link de OBS y compartir mensajes al overlay
 * 
 * Añade este componente en src/components/OBSLinkButton.tsx
 * Luego importa y usa en src/app/page.tsx junto a los otros botones
 */

import React, { useState, useEffect } from 'react';

interface OBSLinkButtonProps {
  /** Pass current chat messages so they sync to /obs page */
  chatMessages?: Array<{
    id: string;
    username: string;
    message: string;
    timestamp: number;
    color?: string;
    isAI?: boolean;
  }>;
}

export const OBSLinkButton: React.FC<OBSLinkButtonProps> = ({ chatMessages = [] }) => {
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Sync the last 5 messages to localStorage so /obs page can read them
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const last5 = chatMessages.slice(-5);
      localStorage.setItem('obs-messages', JSON.stringify(last5));
    } catch {}
  }, [chatMessages]);

  const getOBSUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/obs`;
  };

  const copyLink = () => {
    const url = getOBSUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      {/* Main OBS button */}
      <button
        onClick={() => setShowInfo(o => !o)}
        className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
        title="OBS Browser Source"
      >
        {/* OBS-like camera icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M20 4H16.83L15 2H9L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" />
        </svg>
      </button>

      {/* Info popup */}
      {showInfo && (
        <div
          className="absolute right-0 top-14 z-50 w-80 shadow-2xl"
          style={{
            background: '#111827',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-bold text-sm">OBS Browser Source</span>
          </div>

          {/* URL display */}
          <div
            className="mb-3 p-3 rounded-lg font-mono text-xs break-all"
            style={{ background: '#1f2937', color: '#93c5fd', border: '1px solid #374151' }}
          >
            {getOBSUrl()}
          </div>

          {/* Copy button */}
          <button
            onClick={copyLink}
            className="w-full py-2 rounded-lg font-semibold text-sm mb-3 transition-all"
            style={{
              background: copied ? '#16a34a' : '#dc2626',
              color: 'white',
            }}
          >
            {copied ? '✅ ¡Copiado!' : '📋 Copiar Link'}
          </button>

          {/* Open in new tab */}
          <a
            href={getOBSUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 rounded-lg font-semibold text-sm text-center mb-4 transition-colors"
            style={{ background: '#374151', color: '#d1d5db' }}
          >
            🔗 Abrir Preview
          </a>

          {/* Instructions */}
          <div style={{ borderTop: '1px solid #374151', paddingTop: 12 }}>
            <p className="text-xs text-gray-400 font-semibold mb-2">📺 Cómo configurar en OBS:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Fuentes → <span className="text-gray-300">+</span> → <span className="text-gray-300">Navegador</span></li>
              <li>URL: pega el link de arriba</li>
              <li>Ancho/Alto: 1920 × 1080</li>
              <li>CSS personalizado:<br />
                <code className="text-green-400 text-xs">body &#123; background: transparent !important; margin: 0; &#125;</code>
              </li>
              <li>Marcar <span className="text-gray-300">"Detener cuando no visible"</span></li>
            </ol>
            <p className="text-xs text-blue-400 mt-2">
              💡 Usa <strong>Interact</strong> en OBS para arrastrar el modelo y hacer zoom con el scroll.
            </p>
            <p className="text-xs text-purple-400 mt-1">
              ✨ Los mensajes del chat aparecen automáticamente en el overlay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
