'use client';

/**
 * /settings - Página de configuración completa
 * Coloca en: src/app/settings/page.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';

interface VtuberConfig {
  vtuber: { name: string; prompt: string; language: string; voiceEnabled: boolean };
  tts: {
    provider: 'browser' | 'elevenlabs' | 'voicevox' | 'none';
    elevenlabs: { apiKey: string; voiceId: string };
    voicevox: { endpoint: string; speaker: number };
    browserVoice: string; browserRate: number; browserPitch: number;
  };
  ai: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    apiKey: string; model: string; temperature: number; maxTokens: number;
    openrouterModel: string; ollamaEndpoint: string; ollamaModel: string;
  };
  game: { current: 'chess' | 'checkers' | 'reversi' | 'none'; difficulty: 'easy' | 'medium' | 'hard'; commentOnMoves: boolean; commentFrequency: number };
  twitch: { enabled: boolean; channel: string; oauth: string; botName: string; respondToAll: boolean; respondToMentions: boolean; ignoredUsers: string; cooldownSeconds: number };
  obs: { overlayUrl: string; showChat: boolean; chatLimit: number; transparentBg: boolean };
}

const DEFAULT: VtuberConfig = {
  vtuber: { name: 'Miko', language: 'es', voiceEnabled: true, prompt: `Eres Miko, una VTuber amigable y divertida. Juegas con tu chat de Twitch. Eres entusiasta, un poco torpe, y siempre positiva. Tus respuestas son cortas (1-2 oraciones) y naturales.` },
  tts: { provider: 'browser', elevenlabs: { apiKey: '', voiceId: '' }, voicevox: { endpoint: 'http://localhost:50021', speaker: 1 }, browserVoice: '', browserRate: 1.0, browserPitch: 1.1 },
  ai: { provider: 'openai', apiKey: '', model: 'gpt-4o-mini', temperature: 0.85, maxTokens: 150, openrouterModel: 'openai/gpt-4o-mini', ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3' },
  game: { current: 'chess', difficulty: 'medium', commentOnMoves: true, commentFrequency: 3 },
  twitch: { enabled: false, channel: '', oauth: '', botName: '', respondToAll: true, respondToMentions: true, ignoredUsers: 'nightbot,streamelements,moobot', cooldownSeconds: 5 },
  obs: { overlayUrl: '', showChat: true, chatLimit: 5, transparentBg: true },
};

function merge(saved: Partial<VtuberConfig>): VtuberConfig {
  return {
    vtuber: { ...DEFAULT.vtuber, ...saved.vtuber },
    tts: { ...DEFAULT.tts, ...saved.tts, elevenlabs: { ...DEFAULT.tts.elevenlabs, ...saved.tts?.elevenlabs }, voicevox: { ...DEFAULT.tts.voicevox, ...saved.tts?.voicevox } },
    ai: { ...DEFAULT.ai, ...saved.ai },
    game: { ...DEFAULT.game, ...saved.game },
    twitch: { ...DEFAULT.twitch, ...saved.twitch },
    obs: { ...DEFAULT.obs, ...saved.obs },
  };
}

const T = {
  bg: '#080810', sf: 'rgba(255,255,255,0.03)', sf2: 'rgba(255,255,255,0.055)',
  bd: 'rgba(255,255,255,0.07)', ac: '#7c3aed', acl: 'rgba(124,58,237,0.18)',
  tx: '#e2e8f0', mu: '#6b7280',
  font: "'DM Mono','Fira Code',monospace", head: "'Syne',sans-serif",
};

const iStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  background: T.sf2, border: `1px solid ${T.bd}`,
  color: T.tx, fontSize: 12, fontFamily: T.font, outline: 'none',
};

function TI({ val, set, ph, type='text' }: { val: string; set: (v:string)=>void; ph?: string; type?: string }) {
  return <input type={type} value={val} placeholder={ph} onChange={e=>set(e.target.value)} style={iStyle}
    onFocus={e=>(e.target.style.borderColor='rgba(124,58,237,0.6)')}
    onBlur={e=>(e.target.style.borderColor=T.bd)} />;
}

function TA({ val, set, ph, rows=4 }: { val: string; set:(v:string)=>void; ph?: string; rows?: number }) {
  return <textarea rows={rows} value={val} placeholder={ph} onChange={e=>set(e.target.value)}
    style={{ ...iStyle, resize: 'vertical', lineHeight: 1.6 }}
    onFocus={e=>(e.target.style.borderColor='rgba(124,58,237,0.6)')}
    onBlur={e=>(e.target.style.borderColor=T.bd)} />;
}

function Sel({ val, set, opts }: { val: string; set:(v:string)=>void; opts:{value:string;label:string}[] }) {
  return <select value={val} onChange={e=>set(e.target.value)} style={{
    ...iStyle, appearance: 'none', cursor: 'pointer', background: '#0f0f1a',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  }}>
    {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function Toggle({ checked, set, label, hint }: { checked:boolean; set:(v:boolean)=>void; label:string; hint?:string }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
    <div>
      <div style={{ fontSize:12, color:T.tx }}>{label}</div>
      {hint && <div style={{ fontSize:10, color:T.mu, marginTop:2 }}>{hint}</div>}
    </div>
    <button onClick={()=>set(!checked)} style={{
      width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0,
      background: checked ? T.ac : 'rgba(255,255,255,0.1)', position:'relative', transition:'background 0.25s',
    }}>
      <span style={{ position:'absolute', top:3, left: checked ? 21 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', display:'block' }} />
    </button>
  </div>;
}

function Slider({ label, hint, val, set, min, max, step=0.1 }: { label:string; hint?:string; val:number; set:(v:number)=>void; min:number; max:number; step?:number }) {
  return <div>
    {label && <label style={{ display:'block', fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>{label}{hint && <span style={{ fontWeight:400, textTransform:'none', color:'#4b5563', marginLeft:8 }}>{hint}</span>}</label>}
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(parseFloat(e.target.value))} style={{ flex:1, accentColor:T.ac }} />
      <code style={{ minWidth:42, textAlign:'center', fontSize:12, background:T.acl, border:'1px solid rgba(124,58,237,0.3)', padding:'2px 8px', borderRadius:5, color:'#c4b5fd' }}>{val}</code>
    </div>
  </div>;
}

function Card({ title, icon, children }: { title:string; icon:string; children:React.ReactNode }) {
  return <div style={{ background:T.sf, border:`1px solid ${T.bd}`, borderRadius:14, overflow:'hidden', marginBottom:18 }}>
    <div style={{ padding:'14px 22px', background:'rgba(255,255,255,0.02)', borderBottom:`1px solid ${T.bd}`, display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontFamily:T.head, fontWeight:700, fontSize:15, color:'#fff' }}>{title}</span>
    </div>
    <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>{children}</div>
  </div>;
}

function F({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return <div>
    <label style={{ display:'block', fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>
      {label}{hint && <span style={{ fontWeight:400, textTransform:'none', color:'#4b5563', marginLeft:8 }}>{hint}</span>}
    </label>
    {children}
  </div>;
}

function Info({ children, color='blue' }: { children:React.ReactNode; color?:string }) {
  const colors: Record<string, [string,string]> = {
    blue: ['rgba(96,165,250,0.08)','rgba(96,165,250,0.2)'],
    yellow: ['rgba(245,158,11,0.08)','rgba(245,158,11,0.2)'],
    purple: ['rgba(124,58,237,0.08)','rgba(124,58,237,0.25)'],
    green: ['rgba(52,211,153,0.08)','rgba(52,211,153,0.2)'],
  };
  const [bg,bd] = colors[color] || colors.blue;
  return <div style={{ padding:'10px 14px', borderRadius:8, background:bg, border:`1px solid ${bd}`, fontSize:11, lineHeight:1.7, color:'#9ca3af' }}>{children}</div>;
}

type Tab = 'vtuber'|'tts'|'ai'|'game'|'twitch'|'obs';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [cfg, setCfg] = useState<VtuberConfig>(DEFAULT);
  const [tab, setTab] = useState<Tab>('vtuber');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    try { const r = localStorage.getItem('vtuber-config'); if (r) setCfg(merge(JSON.parse(r))); } catch {}
  }, [mounted]);

  function up<K extends keyof VtuberConfig>(sec: K, vals: Partial<VtuberConfig[K]>) {
    setCfg(p => ({ ...p, [sec]: { ...(p[sec] as object), ...vals } }));
  }
  function upN<K extends keyof VtuberConfig, NK extends keyof VtuberConfig[K]>(sec: K, nested: NK, vals: object) {
    setCfg(p => ({ ...p, [sec]: { ...(p[sec] as object), [nested]: { ...(p[sec][nested] as object), ...vals } } }));
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
    ['vtuber','🎭','VTuber'],['tts','🎙️','TTS / Voz'],['ai','🤖','IA / LLM'],
    ['game','♟️','Juego'],['twitch','🟣','Twitch'],['obs','🎥','OBS'],
  ];

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.tx, fontFamily:T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${T.bg};}::-webkit-scrollbar-thumb{background:${T.ac};border-radius:4px;}
        select option{background:#0f0f1a;}
      `}</style>

      <header style={{ padding:'14px 24px', borderBottom:`1px solid ${T.bd}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(124,58,237,0.05)', position:'sticky', top:0, zIndex:99 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚙️</div>
          <div>
            <div style={{ fontFamily:T.head, fontWeight:800, fontSize:17, color:'#fff', letterSpacing:'-0.02em' }}>Configuración</div>
            <div style={{ fontSize:10, color:T.mu, marginTop:1 }}>VTuber AI Stream System</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {[['/', '🏠'], ['/chat', '💬'], ['/obs', '🎥']].map(([href, icon]) => (
            <a key={href} href={href} style={{ width:32, height:32, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:14, background:T.sf, border:`1px solid ${T.bd}` }}>{icon}</a>
          ))}
          <button onClick={save} style={{ padding:'9px 22px', borderRadius:8, border:'none', cursor:'pointer', background: saved ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'#fff', fontFamily:T.font, fontSize:12, fontWeight:700, transition:'all 0.25s', minWidth:130 }}>
            {saved ? '✅ ¡Guardado!' : '💾 Guardar todo'}
          </button>
        </div>
      </header>

      <div style={{ display:'flex', height:'calc(100vh - 65px)' }}>
        <aside style={{ width:190, flexShrink:0, borderRight:`1px solid ${T.bd}`, padding:'18px 10px', display:'flex', flexDirection:'column', gap:3 }}>
          <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Secciones</p>
          {tabs.map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ textAlign:'left', padding:'9px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:T.font, background: tab===id ? T.acl : 'transparent', color: tab===id ? '#c4b5fd' : T.mu, fontSize:12, display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              {icon} {label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ borderTop:`1px solid ${T.bd}`, paddingTop:14 }}>
            <p style={{ fontSize:9, color:'#374151', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Páginas</p>
            {[['/', '🏠 Main App'], ['/chat', '💬 Chat'], ['/obs', '🎥 OBS']].map(([href, label]) => (
              <a key={href} href={href} style={{ display:'block', padding:'7px 12px', borderRadius:7, color:T.mu, textDecoration:'none', fontSize:11, transition:'color 0.15s' }}
                onMouseEnter={e=>(e.currentTarget.style.color='#c4b5fd')} onMouseLeave={e=>(e.currentTarget.style.color=T.mu)}>{label}</a>
            ))}
          </div>
        </aside>

        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>

          {/* VTuber */}
          {tab==='vtuber' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎭 Personalidad</h2>
            <Card title="Identidad" icon="✨">
              <F label="Nombre"><TI val={cfg.vtuber.name} set={v=>up('vtuber',{name:v})} ph="Miko" /></F>
              <F label="Idioma">
                <Sel val={cfg.vtuber.language} set={v=>up('vtuber',{language:v})} opts={[
                  {value:'es',label:'🇪🇸 Español'},{value:'en',label:'🇺🇸 English'},
                  {value:'ja',label:'🇯🇵 日本語'},{value:'pt',label:'🇧🇷 Português'},
                ]} />
              </F>
              <Toggle checked={cfg.vtuber.voiceEnabled} set={v=>up('vtuber',{voiceEnabled:v})} label="Voz habilitada" hint="Usa TTS para leer respuestas" />
            </Card>
            <Card title="Prompt del sistema" icon="📝">
              <F label="Instrucciones de personalidad" hint="Se envía en cada mensaje">
                <TA val={cfg.vtuber.prompt} set={v=>up('vtuber',{prompt:v})} rows={8} ph="Eres una VTuber amigable llamada..." />
              </F>
              <Info color="yellow">💡 <strong>Tip:</strong> Mantén el prompt corto para ahorrar tokens. Menciona el juego actual, el idioma y los rasgos de personalidad clave. Máximo 200 palabras recomendado.</Info>
            </Card>
          </>}

          {/* TTS */}
          {tab==='tts' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎙️ Text-to-Speech</h2>
            <Card title="Proveedor" icon="🔊">
              <F label="Motor de voz">
                <Sel val={cfg.tts.provider} set={v=>up('tts',{provider:v as any})} opts={[
                  {value:'browser',label:'🌐 Web Speech API (gratis)'},
                  {value:'elevenlabs',label:'⚡ ElevenLabs (realista)'},
                  {value:'voicevox',label:'🎌 VoiceVox (japonés, local)'},
                  {value:'none',label:'🔇 Sin voz'},
                ]} />
              </F>
            </Card>

            {cfg.tts.provider==='browser' && <Card title="Web Speech API" icon="🌐">
              <F label="Voz del navegador" hint="Deja en blanco para default">
                <TI val={cfg.tts.browserVoice} set={v=>up('tts',{browserVoice:v})} ph="Microsoft Sabina Online (Spanish Mexico)" />
              </F>
              <Slider label="Velocidad" val={cfg.tts.browserRate} set={v=>up('tts',{browserRate:v})} min={0.5} max={2} step={0.05} hint="0.5=lento, 2=rápido" />
              <Slider label="Tono (pitch)" val={cfg.tts.browserPitch} set={v=>up('tts',{browserPitch:v})} min={0.5} max={2} step={0.05} hint="1=normal, mayor=más agudo" />
              <Info color="blue">Para ver voces disponibles, abre la consola del navegador: <br /><code style={{color:'#c4b5fd'}}>speechSynthesis.getVoices().map(v =&gt; v.name)</code></Info>
            </Card>}

            {cfg.tts.provider==='elevenlabs' && <Card title="ElevenLabs" icon="⚡">
              <F label="API Key" hint="elevenlabs.io → Profile → API Keys">
                <TI val={cfg.tts.elevenlabs.apiKey} set={v=>upN('tts','elevenlabs',{apiKey:v})} type="password" ph="sk_..." />
              </F>
              <F label="Voice ID">
                <TI val={cfg.tts.elevenlabs.voiceId} set={v=>upN('tts','elevenlabs',{voiceId:v})} ph="EXAVITQu4vr4xnSDxMaL" />
              </F>
              <Info color="purple">Voces recomendadas: <strong>Bella</strong>, <strong>Rachel</strong>, <strong>Domi</strong>. El Voice ID está en el URL del voice editor.</Info>
            </Card>}

            {cfg.tts.provider==='voicevox' && <Card title="VoiceVox" icon="🎌">
              <F label="Endpoint" hint="VoiceVox debe estar corriendo localmente">
                <TI val={cfg.tts.voicevox.endpoint} set={v=>upN('tts','voicevox',{endpoint:v})} ph="http://localhost:50021" />
              </F>
              <F label="Speaker ID">
                <Sel val={String(cfg.tts.voicevox.speaker)} set={v=>upN('tts','voicevox',{speaker:parseInt(v)})} opts={[
                  {value:'1',label:'1 - Zundamon'},{value:'3',label:'3 - Metan'},{value:'8',label:'8 - Sayo'},
                  {value:'13',label:'13 - Mei'},{value:'2',label:'2 - Shikoku Metan'},
                ]} />
              </F>
            </Card>}
          </>}

          {/* AI */}
          {tab==='ai' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🤖 Inteligencia Artificial</h2>
            <Card title="Proveedor" icon="🧠">
              <F label="Motor de IA">
                <Sel val={cfg.ai.provider} set={v=>up('ai',{provider:v as any})} opts={[
                  {value:'openai',label:'💚 OpenAI (GPT-4o...)'},
                  {value:'anthropic',label:'🟠 Anthropic (Claude...)'},
                  {value:'openrouter',label:'🌐 OpenRouter (multi-modelo)'},
                  {value:'ollama',label:'🦙 Ollama (local)'},
                ]} />
              </F>
            </Card>

            {cfg.ai.provider==='openai' && <Card title="OpenAI" icon="💚">
              <F label="API Key"><TI val={cfg.ai.apiKey} set={v=>up('ai',{apiKey:v})} type="password" ph="sk-..." /></F>
              <F label="Modelo">
                <Sel val={cfg.ai.model} set={v=>up('ai',{model:v})} opts={[
                  {value:'gpt-4o-mini',label:'gpt-4o-mini (rápido, barato ⭐)'},
                  {value:'gpt-4o',label:'gpt-4o (mejor calidad)'},
                  {value:'gpt-3.5-turbo',label:'gpt-3.5-turbo (más barato)'},
                ]} />
              </F>
            </Card>}

            {cfg.ai.provider==='anthropic' && <Card title="Anthropic / Claude" icon="🟠">
              <F label="API Key"><TI val={cfg.ai.apiKey} set={v=>up('ai',{apiKey:v})} type="password" ph="sk-ant-..." /></F>
              <F label="Modelo">
                <Sel val={cfg.ai.model} set={v=>up('ai',{model:v})} opts={[
                  {value:'claude-3-5-haiku-20241022',label:'claude-3-5-haiku (rápido ⭐)'},
                  {value:'claude-3-5-sonnet-20241022',label:'claude-3-5-sonnet (balanceado)'},
                  {value:'claude-opus-4-6',label:'claude-opus-4.6 (mejor)'},
                ]} />
              </F>
            </Card>}

            {cfg.ai.provider==='openrouter' && <Card title="OpenRouter" icon="🌐">
              <F label="API Key"><TI val={cfg.ai.apiKey} set={v=>up('ai',{apiKey:v})} type="password" ph="sk-or-v1-..." /></F>
              <F label="Modelo"><TI val={cfg.ai.openrouterModel} set={v=>up('ai',{openrouterModel:v})} ph="openai/gpt-4o-mini" /></F>
              <Info color="blue">Formatos válidos: <code style={{color:'#c4b5fd'}}>openai/gpt-4o-mini</code>, <code style={{color:'#c4b5fd'}}>anthropic/claude-3.5-haiku</code>, <code style={{color:'#c4b5fd'}}>meta-llama/llama-3.1-8b</code></Info>
            </Card>}

            {cfg.ai.provider==='ollama' && <Card title="Ollama (local)" icon="🦙">
              <F label="Endpoint"><TI val={cfg.ai.ollamaEndpoint} set={v=>up('ai',{ollamaEndpoint:v})} ph="http://localhost:11434" /></F>
              <F label="Modelo"><TI val={cfg.ai.ollamaModel} set={v=>up('ai',{ollamaModel:v})} ph="llama3" /></F>
              <Info color="green">Modelos recomendados: <code style={{color:'#c4b5fd'}}>llama3</code>, <code style={{color:'#c4b5fd'}}>mistral</code>, <code style={{color:'#c4b5fd'}}>gemma2</code></Info>
            </Card>}

            <Card title="Parámetros de generación" icon="⚙️">
              <Slider label="Temperatura" val={cfg.ai.temperature} set={v=>up('ai',{temperature:v})} min={0} max={1.5} step={0.05} hint="0=determinístico, 1.5=muy creativo" />
              <Slider label="Max tokens" val={cfg.ai.maxTokens} set={v=>up('ai',{maxTokens:v})} min={50} max={500} step={10} hint="más=respuestas más largas" />
            </Card>
          </>}

          {/* Game */}
          {tab==='game' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>♟️ Juego interactivo</h2>
            <Card title="Juego seleccionado" icon="🎮">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[['chess','♟️','Ajedrez','!move E2 E4'],['checkers','⚫','Damas','!move C3 D4'],['reversi','⚪','Reversi','!place D3'],['none','🚫','Sin juego','Solo chat']] .map(([v,icon,label,cmd])=>(
                  <button key={v} onClick={()=>up('game',{current:v as any})} style={{ padding:'14px 16px', borderRadius:10, border:`1px solid ${cfg.game.current===v ? 'rgba(124,58,237,0.5)' : T.bd}`, cursor:'pointer', background: cfg.game.current===v ? T.acl : T.sf2, color: cfg.game.current===v ? '#c4b5fd' : T.mu, textAlign:'left', fontFamily:T.font, transition:'all 0.2s' }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color: cfg.game.current===v ? T.tx : T.mu }}>{label}</div>
                    <div style={{ fontSize:10, marginTop:2 }}><code style={{ color:'#7c3aed', background:'rgba(124,58,237,0.1)', padding:'1px 5px', borderRadius:3 }}>{cmd}</code></div>
                  </button>
                ))}
              </div>
              {cfg.game.current!=='none' && <F label="Dificultad">
                <Sel val={cfg.game.difficulty} set={v=>up('game',{difficulty:v as any})} opts={[
                  {value:'easy',label:'🟢 Fácil'},{value:'medium',label:'🟡 Medio'},{value:'hard',label:'🔴 Difícil'},
                ]} />
              </F>}
            </Card>
            {cfg.game.current!=='none' && <Card title="Comentarios de la VTuber" icon="💬">
              <Toggle checked={cfg.game.commentOnMoves} set={v=>up('game',{commentOnMoves:v})} label="Comentar movimientos" hint="La VTuber hablará sobre las jugadas" />
              {cfg.game.commentOnMoves && <Slider label="Comentar cada N movimientos" val={cfg.game.commentFrequency} set={v=>up('game',{commentFrequency:v})} min={1} max={10} step={1} />}
            </Card>}
          </>}

          {/* Twitch */}
          {tab==='twitch' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🟣 Twitch</h2>
            <Card title="Conexión" icon="🔌">
              <Toggle checked={cfg.twitch.enabled} set={v=>up('twitch',{enabled:v})} label="Habilitar Twitch" hint="Lee el chat de tu canal en tiempo real" />
              {cfg.twitch.enabled && <>
                <F label="Nombre del canal" hint="Sin @"><TI val={cfg.twitch.channel} set={v=>up('twitch',{channel:v})} ph="mikovtuber" /></F>
                <F label="OAuth Token" hint="twitchapps.com/tmi"><TI val={cfg.twitch.oauth} set={v=>up('twitch',{oauth:v})} type="password" ph="oauth:xxxxxxxxxx" /></F>
                <F label="Bot name / tu usuario"><TI val={cfg.twitch.botName} set={v=>up('twitch',{botName:v})} ph="mikovtuber" /></F>
                <Info color="yellow">
                  🔐 <strong>Pasos para OAuth:</strong><br />
                  1. Ve a <a href="https://twitchapps.com/tmi/" target="_blank" style={{color:'#c4b5fd'}}>twitchapps.com/tmi</a> → Connect<br />
                  2. Copia el token (empieza con <code>oauth:</code>)<br />
                  3. Pégalo arriba — se guarda solo en este dispositivo
                </Info>
              </>}
            </Card>
            {cfg.twitch.enabled && <Card title="Comportamiento" icon="⚡">
              <Toggle checked={cfg.twitch.respondToAll} set={v=>up('twitch',{respondToAll:v})} label="Responder a todos los mensajes" hint="Si está off, solo menciones" />
              <Toggle checked={cfg.twitch.respondToMentions} set={v=>up('twitch',{respondToMentions:v})} label="Siempre responder a mentions" hint={`@${cfg.vtuber.name} siempre recibe respuesta`} />
              <Slider label="Cooldown entre respuestas" val={cfg.twitch.cooldownSeconds} set={v=>up('twitch',{cooldownSeconds:v})} min={1} max={30} step={1} hint="segundos" />
              <F label="Usuarios ignorados" hint="separados por coma"><TI val={cfg.twitch.ignoredUsers} set={v=>up('twitch',{ignoredUsers:v})} ph="nightbot,streamelements" /></F>
            </Card>}
          </>}

          {/* OBS */}
          {tab==='obs' && <>
            <h2 style={{ fontFamily:T.head, fontWeight:800, fontSize:22, margin:'0 0 22px', color:'#fff' }}>🎥 OBS Overlay</h2>
            <Card title="URL de tu app" icon="🔗">
              <F label="URL desplegada" hint="Vercel / Netlify"><TI val={cfg.obs.overlayUrl} set={v=>up('obs',{overlayUrl:v})} ph="https://tu-app.vercel.app" /></F>
              {cfg.obs.overlayUrl && <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px 14px', borderRadius:8, background:T.acl, border:'1px solid rgba(124,58,237,0.25)' }}>
                {[['/obs','🎭 Modelo VRM'],['/chat','💬 Chat panel']].map(([path,label])=>{
                  const url = cfg.obs.overlayUrl + path;
                  return <div key={path} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, color:T.mu, flexShrink:0 }}>{label}:</span>
                    <code style={{ flex:1, background:T.sf2, border:`1px solid ${T.bd}`, padding:'4px 9px', borderRadius:5, fontSize:11, color:'#c4b5fd', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</code>
                    <button onClick={()=>navigator.clipboard.writeText(url)} style={{ padding:'4px 9px', borderRadius:5, border:`1px solid ${T.bd}`, background:T.sf, cursor:'pointer', fontSize:10, color:T.mu, fontFamily:T.font, flexShrink:0 }}>Copiar</button>
                  </div>;
                })}
              </div>}
            </Card>
            <Card title="Overlay" icon="🖥️">
              <Toggle checked={cfg.obs.showChat} set={v=>up('obs',{showChat:v})} label="Mostrar mensajes de chat" />
              {cfg.obs.showChat && <Slider label="Mensajes visibles" val={cfg.obs.chatLimit} set={v=>up('obs',{chatLimit:v})} min={1} max={10} step={1} />}
              <Toggle checked={cfg.obs.transparentBg} set={v=>up('obs',{transparentBg:v})} label="Fondo transparente" hint="Desactiva para debug con fondo negro" />
            </Card>
            <Card title="Instrucciones OBS" icon="📋">
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:11, color:'#9ca3af', lineHeight:1.7 }}>
                {[
                  ['1','Fuentes → + → Fuente de Navegador'],
                  ['2',`URL: ${cfg.obs.overlayUrl || 'https://tu-app.vercel.app'}/obs`],
                  ['3','Ancho: 1920 · Alto: 1080'],
                  ['4','CSS: body { background: transparent !important; margin: 0; }'],
                  ['5','Activar "Apagar fuente cuando no sea visible"'],
                  ['6','Usar "Interactuar" para arrastrar y hacer zoom al modelo'],
                ].map(([n,text])=>(
                  <div key={n} style={{ display:'flex', gap:10 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:T.acl, border:'1px solid rgba(124,58,237,0.4)', color:'#c4b5fd', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{n}</span>
                    <span style={{ paddingTop:2, color: n==='2' ? '#c4b5fd' : '#9ca3af' }}>{text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>}

          <div style={{ marginTop:8, display:'flex', justifyContent:'flex-end' }}>
            <button onClick={save} style={{ padding:'12px 32px', borderRadius:10, border:'none', cursor:'pointer', background: saved ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'#fff', fontFamily:T.font, fontSize:13, fontWeight:700, transition:'all 0.25s', minWidth:160 }}>
              {saved ? '✅ ¡Guardado!' : '💾 Guardar configuración'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
