'use client';

/**
 * /settings - Full configuration page (v2 - English)
 * → src/app/settings/page.tsx
 *
 * NEW: Groq models, CoquiTTS remote, OpenRouter free models,
 *      Twitch without OAuth (anonymous read-only), English UI
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────
interface VtuberConfig {
  vtuber: { name: string; prompt: string; language: string; voiceEnabled: boolean; modelPath: string };
  tts: {
    provider: 'browser' | 'elevenlabs' | 'voicevox' | 'coqui' | 'none';
    elevenlabs: { apiKey: string; voiceId: string };
    voicevox: { endpoint: string; speaker: number };
    coqui: { endpoint: string; speakerId: string; language: string };
    browserVoice: string; browserRate: number; browserPitch: number;
  };
  ai: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'ollama';
    apiKey: string; model: string; temperature: number; maxTokens: number;
    openrouterModel: string; ollamaEndpoint: string; ollamaModel: string;
  };
  game: { current: 'chess' | 'checkers' | 'reversi' | 'none'; difficulty: 'easy' | 'medium' | 'hard'; commentOnMoves: boolean; commentFrequency: number };
  twitch: { enabled: boolean; channel: string; oauth: string; botName: string; respondToAll: boolean; respondToMentions: boolean; ignoredUsers: string; cooldownSeconds: number; anonymousRead: boolean };
  obs: { overlayUrl: string; showChat: boolean; chatLimit: number; transparentBg: boolean };
}

const DEFAULT: VtuberConfig = {
  vtuber: { name: 'Miko', language: 'en', voiceEnabled: true, modelPath: '/models/miko.vrm', prompt: `You are Miko, a friendly and fun VTuber. You play games with your Twitch chat and respond to messages with personality and humor. Keep responses short (1-2 sentences) to sound natural on stream.` },
  tts: {
    provider: 'browser',
    elevenlabs: { apiKey: '', voiceId: '' },
    voicevox: { endpoint: 'http://localhost:50021', speaker: 1 },
    coqui: { endpoint: 'http://localhost:5002', speakerId: 'p226', language: 'en' },
    browserVoice: '', browserRate: 1.0, browserPitch: 1.1,
  },
  ai: { provider: 'openai', apiKey: '', model: 'gpt-4o-mini', temperature: 0.85, maxTokens: 150, openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free', ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3' },
  game: { current: 'chess', difficulty: 'medium', commentOnMoves: true, commentFrequency: 3 },
  twitch: { enabled: false, channel: '', oauth: '', botName: '', respondToAll: true, respondToMentions: true, ignoredUsers: 'nightbot,streamelements,moobot', cooldownSeconds: 5, anonymousRead: true },
  obs: { overlayUrl: '', showChat: true, chatLimit: 5, transparentBg: true },
};

function mergeConfig(saved: Partial<VtuberConfig>): VtuberConfig {
  return {
    vtuber: { ...DEFAULT.vtuber, ...saved.vtuber },
    tts: { ...DEFAULT.tts, ...saved.tts, elevenlabs: { ...DEFAULT.tts.elevenlabs, ...saved.tts?.elevenlabs }, voicevox: { ...DEFAULT.tts.voicevox, ...saved.tts?.voicevox }, coqui: { ...DEFAULT.tts.coqui, ...saved.tts?.coqui } },
    ai: { ...DEFAULT.ai, ...saved.ai },
    game: { ...DEFAULT.game, ...saved.game },
    twitch: { ...DEFAULT.twitch, ...saved.twitch },
    obs: { ...DEFAULT.obs, ...saved.obs },
  };
}

// ─── Style tokens ──────────────────────────────────────────────
const T = {
  bg: '#080810', sf: 'rgba(255,255,255,0.03)', sf2: 'rgba(255,255,255,0.058)',
  bd: 'rgba(255,255,255,0.07)', ac: '#7c3aed', acl: 'rgba(124,58,237,0.18)',
  tx: '#e2e8f0', mu: '#6b7280',
  font: "'DM Mono','Fira Code',monospace", head: "'Syne',sans-serif",
};

// ─── Reusable components ──────────────────────────────────────
const iBase: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  background: T.sf2, border: `1px solid ${T.bd}`,
  color: T.tx, fontSize: 12, fontFamily: T.font, outline: 'none',
};

function TI({ v, s, ph, type='text' }: { v:string; s:(x:string)=>void; ph?:string; type?:string }) {
  return <input type={type} value={v} placeholder={ph} onChange={e=>s(e.target.value)} style={iBase}
    onFocus={e=>(e.target.style.borderColor='rgba(124,58,237,0.6)')}
    onBlur={e=>(e.target.style.borderColor=T.bd)} />;
}
function TA({ v, s, ph, rows=5 }: { v:string; s:(x:string)=>void; ph?:string; rows?:number }) {
  return <textarea rows={rows} value={v} placeholder={ph} onChange={e=>s(e.target.value)}
    style={{ ...iBase, resize:'vertical', lineHeight:1.6 }}
    onFocus={e=>(e.target.style.borderColor='rgba(124,58,237,0.6)')}
    onBlur={e=>(e.target.style.borderColor=T.bd)} />;
}
function Sel({ v, s, opts }: { v:string; s:(x:string)=>void; opts:{value:string;label:string}[] }) {
  return <select value={v} onChange={e=>s(e.target.value)} style={{ ...iBase, appearance:'none', cursor:'pointer', background:'#0f0f1a', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }}>
    {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}
function Tog({ c, s, label, hint }: { c:boolean; s:(x:boolean)=>void; label:string; hint?:string }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
    <div><div style={{ fontSize:12, color:T.tx }}>{label}</div>{hint&&<div style={{ fontSize:10, color:T.mu, marginTop:2 }}>{hint}</div>}</div>
    <button onClick={()=>s(!c)} style={{ width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0, background:c?T.ac:'rgba(255,255,255,0.1)', position:'relative', transition:'background 0.25s' }}>
      <span style={{ position:'absolute', top:3, left:c?21:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', display:'block' }} />
    </button>
  </div>;
}
function Sld({ label, hint, v, s, min, max, step=0.1 }: { label:string; hint?:string; v:number; s:(x:number)=>void; min:number; max:number; step?:number }) {
  return <div>
    {label&&<label style={{ display:'block', fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>{label}{hint&&<span style={{ fontWeight:400, textTransform:'none', color:'#4b5563', marginLeft:8 }}>{hint}</span>}</label>}
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <input type="range" min={min} max={max} step={step} value={v} onChange={e=>s(parseFloat(e.target.value))} style={{ flex:1, accentColor:T.ac }} />
      <code style={{ minWidth:42, textAlign:'center', fontSize:12, background:T.acl, border:'1px solid rgba(124,58,237,0.3)', padding:'2px 8px', borderRadius:5, color:'#c4b5fd' }}>{v}</code>
    </div>
  </div>;
}
function Card({ title, icon, children }: { title:string; icon:string; children:React.ReactNode }) {
  return <div style={{ background:T.sf, border:`1px solid ${T.bd}`, borderRadius:14, overflow:'hidden', marginBottom:18 }}>
    <div style={{ padding:'13px 22px', background:'rgba(255,255,255,0.02)', borderBottom:`1px solid ${T.bd}`, display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontFamily:T.head, fontWeight:700, fontSize:15, color:'#fff' }}>{title}</span>
    </div>
    <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>{children}</div>
  </div>;
}
function F({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return <div>
    <label style={{ display:'block', fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>{label}{hint&&<span style={{ fontWeight:400, textTransform:'none', color:'#4b5563', marginLeft:8 }}>{hint}</span>}</label>
    {children}
  </div>;
}
function Info({ children, color='blue' }: { children:React.ReactNode; color?:string }) {
  const c: Record<string,[string,string]> = { blue:['rgba(96,165,250,0.08)','rgba(96,165,250,0.2)'], yellow:['rgba(245,158,11,0.08)','rgba(245,158,11,0.2)'], purple:['rgba(124,58,237,0.08)','rgba(124,58,237,0.25)'], green:['rgba(52,211,153,0.08)','rgba(52,211,153,0.2)'] };
  const [bg,bd] = c[color]||c.blue;
  return <div style={{ padding:'10px 14px', borderRadius:8, background:bg, border:`1px solid ${bd}`, fontSize:11, lineHeight:1.7, color:'#9ca3af' }}>{children}</div>;
}

// ─── Groq models ──────────────────────────────────────────────
const GROQ_MODELS = [
  { value:'llama-3.3-70b-versatile',    label:'meta-llama/llama-3.3-70b-versatile (⭐ best)' },
  { value:'llama-3.1-8b-instant',       label:'meta-llama/llama-3.1-8b-instant (fast)' },
  { value:'gemma2-9b-it',               label:'google/gemma2-9b-it' },
  { value:'mixtral-8x7b-32768',         label:'mistralai/mixtral-8x7b (large ctx)' },
  { value:'llama-3.1-70b-specdec',      label:'meta-llama/llama-3.1-70b (speculative)' },
  { value:'qwen-qwq-32b',              label:'qwen/qwq-32b (reasoning)' },
];

// ─── OpenRouter free models ────────────────────────────────────
const OR_FREE_MODELS = [
  { value:'meta-llama/llama-3.3-70b-instruct:free',  label:'meta-llama/llama-3.3-70b-instruct (free ⭐)' },
  { value:'meta-llama/llama-3.1-8b-instruct:free',   label:'meta-llama/llama-3.1-8b-instant (free, fast)' },
  { value:'google/gemma-2-9b-it:free',               label:'google/gemma-2-9b-it (free)' },
  { value:'mistralai/mistral-7b-instruct:free',      label:'mistralai/mistral-7b (free)' },
  { value:'microsoft/phi-3-mini-128k-instruct:free', label:'microsoft/phi-3-mini (free, 128k ctx)' },
  { value:'openchat/openchat-7b:free',               label:'openchat/openchat-7b (free)' },
  { value:'nousresearch/hermes-3-llama-3.1-405b:free', label:'nousresearch/hermes-3-405b (free)' },
  { value:'custom',                                   label:'Custom model string...' },
];

type Tab = 'vtuber'|'tts'|'ai'|'game'|'twitch'|'obs';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [cfg, setCfg]         = useState<VtuberConfig>(DEFAULT);
  const [tab, setTab]         = useState<Tab>('vtuber');
  const [saved, setSaved]     = useState(false);
  const [customOR, setCustomOR] = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    try { const r = localStorage.getItem('vtuber-config'); if (r) setCfg(mergeConfig(JSON.parse(r))); } catch {}
  }, [mounted]);

  function up<K extends keyof VtuberConfig>(sec: K, vals: Partial<VtuberConfig[K]>) {
    setCfg(p => ({ ...p, [sec]: { ...(p[sec] as object), ...vals } }));
  }
  function upN<K extends keyof VtuberConfig>(sec: K, nested: string, vals: object) {
    setCfg(p => ({ ...p, [sec]: { ...(p[sec] as object), [nested]: { ...((p[sec] as any)[nested] as object), ...vals } } }));
  }

  const save = useCallback(() => {
    try {
      localStorage.setItem('vtuber-config', JSON.stringify(cfg));
      localStorage.setItem('config-updated', String(Date.now()));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  }, [cfg]);

  if (!mounted) return null;

  const tabs: [Tab, string, string][] = [
    ['vtuber','🎭','VTuber'],['tts','🎙️','TTS / Voice'],['ai','🤖','AI / LLM'],
    ['game','♟️','Game'],['twitch','🟣','Twitch'],['obs','🎥','OBS'],
  ];

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.tx, fontFamily:T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${T.bg};}::-webkit-scrollbar-thumb{background:${T.ac};border-radius:4px;}
        select option{background:#0f0f1a;}
        input:focus,textarea:focus,select:focus{border-color:rgba(124,58,237,0.6)!important;}
      `}</style>

      {/* Header */}
      <header style={{ padding:'14px 24px', borderBottom:`1px solid ${T.bd}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(124,58,237,0.05)', position:'sticky', top:0, zIndex:99 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚙️</div>
          <div>
            <div style={{ fontFamily:T.head, fontWeight:800, fontSize:17, color:'#fff', letterSpacing:'-0.02em' }}>Settings</div>
            <div style={{ fontSize:10, color:T.mu, marginTop:1 }}>VTuber AI Stream System</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {[['/', '🏠'], ['/chat','💬'], ['/obs','🎥']].map(([href, icon]) => (
            <a key={href} href={href} style={{ width:32, height:32, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:14, background:T.sf, border:`1px solid ${T.bd}`, color:'inherit' }}>{icon}</a>
          ))}
          <button onClick={save} style={{ padding:'9px 22px', borderRadius:8, border:'none', cursor:'pointer', background: saved?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'#fff', fontFamily:T.font, fontSize:12, fontWeight:700, transition:'all 0.25s', minWidth:130 }}>
            {saved ? '✅ Saved!' : '💾 Save all'}
          </button>
        </div>
      </header>

      <div style={{ display:'flex', height:'calc(100vh - 65px)' }}>
        {/* Sidebar */}
        <aside style={{ width:190, flexShrink:0, borderRight:`1px solid ${T.bd}`, padding:'18px 10px', display:'flex', flexDirection:'column', gap:3 }}>
          <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Sections</p>
          {tabs.map(([id, icon, label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ textAlign:'left', padding:'9px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:T.font, background:tab===id?T.acl:'transparent', color:tab===id?'#c4b5fd':T.mu, fontSize:12, display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              {icon} {label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ borderTop:`1px solid ${T.bd}`, paddingTop:14 }}>
            <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Pages</p>
            {[['/', '🏠 Main App'],['/chat','💬 Chat'],['/obs','🎥 OBS']].map(([href, label]) => (
              <a key={href} href={href} style={{ display:'block', padding:'7px 12px', borderRadius:7, color:T.mu, textDecoration:'none', fontSize:11 }}
                onMouseEnter={e=>(e.currentTarget.style.color='#c4b5fd')} onMouseLeave={e=>(e.currentTarget.style.color=T.mu)}>{label}</a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>

          {/* ── VTuber ── */}
          {tab==='vtuber' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎭 VTuber Personality</h2>
            <Card title="Identity" icon="✨">
              <F label="Name"><TI v={cfg.vtuber.name} s={v=>up('vtuber',{name:v})} ph="Miko" /></F>
              <F label="VRM Model Path" hint="relative to /public">
                <TI v={cfg.vtuber.modelPath} s={v=>up('vtuber',{modelPath:v})} ph="/models/miko.vrm" />
              </F>
              <F label="Language">
                <Sel v={cfg.vtuber.language} s={v=>up('vtuber',{language:v})} opts={[
                  {value:'en',label:'🇺🇸 English'},{value:'es',label:'🇪🇸 Spanish'},
                  {value:'ja',label:'🇯🇵 Japanese'},{value:'zh',label:'🇨🇳 Chinese'},
                  {value:'pt',label:'🇧🇷 Portuguese'},{value:'ko',label:'🇰🇷 Korean'},
                ]} />
              </F>
              <Tog c={cfg.vtuber.voiceEnabled} s={v=>up('vtuber',{voiceEnabled:v})} label="Voice enabled" hint="Use TTS to speak responses aloud" />
            </Card>
            <Card title="System Prompt" icon="📝">
              <F label="Personality instructions" hint="Sent before every chat message">
                <TA v={cfg.vtuber.prompt} s={v=>up('vtuber',{prompt:v})} rows={8} ph="You are Miko, a friendly VTuber..." />
              </F>
              <Info color="yellow">💡 <strong>Tip:</strong> Keep the prompt concise to save tokens. Mention the current game, preferred language, and key personality traits. Max ~200 words recommended.</Info>
            </Card>
          </>}

          {/* ── TTS ── */}
          {tab==='tts' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎙️ Text-to-Speech</h2>
            <Card title="TTS Provider" icon="🔊">
              <F label="Voice engine">
                <Sel v={cfg.tts.provider} s={v=>up('tts',{provider:v as any})} opts={[
                  {value:'browser',    label:'🌐 Web Speech API (free, built-in)'},
                  {value:'elevenlabs', label:'⚡ ElevenLabs (realistic, API key required)'},
                  {value:'voicevox',   label:'🎌 VoiceVox (Japanese, local server)'},
                  {value:'coqui',      label:'🐸 Coqui TTS (remote/local, voice clone)'},
                  {value:'none',       label:'🔇 No voice'},
                ]} />
              </F>
            </Card>

            {cfg.tts.provider==='browser' && <Card title="Web Speech API" icon="🌐">
              <F label="Voice name" hint="Leave blank for default"><TI v={cfg.tts.browserVoice} s={v=>up('tts',{browserVoice:v})} ph="Google US English / Microsoft David..." /></F>
              <Sld label="Rate" v={cfg.tts.browserRate} s={v=>up('tts',{browserRate:v})} min={0.5} max={2} step={0.05} hint="0.5=slow, 2=fast" />
              <Sld label="Pitch" v={cfg.tts.browserPitch} s={v=>up('tts',{browserPitch:v})} min={0.5} max={2} step={0.05} hint="1=normal, higher=more anime" />
              <Info color="blue">To see available voices open browser console:<br /><code style={{color:'#c4b5fd'}}>speechSynthesis.getVoices().map(v =&gt; v.name)</code></Info>
            </Card>}

            {cfg.tts.provider==='elevenlabs' && <Card title="ElevenLabs" icon="⚡">
              <F label="API Key" hint="elevenlabs.io → Profile → API Keys"><TI v={cfg.tts.elevenlabs.apiKey} s={v=>upN('tts','elevenlabs',{apiKey:v})} type="password" ph="sk_..." /></F>
              <F label="Voice ID" hint="Copy from ElevenLabs voice editor URL"><TI v={cfg.tts.elevenlabs.voiceId} s={v=>upN('tts','elevenlabs',{voiceId:v})} ph="EXAVITQu4vr4xnSDxMaL" /></F>
              <Info color="purple">Recommended voices: <strong>Bella</strong>, <strong>Rachel</strong>, <strong>Domi</strong>. Voice ID is in the URL of the voice editor page.</Info>
            </Card>}

            {cfg.tts.provider==='voicevox' && <Card title="VoiceVox" icon="🎌">
              <F label="Server endpoint" hint="VoiceVox must be running locally"><TI v={cfg.tts.voicevox.endpoint} s={v=>upN('tts','voicevox',{endpoint:v})} ph="http://localhost:50021" /></F>
              <F label="Speaker ID">
                <Sel v={String(cfg.tts.voicevox.speaker)} s={v=>upN('tts','voicevox',{speaker:parseInt(v)})} opts={[
                  {value:'1',label:'1 - Zundamon'},{value:'3',label:'3 - Metan'},{value:'8',label:'8 - Sayo'},
                  {value:'13',label:'13 - Mei'},{value:'2',label:'2 - Shikoku Metan'},
                ]} />
              </F>
            </Card>}

            {cfg.tts.provider==='coqui' && <Card title="🐸 Coqui TTS (Remote)" icon="🐸">
              <F label="Server endpoint" hint="Colab/server URL (see Colab notebook)">
                <TI v={cfg.tts.coqui.endpoint} s={v=>upN('tts','coqui',{endpoint:v})} ph="https://xxxx.ngrok-free.app" />
              </F>
              <F label="Speaker ID / Voice" hint="For multi-speaker models">
                <TI v={cfg.tts.coqui.speakerId} s={v=>upN('tts','coqui',{speakerId:v})} ph="p226 / your_clone / default" />
              </F>
              <F label="Language">
                <Sel v={cfg.tts.coqui.language} s={v=>upN('tts','coqui',{language:v})} opts={[
                  {value:'en',label:'English'},{value:'es',label:'Spanish'},
                  {value:'ja',label:'Japanese (+ pypinyin/cutlet)'},{value:'zh',label:'Chinese (+ pypinyin)'},
                  {value:'fr',label:'French'},{value:'de',label:'German'},
                  {value:'pt',label:'Portuguese'},{value:'ko',label:'Korean'},
                ]} />
              </F>
              <div style={{ display:'flex', gap:10 }}>
                <a href="https://colab.research.google.com" target="_blank" style={{ flex:1, padding:'10px 0', borderRadius:8, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#fbbf24', textDecoration:'none', fontSize:12, fontFamily:T.font, textAlign:'center', display:'block' }}>
                  📓 Open Google Colab
                </a>
                <button onClick={async()=>{
                  try{const r=await fetch(`${cfg.tts.coqui.endpoint}/api/tts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Hello from VTuber system!',speaker_id:cfg.tts.coqui.speakerId,language:cfg.tts.coqui.language})});alert(r.ok?`✅ Connected! Status ${r.status}`:`❌ Error ${r.status}`);}catch(e){alert('❌ Cannot reach server. Check URL and ngrok.');}
                }} style={{ flex:1, padding:'10px 0', borderRadius:8, background:T.acl, border:`1px solid rgba(124,58,237,0.3)`, color:'#c4b5fd', cursor:'pointer', fontSize:12, fontFamily:T.font }}>
                  🧪 Test Connection
                </button>
              </div>
              <Info color="green">
                🐸 Coqui TTS supports: voice cloning, multilingual, Japanese (cutlet romanization), Chinese (pypinyin). Run the included Google Colab notebook to start the remote server, then paste the ngrok URL above.
              </Info>
            </Card>}
          </>}

          {/* ── AI / LLM ── */}
          {tab==='ai' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🤖 AI / Language Model</h2>
            <Card title="Provider" icon="🧠">
              <F label="AI Provider">
                <Sel v={cfg.ai.provider} s={v=>up('ai',{provider:v as any})} opts={[
                  {value:'openai',     label:'💚 OpenAI (GPT-4o, GPT-4o-mini...)'},
                  {value:'anthropic',  label:'🟠 Anthropic (Claude 3.5...)'},
                  {value:'groq',       label:'⚡ Groq (ultra-fast inference, free tier)'},
                  {value:'openrouter', label:'🌐 OpenRouter (multi-model, free models)'},
                  {value:'ollama',     label:'🦙 Ollama (local, Llama3, Mistral...)'},
                ]} />
              </F>
            </Card>

            {cfg.ai.provider==='openai' && <Card title="OpenAI" icon="💚">
              <F label="API Key" hint="platform.openai.com → API Keys"><TI v={cfg.ai.apiKey} s={v=>up('ai',{apiKey:v})} type="password" ph="sk-..." /></F>
              <F label="Model">
                <Sel v={cfg.ai.model} s={v=>up('ai',{model:v})} opts={[
                  {value:'gpt-4o-mini',   label:'gpt-4o-mini (fast & cheap ⭐)'},
                  {value:'gpt-4o',        label:'gpt-4o (best quality)'},
                  {value:'gpt-3.5-turbo', label:'gpt-3.5-turbo (cheapest)'},
                ]} />
              </F>
            </Card>}

            {cfg.ai.provider==='anthropic' && <Card title="Anthropic / Claude" icon="🟠">
              <F label="API Key" hint="console.anthropic.com → API Keys"><TI v={cfg.ai.apiKey} s={v=>up('ai',{apiKey:v})} type="password" ph="sk-ant-..." /></F>
              <F label="Model">
                <Sel v={cfg.ai.model} s={v=>up('ai',{model:v})} opts={[
                  {value:'claude-3-5-haiku-20241022',  label:'claude-3-5-haiku (fast ⭐)'},
                  {value:'claude-3-5-sonnet-20241022', label:'claude-3-5-sonnet (balanced)'},
                  {value:'claude-opus-4-6',            label:'claude-opus-4.6 (best)'},
                ]} />
              </F>
            </Card>}

            {cfg.ai.provider==='groq' && <Card title="⚡ Groq" icon="⚡">
              <F label="API Key" hint="console.groq.com → API Keys">
                <TI v={cfg.ai.apiKey} s={v=>up('ai',{apiKey:v})} type="password" ph="gsk_..." />
              </F>
              <F label="Model">
                <Sel v={cfg.ai.model} s={v=>up('ai',{model:v})} opts={GROQ_MODELS} />
              </F>
              <Info color="green">
                ⚡ <strong>Groq</strong> provides ultra-fast inference (often 200–500 tokens/s) — perfect for real-time VTuber responses. Free tier available at <a href="https://console.groq.com" target="_blank" style={{color:'#c4b5fd'}}>console.groq.com</a>.
                <br /><strong>Recommended:</strong> llama-3.3-70b-versatile for quality, llama-3.1-8b-instant for speed.
              </Info>
            </Card>}

            {cfg.ai.provider==='openrouter' && <Card title="🌐 OpenRouter" icon="🌐">
              <F label="API Key" hint="openrouter.ai → Keys (free to create)"><TI v={cfg.ai.apiKey} s={v=>up('ai',{apiKey:v})} type="password" ph="sk-or-v1-..." /></F>
              <F label="Free Models">
                <Sel v={cfg.ai.openrouterModel === 'custom' ? 'custom' : (OR_FREE_MODELS.find(m=>m.value===cfg.ai.openrouterModel) ? cfg.ai.openrouterModel : 'custom')}
                  s={v=>{ if(v!=='custom') up('ai',{openrouterModel:v}); else up('ai',{openrouterModel:''}); }}
                  opts={OR_FREE_MODELS} />
              </F>
              {(!OR_FREE_MODELS.find(m=>m.value===cfg.ai.openrouterModel&&m.value!=='custom') || cfg.ai.openrouterModel==='') && (
                <F label="Custom model string" hint="format: provider/model-name">
                  <TI v={cfg.ai.openrouterModel} s={v=>up('ai',{openrouterModel:v})} ph="openai/gpt-4o-mini" />
                </F>
              )}
              <Info color="blue">
                🆓 Free models marked with <code style={{color:'#c4b5fd'}}>:free</code> have no cost but may be rate-limited. For production, paid models are more reliable.<br />
                Browse all models at <a href="https://openrouter.ai/models" target="_blank" style={{color:'#c4b5fd'}}>openrouter.ai/models</a>.
              </Info>
            </Card>}

            {cfg.ai.provider==='ollama' && <Card title="Ollama (local)" icon="🦙">
              <F label="Endpoint"><TI v={cfg.ai.ollamaEndpoint} s={v=>up('ai',{ollamaEndpoint:v})} ph="http://localhost:11434" /></F>
              <F label="Model"><TI v={cfg.ai.ollamaModel} s={v=>up('ai',{ollamaModel:v})} ph="llama3" /></F>
              <Info color="green">Recommended models: <code style={{color:'#c4b5fd'}}>llama3</code>, <code style={{color:'#c4b5fd'}}>mistral</code>, <code style={{color:'#c4b5fd'}}>gemma2</code>, <code style={{color:'#c4b5fd'}}>qwen2.5</code></Info>
            </Card>}

            <Card title="Generation Parameters" icon="⚙️">
              <Sld label="Temperature" v={cfg.ai.temperature} s={v=>up('ai',{temperature:v})} min={0} max={1.5} step={0.05} hint="0=deterministic, 1.5=very creative" />
              <Sld label="Max tokens" v={cfg.ai.maxTokens} s={v=>up('ai',{maxTokens:v})} min={50} max={500} step={10} hint="more=longer responses" />
            </Card>
          </>}

          {/* ── Game ── */}
          {tab==='game' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>♟️ Interactive Game</h2>
            <Card title="Current Game" icon="🎮">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {([['chess','♟️','Chess','!move E2 E4'],['checkers','⚫','Checkers','!move C3 D4'],['reversi','⚪','Reversi','!place D3'],['none','🚫','No game','Chat only']] as const).map(([v,icon,label,cmd])=>(
                  <button key={v} onClick={()=>{ up('game',{current:v}); try{localStorage.setItem('obs-game-state',JSON.stringify({game:v})); localStorage.setItem('config-updated',String(Date.now()));}catch{} }} style={{ padding:'14px 16px', borderRadius:10, border:`1px solid ${cfg.game.current===v?'rgba(124,58,237,0.5)':T.bd}`, cursor:'pointer', background:cfg.game.current===v?T.acl:T.sf2, color:cfg.game.current===v?'#c4b5fd':T.mu, textAlign:'left', fontFamily:T.font, transition:'all 0.2s' }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:cfg.game.current===v?T.tx:T.mu }}>{label}</div>
                    <div style={{ fontSize:10, marginTop:2 }}><code style={{ color:'#7c3aed', background:'rgba(124,58,237,0.1)', padding:'1px 5px', borderRadius:3 }}>{cmd}</code></div>
                  </button>
                ))}
              </div>
              {cfg.game.current!=='none' && <>
                <F label="AI Difficulty">
                  <Sel v={cfg.game.difficulty} s={v=>up('game',{difficulty:v as any})} opts={[
                    {value:'easy',label:'🟢 Easy (AI makes mistakes)'},{value:'medium',label:'🟡 Medium (balanced)'},{value:'hard',label:'🔴 Hard (best AI)'},
                  ]} />
                </F>
                <Info color="blue">
                  The game board is shown in the OBS overlay (bottom-right corner). Chat viewers use commands like <code style={{color:'#c4b5fd'}}>!move E2 E4</code> or <code style={{color:'#c4b5fd'}}>!place D3</code> to play.
                </Info>
              </>}
            </Card>
            {cfg.game.current!=='none' && <Card title="VTuber Commentary" icon="💬">
              <Tog c={cfg.game.commentOnMoves} s={v=>up('game',{commentOnMoves:v})} label="Comment on moves" hint="VTuber will react to chat plays" />
              {cfg.game.commentOnMoves && <Sld label="Comment every N moves" v={cfg.game.commentFrequency} s={v=>up('game',{commentFrequency:v})} min={1} max={10} step={1} />}
            </Card>}
          </>}

          {/* ── Twitch ── */}
          {tab==='twitch' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🟣 Twitch Integration</h2>
            <Card title="Connection" icon="🔌">
              <Tog c={cfg.twitch.enabled} s={v=>up('twitch',{enabled:v})} label="Enable Twitch" hint="Read chat from your channel in real time" />
              {cfg.twitch.enabled && <>
                <F label="Channel name" hint="Just the channel name, no @">
                  <TI v={cfg.twitch.channel} s={v=>up('twitch',{channel:v})} ph="mikovtuber" />
                </F>
                <Tog c={cfg.twitch.anonymousRead} s={v=>up('twitch',{anonymousRead:v})} label="Anonymous read-only mode (recommended)" hint="Connect without OAuth — reads chat only, no bot replies in Twitch chat" />
                {!cfg.twitch.anonymousRead && <>
                  <F label="OAuth Token" hint="Optional: only needed to send bot replies in Twitch chat">
                    <TI v={cfg.twitch.oauth} s={v=>up('twitch',{oauth:v})} type="password" ph="oauth:xxxxxxxxxx (optional)" />
                  </F>
                  <F label="Bot username" hint="Your Twitch username for the bot">
                    <TI v={cfg.twitch.botName} s={v=>up('twitch',{botName:v})} ph="mikovtuber" />
                  </F>
                  <Info color="yellow">
                    🔐 <strong>How to get OAuth token (optional):</strong><br />
                    1. Go to <a href="https://twitchapps.com/tmi/" target="_blank" style={{color:'#c4b5fd'}}>twitchapps.com/tmi</a> → Connect<br />
                    2. Copy the token (starts with <code>oauth:</code>)<br />
                    3. Paste it above — stored only on this device
                  </Info>
                </>}
                {cfg.twitch.anonymousRead && (
                  <Info color="green">
                    ✅ <strong>Anonymous mode:</strong> Connects to Twitch IRC as an anonymous viewer. Reads all chat messages without needing OAuth. The VTuber AI will respond via TTS/overlay but won't post messages in Twitch chat. <strong>This is the recommended setup.</strong>
                  </Info>
                )}
              </>}
            </Card>
            {cfg.twitch.enabled && <Card title="Behavior" icon="⚡">
              <Tog c={cfg.twitch.respondToAll} s={v=>up('twitch',{respondToAll:v})} label="Respond to all messages" hint="If off, only responds to mentions" />
              <Tog c={cfg.twitch.respondToMentions} s={v=>up('twitch',{respondToMentions:v})} label="Always respond to mentions" hint={`@${cfg.vtuber.name} always gets a response`} />
              <Sld label="Response cooldown" v={cfg.twitch.cooldownSeconds} s={v=>up('twitch',{cooldownSeconds:v})} min={1} max={30} step={1} hint="seconds between responses" />
              <F label="Ignored users" hint="comma-separated">
                <TI v={cfg.twitch.ignoredUsers} s={v=>up('twitch',{ignoredUsers:v})} ph="nightbot,streamelements,moobot" />
              </F>
            </Card>}
          </>}

          {/* ── OBS ── */}
          {tab==='obs' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎥 OBS Overlay</h2>
            <Card title="App URL" icon="🔗">
              <F label="Deployed app URL" hint="Vercel / Netlify / Railway">
                <TI v={cfg.obs.overlayUrl} s={v=>up('obs',{overlayUrl:v})} ph="https://your-app.vercel.app" />
              </F>
              {cfg.obs.overlayUrl && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px 14px', borderRadius:8, background:T.acl, border:'1px solid rgba(124,58,237,0.25)' }}>
                  {[['/obs','🎭 VRM + Game Board'],['/chat','💬 Chat Panel'],['/settings','⚙️ Settings']].map(([path, label]) => {
                    const url = cfg.obs.overlayUrl + path;
                    return <div key={path} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:T.mu, flexShrink:0, minWidth:130 }}>{label}:</span>
                      <code style={{ flex:1, background:T.sf2, border:`1px solid ${T.bd}`, padding:'4px 9px', borderRadius:5, fontSize:11, color:'#c4b5fd', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</code>
                      <button onClick={()=>navigator.clipboard.writeText(url)} style={{ padding:'4px 9px', borderRadius:5, border:`1px solid ${T.bd}`, background:T.sf, cursor:'pointer', fontSize:10, color:T.mu, fontFamily:T.font, flexShrink:0 }}>Copy</button>
                    </div>;
                  })}
                </div>
              )}
            </Card>
            <Card title="Overlay Options" icon="🖥️">
              <Tog c={cfg.obs.showChat} s={v=>up('obs',{showChat:v})} label="Show chat messages" hint="Last N messages shown over the model" />
              {cfg.obs.showChat && <Sld label="Visible message count" v={cfg.obs.chatLimit} s={v=>up('obs',{chatLimit:v})} min={1} max={10} step={1} />}
              <Tog c={cfg.obs.transparentBg} s={v=>up('obs',{transparentBg:v})} label="Transparent background" hint="Disable for debug (black background)" />
            </Card>
            <Card title="OBS Setup Instructions" icon="📋">
              <div style={{ display:'flex', flexDirection:'column', gap:9, fontSize:11, lineHeight:1.8 }}>
                {[
                  ['1','Sources → + → Browser Source'],
                  ['2', `URL: ${cfg.obs.overlayUrl||'https://your-app.vercel.app'}/obs`],
                  ['3','Width: 1920 · Height: 1080'],
                  ['4','Custom CSS: body { background: transparent !important; margin: 0; }'],
                  ['5','Enable "Shutdown source when not visible"'],
                  ['6','Use "Interact" mode to drag model or scroll to zoom'],
                ].map(([n,text])=>(
                  <div key={n} style={{ display:'flex', gap:10 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:T.acl, border:'1px solid rgba(124,58,237,0.4)', color:'#c4b5fd', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{n}</span>
                    <span style={{ paddingTop:2, color: n==='2'?'#c4b5fd':'#9ca3af' }}>{text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>}

          <div style={{ marginTop:8, display:'flex', justifyContent:'flex-end' }}>
            <button onClick={save} style={{ padding:'12px 32px', borderRadius:10, border:'none', cursor:'pointer', background:saved?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'#fff', fontFamily:T.font, fontSize:13, fontWeight:700, transition:'all 0.25s', minWidth:160 }}>
              {saved ? '✅ Configuration saved!' : '💾 Save configuration'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
