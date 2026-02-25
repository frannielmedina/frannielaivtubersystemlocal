'use client';

/**
 * /chat - Página de chat independiente
 * Coloca en: src/app/chat/page.tsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isAI?: boolean;
  color?: string;
}

interface Config {
  vtuber?: { name?: string };
  twitch?: { enabled?: boolean; channel?: string };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

const COLORS = ['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c'];
function pickColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function ChatPage() {
  const [mounted, setMounted]           = useState(false);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState('');
  const [username, setUsername]         = useState('Host');
  const [config, setConfig]             = useState<Config>({});
  const [tab, setTab]                   = useState<'chat' | 'override' | 'commands'>('chat');
  const [overrideText, setOverrideText] = useState('');
  const [overrideSent, setOverrideSent] = useState(false);
  const [filter, setFilter]             = useState<'all' | 'ai' | 'user'>('all');
  const [connected, setConnected]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef  = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const cfg = localStorage.getItem('vtuber-config');
      if (cfg) setConfig(JSON.parse(cfg));
    } catch {}

    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('chat-messages-all');
        if (raw) {
          const msgs: ChatMessage[] = JSON.parse(raw);
          setMessages(msgs);
          if (msgs.length > countRef.current) {
            countRef.current = msgs.length;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
        const ts = localStorage.getItem('app-heartbeat');
        setConnected(!!ts && Date.now() - Number(ts) < 5000);
      } catch {}
    }, 500);

    return () => clearInterval(poll);
  }, [mounted]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      username: username || 'Host',
      message: input.trim(),
      timestamp: Date.now(),
      color: pickColor(username),
    };
    try {
      const q = JSON.parse(localStorage.getItem('chat-send-queue') || '[]');
      q.push(msg);
      localStorage.setItem('chat-send-queue', JSON.stringify(q));
    } catch {}
    setMessages(p => [...p, msg]);
    setInput('');
  }, [input, username]);

  const sendOverride = useCallback(() => {
    if (!overrideText.trim()) return;
    try {
      localStorage.setItem('obs-override', JSON.stringify({
        id: Date.now().toString(),
        text: overrideText.trim(),
        timestamp: Date.now(),
      }));
    } catch {}
    setOverrideSent(true);
    setTimeout(() => setOverrideSent(false), 2500);
    setOverrideText('');
  }, [overrideText]);

  const filtered = messages.filter(m =>
    filter === 'ai' ? m.isAI : filter === 'user' ? !m.isAI : true
  );

  if (!mounted) return null;

  const vtuberName = config.vtuber?.name || 'Miko';

  /* ── Shared style tokens ── */
  const S = {
    bg: '#080810',
    surface: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    accent: '#7c3aed',
    accentLight: 'rgba(124,58,237,0.18)',
    text: '#e2e8f0',
    muted: '#6b7280',
    font: "'DM Mono', 'Fira Code', monospace",
    heading: "'Syne', sans-serif",
  };

  const inputStyle: React.CSSProperties = {
    padding: '11px 14px', borderRadius: 8,
    background: S.surface, border: `1px solid ${S.border}`,
    color: S.text, fontSize: 13, fontFamily: S.font, outline: 'none',
  };

  const btnPrimary = (active = true): React.CSSProperties => ({
    padding: '11px 22px', borderRadius: 8, border: 'none',
    cursor: active ? 'pointer' : 'not-allowed',
    background: active ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : S.surface,
    color: active ? '#fff' : S.muted,
    fontFamily: S.font, fontSize: 13, fontWeight: 600,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: S.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${S.bg};}
        ::-webkit-scrollbar-thumb{background:${S.accent};border-radius:4px;}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .msg-in{animation:slideUp 0.2s ease-out;}
        .blink{animation:blink 1.4s ease-in-out infinite;}
        input:focus,textarea:focus{border-color:rgba(124,58,237,0.6)!important;}
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: '14px 24px', borderBottom: `1px solid ${S.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(124,58,237,0.05)', position: 'sticky', top: 0, zIndex: 99,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>💬</div>
          <div>
            <div style={{ fontFamily: S.heading, fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.02em' }}>
              {vtuberName} · Chat
            </div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>
              {config.twitch?.enabled ? `🟣 twitch/${config.twitch.channel}` : '⚫ Local mode'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11,
            background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${connected ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.25)'}`,
            color: connected ? '#34d399' : '#ef4444',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span className={connected ? 'blink' : ''} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: connected ? '#34d399' : '#ef4444', display: 'inline-block',
            }}/>
            {connected ? 'App online' : 'App offline'}
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11,
            background: S.accentLight, border: `1px solid rgba(124,58,237,0.3)`, color: '#c4b5fd',
          }}>
            {messages.length} msgs
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 65px)' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 200, flexShrink: 0,
          borderRight: `1px solid ${S.border}`,
          padding: '18px 10px',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <p style={{ fontSize: 9, color: '#374151', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>
            Panel
          </p>
          {([
            ['chat',     '💬', 'Chat en vivo'],
            ['override', '📡', 'Override OBS'],
            ['commands', '🎮', 'Comandos'],
          ] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              textAlign: 'left', padding: '9px 12px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontFamily: S.font,
              background: tab === id ? S.accentLight : 'transparent',
              color: tab === id ? '#c4b5fd' : S.muted,
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              {icon} {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 14 }}>
            <p style={{ fontSize: 9, color: '#374151', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>
              Páginas
            </p>
            {[
              ['/', '🏠 Main App'],
              ['/obs', '🎥 OBS Overlay'],
              ['/settings', '⚙️ Settings'],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{
                display: 'block', padding: '7px 12px', borderRadius: 7,
                color: S.muted, textDecoration: 'none', fontSize: 11,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c4b5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = S.muted)}>
                {label}
              </a>
            ))}
          </div>
        </aside>

        {/* ── Content ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* TAB: Chat */}
          {tab === 'chat' && (
            <>
              {/* Filter */}
              <div style={{ padding: '10px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', gap: 7, alignItems: 'center' }}>
                {(['all','ai','user'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: '4px 12px', borderRadius: 20,
                    border: `1px solid ${filter===f ? 'rgba(124,58,237,0.5)' : S.border}`,
                    background: filter===f ? S.accentLight : 'transparent',
                    color: filter===f ? '#c4b5fd' : S.muted,
                    fontSize: 11, cursor: 'pointer', fontFamily: S.font,
                  }}>
                    {f === 'all' ? '🔵 Todos' : f === 'ai' ? '🤖 IA' : '👤 Users'}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={() => { setMessages([]); try { localStorage.removeItem('chat-messages-all'); } catch {} }} style={{
                  padding: '4px 12px', borderRadius: 20,
                  border: '1px solid rgba(239,68,68,0.25)', background: 'transparent',
                  color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: S.font,
                }}>
                  🗑️ Limpiar
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', color: S.muted, marginTop: 60 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💭</div>
                    <div style={{ fontSize: 13 }}>Sin mensajes aún</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#374151' }}>Los mensajes aparecerán aquí en tiempo real</div>
                  </div>
                )}
                {filtered.map(m => (
                  <div key={m.id} className="msg-in" style={{
                    display: 'flex', gap: 10, padding: '9px 13px', borderRadius: 9,
                    background: m.isAI ? 'rgba(124,58,237,0.07)' : S.surface,
                    border: `1px solid ${m.isAI ? 'rgba(124,58,237,0.15)' : S.border}`,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: m.isAI ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : `${m.color || pickColor(m.username)}22`,
                      border: `1px solid ${m.isAI ? 'rgba(124,58,237,0.4)' : (m.color || pickColor(m.username))+'44'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    }}>
                      {m.isAI ? '🤖' : m.username[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: m.color || (m.isAI ? '#c4b5fd' : S.text) }}>{m.username}</span>
                        {m.isAI && <span style={{ fontSize: 9, color: S.accent, background: S.accentLight, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>AI</span>}
                        <span style={{ fontSize: 10, color: '#374151', marginLeft: 'auto' }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#d1d5db', lineHeight: 1.5, wordBreak: 'break-word' }}>{m.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${S.border}`, background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: S.muted }}>Usuario:</span>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    style={{ ...inputStyle, width: 130, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Escribe un mensaje para la VTuber..."
                    style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={sendMessage} disabled={!input.trim()} style={btnPrimary(!!input.trim())}>
                    Enviar ↵
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB: Override */}
          {tab === 'override' && (
            <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
              <h2 style={{ fontFamily: S.heading, fontWeight: 800, fontSize: 22, margin: '0 0 6px', color: '#fff' }}>
                📡 Override OBS Overlay
              </h2>
              <p style={{ color: S.muted, fontSize: 12, margin: '0 0 28px', lineHeight: 1.7 }}>
                Muestra un mensaje personalizado en el overlay de OBS durante 30 segundos.
                Ideal para anuncios, alertas o cualquier aviso al stream sin pasar por la IA.
              </p>

              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 22, marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Mensaje del overlay
                </label>
                <textarea value={overrideText} onChange={e => setOverrideText(e.target.value)}
                  placeholder="Ej: ¡Sígueme en Twitter! 🎀  /  ¡Suscríbete! ❤️"
                  rows={4} style={{
                    ...inputStyle, width: '100%', resize: 'none', lineHeight: 1.6, fontSize: 13,
                  }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button onClick={sendOverride} disabled={!overrideText.trim()} style={{
                    ...btnPrimary(!!overrideText.trim()),
                    background: overrideSent
                      ? 'linear-gradient(135deg,#059669,#047857)'
                      : !!overrideText.trim() ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : S.surface,
                    padding: '11px 28px',
                  }}>
                    {overrideSent ? '✅ ¡Enviado!' : '📡 Mostrar en OBS'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 22 }}>
                <p style={{ fontSize: 10, color: '#374151', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Preview
                </p>
                <div style={{
                  background: '#0d1117', borderRadius: 9, padding: 20,
                  border: '2px dashed rgba(255,255,255,0.06)', minHeight: 100,
                  display: 'flex', alignItems: 'flex-end',
                }}>
                  {overrideText ? (
                    <div style={{
                      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                      borderRadius: 10, padding: '10px 16px',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}>
                      <div style={{ fontSize: 10, color: S.accent, fontWeight: 700, marginBottom: 3 }}>📡 Overlay</div>
                      <p style={{ margin: 0, color: '#fff', fontSize: 12 }}>{overrideText}</p>
                    </div>
                  ) : (
                    <p style={{ color: '#374151', fontSize: 11, margin: 'auto' }}>El texto aparecerá aquí</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Commands */}
          {tab === 'commands' && (
            <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
              <h2 style={{ fontFamily: S.heading, fontWeight: 800, fontSize: 22, margin: '0 0 6px', color: '#fff' }}>
                🎮 Comandos del chat
              </h2>
              <p style={{ color: S.muted, fontSize: 12, margin: '0 0 24px' }}>
                Comandos que tus viewers pueden usar en Twitch.
              </p>

              {[
                { title: '♟️ Ajedrez / Damas', color: '#f59e0b', items: [
                  ['!move E2 to E4', 'Mover pieza de E2 a E4'],
                  ['!move A3 to B4', 'Columnas A-H, filas 1-8'],
                  ['!move C3 to E5', 'Salto en damas (captura)'],
                ]},
                { title: '⚪ Reversi / Othello', color: '#e2e8f0', items: [
                  ['!place D3', 'Colocar pieza en D3'],
                  ['!place A1', 'Cualquier casilla válida'],
                ]},
                { title: '💬 Interacción con la IA', color: '#a78bfa', items: [
                  ['Cualquier texto', 'La IA responde automáticamente'],
                  ['Texto con @ o !', 'Ignorado (excepto comandos de juego)'],
                ]},
              ].map(section => (
                <div key={section.title} style={{
                  marginBottom: 16, background: S.surface,
                  border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden',
                }}>
                  <div style={{ padding: '11px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${S.border}`, fontWeight: 700, fontSize: 13, color: section.color }}>
                    {section.title}
                  </div>
                  {section.items.map(([cmd, desc], i) => (
                    <div key={i} style={{
                      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14,
                      borderBottom: i < section.items.length-1 ? `1px solid ${S.border}` : 'none',
                    }}>
                      <code style={{
                        background: S.accentLight, border: '1px solid rgba(124,58,237,0.25)',
                        padding: '3px 9px', borderRadius: 5, fontSize: 11, color: '#c4b5fd', flexShrink: 0,
                      }}>{cmd}</code>
                      <span style={{ fontSize: 11, color: S.muted }}>{desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
