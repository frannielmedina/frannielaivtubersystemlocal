'use client';

/**
 * /chat - Chat control panel (v2 - English)
 * → src/app/chat/page.tsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage { id: string; username: string; message: string; timestamp: number; isAI?: boolean; color?: string; }
interface Config { vtuber?: { name?: string }; twitch?: { enabled?: boolean; channel?: string } }

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`;
}
const COLORS = ['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c'];
function pickColor(name: string): string { let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))&0xffffffff; return COLORS[Math.abs(h)%COLORS.length]; }

const T = { bg:'#080810', sf:'rgba(255,255,255,0.03)', sf2:'rgba(255,255,255,0.058)', bd:'rgba(255,255,255,0.07)', ac:'#7c3aed', acl:'rgba(124,58,237,0.18)', tx:'#e2e8f0', mu:'#6b7280', font:"'DM Mono','Fira Code',monospace", head:"'Syne',sans-serif" };

export default function ChatPage() {
  const [mounted, setMounted]           = useState(false);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState('');
  const [username, setUsername]         = useState('Host');
  const [config, setConfig]             = useState<Config>({});
  const [tab, setTab]                   = useState<'chat'|'override'|'commands'>('chat');
  const [overrideText, setOverrideText] = useState('');
  const [overrideSent, setOverrideSent] = useState(false);
  const [filter, setFilter]             = useState<'all'|'ai'|'user'>('all');
  const [connected, setConnected]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef  = useRef(0);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    try { const c = localStorage.getItem('vtuber-config'); if (c) setConfig(JSON.parse(c)); } catch {}
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('chat-messages-all');
        if (raw) {
          const msgs: ChatMessage[] = JSON.parse(raw);
          setMessages(msgs);
          if (msgs.length > countRef.current) {
            countRef.current = msgs.length;
            setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 50);
          }
        }
        const ts = localStorage.getItem('app-heartbeat');
        setConnected(!!ts && Date.now()-Number(ts)<5000);
      } catch {}
    }, 500);
    return () => clearInterval(poll);
  }, [mounted]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const msg: ChatMessage = { id: Date.now().toString(), username: username||'Host', message: input.trim(), timestamp: Date.now(), color: pickColor(username) };
    try { const q = JSON.parse(localStorage.getItem('chat-send-queue')||'[]'); q.push(msg); localStorage.setItem('chat-send-queue', JSON.stringify(q)); } catch {}
    setMessages(p => [...p, msg]);
    setInput('');
  }, [input, username]);

  const sendOverride = useCallback(() => {
    if (!overrideText.trim()) return;
    try { localStorage.setItem('obs-override', JSON.stringify({ id: Date.now().toString(), text: overrideText.trim(), timestamp: Date.now() })); } catch {}
    setOverrideSent(true);
    setTimeout(() => setOverrideSent(false), 2500);
    setOverrideText('');
  }, [overrideText]);

  const filtered = messages.filter(m => filter==='ai'?m.isAI:filter==='user'?!m.isAI:true);

  if (!mounted) return null;

  const iStyle: React.CSSProperties = { padding:'10px 13px', borderRadius:8, background:T.sf2, border:`1px solid ${T.bd}`, color:T.tx, fontSize:12, fontFamily:T.font, outline:'none' };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.tx, fontFamily:T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${T.bg};}::-webkit-scrollbar-thumb{background:${T.ac};border-radius:4px;}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .msg-in{animation:slideUp 0.2s ease-out;}
        input:focus,textarea:focus{border-color:rgba(124,58,237,0.6)!important;}
      `}</style>

      <header style={{ padding:'14px 24px', borderBottom:`1px solid ${T.bd}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(124,58,237,0.05)', position:'sticky', top:0, zIndex:99 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>💬</div>
          <div>
            <div style={{ fontFamily:T.head, fontWeight:800, fontSize:17, color:'#fff', letterSpacing:'-0.02em' }}>{config.vtuber?.name||'VTuber'} · Chat</div>
            <div style={{ fontSize:10, color:T.mu, marginTop:1 }}>{config.twitch?.enabled ? `🟣 twitch/${config.twitch.channel}` : '⚫ Local mode'}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, background:connected?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.08)', border:`1px solid ${connected?'rgba(52,211,153,0.3)':'rgba(239,68,68,0.25)'}`, color:connected?'#34d399':'#ef4444', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:connected?'#34d399':'#ef4444', display:'inline-block', animation:connected?'blink 1.4s ease-in-out infinite':'none' }} />
            {connected ? 'App online' : 'App offline'}
          </span>
          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, background:T.acl, border:'1px solid rgba(124,58,237,0.3)', color:'#c4b5fd' }}>{messages.length} msgs</span>
        </div>
      </header>

      <div style={{ display:'flex', height:'calc(100vh - 65px)' }}>
        <aside style={{ width:200, flexShrink:0, borderRight:`1px solid ${T.bd}`, padding:'18px 10px', display:'flex', flexDirection:'column', gap:3 }}>
          <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Panel</p>
          {([['chat','💬','Live Chat'],['override','📡','OBS Override'],['commands','🎮','Commands']] as const).map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ textAlign:'left', padding:'9px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:T.font, background:tab===id?T.acl:'transparent', color:tab===id?'#c4b5fd':T.mu, fontSize:12, display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              {icon} {label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ borderTop:`1px solid ${T.bd}`, paddingTop:14 }}>
            <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Pages</p>
            {[['/', '🏠 Main App'],['/obs','🎥 OBS Overlay'],['/settings','⚙️ Settings']].map(([href, label])=>(
              <a key={href} href={href} style={{ display:'block', padding:'7px 12px', borderRadius:7, color:T.mu, textDecoration:'none', fontSize:11 }}
                onMouseEnter={e=>(e.currentTarget.style.color='#c4b5fd')} onMouseLeave={e=>(e.currentTarget.style.color=T.mu)}>{label}</a>
            ))}
          </div>
        </aside>

        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {tab==='chat' && <>
            {/* Filter bar */}
            <div style={{ padding:'10px 18px', borderBottom:`1px solid ${T.bd}`, display:'flex', gap:7, alignItems:'center' }}>
              {(['all','ai','user'] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:'4px 12px', borderRadius:20, border:`1px solid ${filter===f?'rgba(124,58,237,0.5)':T.bd}`, background:filter===f?T.acl:'transparent', color:filter===f?'#c4b5fd':T.mu, fontSize:11, cursor:'pointer', fontFamily:T.font }}>
                  {f==='all'?'🔵 All':f==='ai'?'🤖 AI':'👤 Users'}
                </button>
              ))}
              <div style={{ flex:1 }} />
              <button onClick={()=>{setMessages([]);try{localStorage.removeItem('chat-messages-all');}catch{}}} style={{ padding:'4px 12px', borderRadius:20, border:'1px solid rgba(239,68,68,0.25)', background:'transparent', color:'#ef4444', fontSize:11, cursor:'pointer', fontFamily:T.font }}>🗑️ Clear</button>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:7 }}>
              {filtered.length===0 && (
                <div style={{ textAlign:'center', color:T.mu, marginTop:60 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>💭</div>
                  <div style={{ fontSize:13 }}>No messages yet</div>
                  <div style={{ fontSize:11, marginTop:4, color:'#374151' }}>Messages will appear here in real time</div>
                </div>
              )}
              {filtered.map(m=>(
                <div key={m.id} className="msg-in" style={{ display:'flex', gap:10, padding:'9px 13px', borderRadius:9, background:m.isAI?'rgba(124,58,237,0.07)':T.sf, border:`1px solid ${m.isAI?'rgba(124,58,237,0.15)':T.bd}` }}>
                  <div style={{ width:30, height:30, borderRadius:7, flexShrink:0, background:m.isAI?'linear-gradient(135deg,#7c3aed,#ec4899)':`${m.color||pickColor(m.username)}22`, border:`1px solid ${m.isAI?'rgba(124,58,237,0.4)':(m.color||pickColor(m.username))+'44'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                    {m.isAI?'🤖':m.username[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                      <span style={{ fontWeight:600, fontSize:12, color:m.color||(m.isAI?'#c4b5fd':T.tx) }}>{m.username}</span>
                      {m.isAI&&<span style={{ fontSize:9, color:T.ac, background:T.acl, padding:'1px 5px', borderRadius:4, fontWeight:700 }}>AI</span>}
                      <span style={{ fontSize:10, color:'#374151', marginLeft:'auto' }}>{timeAgo(m.timestamp)}</span>
                    </div>
                    <p style={{ margin:0, fontSize:12, color:'#d1d5db', lineHeight:1.5, wordBreak:'break-word' }}>{m.message}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'14px 18px', borderTop:`1px solid ${T.bd}`, background:'rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:T.mu }}>Username:</span>
                <input value={username} onChange={e=>setUsername(e.target.value)} style={{ ...iStyle, width:130, fontSize:11 }} />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Send a message to the VTuber..." style={{ ...iStyle, flex:1 }} />
                <button onClick={sendMessage} disabled={!input.trim()} style={{ padding:'10px 20px', borderRadius:8, border:'none', cursor:input.trim()?'pointer':'not-allowed', background:input.trim()?'linear-gradient(135deg,#7c3aed,#5b21b6)':T.sf, color:input.trim()?'#fff':T.mu, fontFamily:T.font, fontSize:12, fontWeight:600, transition:'all 0.2s' }}>
                  Send ↵
                </button>
              </div>
            </div>
          </>}

          {tab==='override' && (
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 6px', color:'#fff' }}>📡 OBS Override</h2>
              <p style={{ color:T.mu, fontSize:12, margin:'0 0 26px', lineHeight:1.7 }}>Display a custom announcement in the OBS overlay for 30 seconds — bypasses AI and chat. Good for shoutouts, announcements, or alerts.</p>
              <div style={{ background:T.sf, border:`1px solid ${T.bd}`, borderRadius:12, padding:22, marginBottom:18 }}>
                <label style={{ display:'block', fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Overlay message</label>
                <textarea value={overrideText} onChange={e=>setOverrideText(e.target.value)} placeholder="e.g. Follow me on Twitter! 🎀  /  Subscriptions just opened! ❤️" rows={4}
                  style={{ width:'100%', padding:'10px 13px', borderRadius:8, background:'rgba(255,255,255,0.055)', border:`1px solid ${T.bd}`, color:T.tx, fontSize:12, fontFamily:T.font, outline:'none', resize:'none', lineHeight:1.6 }} />
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                  <button onClick={sendOverride} disabled={!overrideText.trim()} style={{ padding:'10px 26px', borderRadius:8, border:'none', cursor:overrideText.trim()?'pointer':'not-allowed', background:overrideSent?'linear-gradient(135deg,#059669,#047857)':overrideText.trim()?'linear-gradient(135deg,#7c3aed,#5b21b6)':T.sf, color:overrideText.trim()?'#fff':T.mu, fontFamily:T.font, fontSize:12, fontWeight:700, transition:'all 0.2s' }}>
                    {overrideSent ? '✅ Sent to overlay!' : '📡 Show in OBS'}
                  </button>
                </div>
              </div>
              <div style={{ background:T.sf, border:`1px solid ${T.bd}`, borderRadius:12, padding:22 }}>
                <p style={{ fontSize:10, color:'#374151', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>Preview</p>
                <div style={{ background:'#0d1117', borderRadius:9, padding:20, border:'2px dashed rgba(255,255,255,0.06)', minHeight:100, display:'flex', alignItems:'flex-end' }}>
                  {overrideText ? (
                    <div style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', borderRadius:10, padding:'10px 16px', border:'1px solid rgba(124,58,237,0.3)' }}>
                      <div style={{ fontSize:10, color:T.ac, fontWeight:700, marginBottom:3 }}>📡 ANNOUNCEMENT</div>
                      <p style={{ margin:0, color:'#fff', fontSize:12 }}>{overrideText}</p>
                    </div>
                  ) : <p style={{ color:'#374151', fontSize:11, margin:'auto' }}>Text will appear here</p>}
                </div>
              </div>
            </div>
          )}

          {tab==='commands' && (
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 6px', color:'#fff' }}>🎮 Chat Commands</h2>
              <p style={{ color:T.mu, fontSize:12, margin:'0 0 24px' }}>Commands your viewers can use in Twitch chat.</p>
              {[
                { title:'♟️ Chess / Checkers', color:'#f59e0b', items:[['!move E2 E4','Move piece from E2 to E4'],['!move A3 B4','Columns A-H, rows 1-8'],['!move C3 E5','Jump in checkers (capture)']] },
                { title:'⚪ Reversi / Othello', color:'#e2e8f0', items:[['!place D3','Place piece at D3'],['!place A1','Any valid cell']] },
                { title:'💬 AI Chat', color:'#a78bfa', items:[['Any text','AI responds automatically'],['@ or ! prefix','Ignored (except game commands)']] },
              ].map(section=>(
                <div key={section.title} style={{ marginBottom:16, background:T.sf, border:`1px solid ${T.bd}`, borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'11px 18px', background:'rgba(255,255,255,0.02)', borderBottom:`1px solid ${T.bd}`, fontWeight:700, fontSize:13, color:section.color }}>{section.title}</div>
                  {section.items.map(([cmd,desc],i)=>(
                    <div key={i} style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:14, borderBottom:i<section.items.length-1?`1px solid ${T.bd}`:'none' }}>
                      <code style={{ background:T.acl, border:'1px solid rgba(124,58,237,0.25)', padding:'3px 9px', borderRadius:5, fontSize:11, color:'#c4b5fd', flexShrink:0 }}>{cmd}</code>
                      <span style={{ fontSize:11, color:T.mu }}>{desc}</span>
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
