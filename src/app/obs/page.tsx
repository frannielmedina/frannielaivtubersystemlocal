'use client';

/**
 * /obs - OBS Browser Source Overlay (v2)
 * → src/app/obs/page.tsx
 *
 * NEW: Reads 'vtuber-config' to show current game board in overlay.
 * Polls localStorage every 500ms for: obs-messages, vtuber-config, obs-override, obs-game-state
 */

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface OBSMsg { id: string; username: string; message: string; timestamp: number; color?: string; isAI?: boolean; }
interface OverrideMsg { id: string; text: string; timestamp: number; }
interface GameState {
  game: 'chess' | 'checkers' | 'reversi' | 'none';
  board?: string[][];   // 2D array of piece strings
  fen?: string;         // for chess
  currentTurn?: 'white' | 'black';
  lastMove?: string;
}

// ─── Idle animation ───────────────────────────────────────────
function applyIdle(vrm: VRM, t: number) {
  const h = vrm.humanoid;
  if (!h) return;
  const spine = h.getNormalizedBoneNode('spine');
  const head  = h.getNormalizedBoneNode('head');
  const lUA   = h.getNormalizedBoneNode('leftUpperArm');
  const rUA   = h.getNormalizedBoneNode('rightUpperArm');
  const lLA   = h.getNormalizedBoneNode('leftLowerArm');
  const rLA   = h.getNormalizedBoneNode('rightLowerArm');
  const hips  = h.getNormalizedBoneNode('hips');
  if (spine) spine.rotation.x = Math.sin(t * 0.8) * 0.03;
  if (head)  { head.rotation.y = Math.sin(t * 0.3) * 0.08; head.rotation.x = Math.sin(t * 0.5) * 0.05; }
  if (lUA)   lUA.rotation.z =  1.2 + Math.sin(t * 0.6) * 0.02;
  if (rUA)   rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02;
  if (lLA)   lLA.rotation.z =  0.3;
  if (rLA)   rLA.rotation.z = -0.3;
  if (hips)  hips.position.y = Math.sin(t * 0.5) * 0.01;
}

// ─── VRM Model ────────────────────────────────────────────────
const VRMModel: React.FC<{ modelPath: string; onLoaded?: () => void }> = ({ modelPath, onLoaded }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const loadedRef = useRef(false);
  const blinkRef  = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const groundRef = useRef(0);

  useEffect(() => {
    if (loadedRef.current || !modelPath) return;
    loadedRef.current = true;
    const loader = new GLTFLoader();
    loader.register(p => new VRMLoaderPlugin(p));
    loader.load(modelPath, gltf => {
      const loaded = gltf.userData.vrm as VRM;
      if (!loaded) return;
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      loaded.scene.traverse(o => { o.frustumCulled = false; });
      loaded.scene.rotation.y = Math.PI;
      const h = loaded.humanoid;
      if (h) {
        ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm'].forEach((bone, i) => {
          const node = h.getNormalizedBoneNode(bone as any);
          if (node) node.rotation.z = i < 2 ? (i === 0 ? 1.2 : -1.2) : (i === 2 ? 0.3 : -0.3);
        });
      }
      loaded.scene.position.set(0,0,0);
      loaded.update(0);
      loaded.scene.updateWorldMatrix(true,true);
      const box = new THREE.Box3().setFromObject(loaded.scene);
      groundRef.current = -box.min.y;
      loaded.scene.position.y = groundRef.current;
      setVrm(loaded);
      onLoaded?.();
    }, undefined, err => console.error('VRM load error:', err));
  }, [modelPath]);

  useFrame((state, delta) => {
    if (!vrm) return;
    vrm.scene.position.y = groundRef.current;
    applyIdle(vrm, state.clock.elapsedTime);
    vrm.update(delta);
    const b = blinkRef.current, t = state.clock.elapsedTime;
    if (vrm.expressionManager) {
      if (b.isBlinking) {
        const e = t - b.blinkStart;
        if (e < 0.15) vrm.expressionManager.setValue('blink', Math.sin((e/0.15)*Math.PI));
        else { vrm.expressionManager.setValue('blink', 0); b.isBlinking = false; }
      } else if (t - b.lastBlink > 2 + Math.random() * 3) {
        b.isBlinking = true; b.blinkStart = t; b.lastBlink = t;
      }
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
};

// ─── Mini Board Renderers ─────────────────────────────────────
const CHESS_PIECES: Record<string, string> = {
  K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙',
  k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟',
};

function ChessBoard({ fen, lastMove }: { fen?: string; lastMove?: string }) {
  // Parse FEN or use start position
  const fenPos = fen?.split(' ')[0] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const rows = fenPos.split('/').map(row => {
    const cells: string[] = [];
    for (const c of row) {
      if (/\d/.test(c)) { for (let i=0;i<parseInt(c);i++) cells.push(''); }
      else cells.push(c);
    }
    return cells;
  });

  const cols = ['a','b','c','d','e','f','g','h'];
  const fromSq = lastMove?.slice(0,2);
  const toSq   = lastMove?.slice(2,4);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'flex' }}>
          {row.map((piece, ci) => {
            const sq = cols[ci]+(8-ri);
            const isLight = (ri+ci)%2===0;
            const isFrom  = sq===fromSq;
            const isTo    = sq===toSq;
            const isWhite = piece === piece.toUpperCase() && piece !== '';
            return (
              <div key={ci} style={{
                width:22, height:22,
                background: isTo ? 'rgba(250,204,21,0.7)' : isFrom ? 'rgba(250,204,21,0.4)' : isLight ? 'rgba(240,217,181,0.85)' : 'rgba(181,136,99,0.85)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14,
              }}>
                {piece && <span style={{ textShadow: isWhite ? '0 0 2px #000' : 'none', lineHeight:1 }}>{CHESS_PIECES[piece] || piece}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CheckersBoard({ board, currentTurn }: { board?: string[][]; currentTurn?: string }) {
  const defaultBoard = Array(8).fill(null).map((_, r) =>
    Array(8).fill(null).map((_, c) => {
      if ((r+c)%2===1) {
        if (r<3) return 'b';
        if (r>4) return 'w';
      }
      return '';
    })
  );
  const b = board || defaultBoard;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {b.map((row, ri) => (
        <div key={ri} style={{ display:'flex' }}>
          {row.map((cell, ci) => {
            const isLight = (ri+ci)%2===0;
            return (
              <div key={ci} style={{
                width:22, height:22,
                background: isLight ? 'rgba(240,217,181,0.85)' : 'rgba(100,60,30,0.85)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
              }}>
                {cell==='w' && <span style={{ color:'#fff', textShadow:'0 0 3px #000' }}>⚪</span>}
                {cell==='W' && <span style={{ color:'#fff', textShadow:'0 0 3px #000' }}>👑</span>}
                {cell==='b' && <span style={{ color:'#222', textShadow:'0 0 3px #888' }}>⚫</span>}
                {cell==='B' && <span style={{ color:'#222', textShadow:'0 0 3px #888' }}>♛</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ReversiBoard({ board, currentTurn }: { board?: string[][]; currentTurn?: string }) {
  const defaultBoard = Array(8).fill(null).map((_, r) =>
    Array(8).fill(null).map((_, c) => {
      if ((r===3&&c===3)||(r===4&&c===4)) return 'w';
      if ((r===3&&c===4)||(r===4&&c===3)) return 'b';
      return '';
    })
  );
  const b = board || defaultBoard;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      {b.map((row, ri) => (
        <div key={ri} style={{ display:'flex', gap:1 }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{
              width:21, height:21, borderRadius:2,
              background:'rgba(22,101,52,0.85)',
              border:'1px solid rgba(255,255,255,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:12,
            }}>
              {cell==='w' && '⚪'}{cell==='b' && '⚫'}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GameOverlay({ gameState }: { gameState: GameState }) {
  if (!gameState || gameState.game === 'none') return null;
  return (
    <div style={{
      position:'absolute', bottom:8, right:8,
      background:'rgba(0,0,0,0.82)',
      backdropFilter:'blur(10px)',
      borderRadius:12, padding:'10px 12px',
      border:'1px solid rgba(255,255,255,0.12)',
      pointerEvents:'none',
    }}>
      <div style={{ fontSize:11, color:'#9ca3af', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <span>
          {gameState.game==='chess'    ? '♟️ Chess'   :
           gameState.game==='checkers' ? '⚫ Checkers' : '⚪ Reversi'}
        </span>
        {gameState.currentTurn && (
          <span style={{ color: gameState.currentTurn==='white' ? '#fff' : '#9ca3af' }}>
            {gameState.currentTurn==='white' ? '⬜' : '⬛'} {gameState.currentTurn}
          </span>
        )}
      </div>
      {gameState.game==='chess'    && <ChessBoard    fen={gameState.fen}     lastMove={gameState.lastMove} />}
      {gameState.game==='checkers' && <CheckersBoard board={gameState.board} currentTurn={gameState.currentTurn} />}
      {gameState.game==='reversi'  && <ReversiBoard  board={gameState.board} currentTurn={gameState.currentTurn} />}
      {gameState.lastMove && (
        <div style={{ fontSize:10, color:'#6b7280', marginTop:5, textAlign:'center' }}>
          Last: <span style={{ color:'#c4b5fd' }}>{gameState.lastMove}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main OBS Page ────────────────────────────────────────────
export default function OBSPage() {
  const [mounted, setMounted]         = useState(false);
  const [modelPath, setModelPath]     = useState('/models/miko.vrm');
  const [vtuberName, setVtuberName]   = useState('Miko');
  const [modelScale, setModelScale]   = useState(1.0);
  const [messages, setMessages]       = useState<OBSMsg[]>([]);
  const [override, setOverride]       = useState<OverrideMsg | null>(null);
  const [gameState, setGameState]     = useState<GameState>({ game: 'none' });
  const [loaded, setLoaded]           = useState(false);
  const [position, setPosition]       = useState<[number,number,number]>([0,0.5,0]);
  const [camZ, setCamZ]               = useState(3.2);

  const isDragging = useRef(false);
  const dragStart  = useRef({ x:0, y:0 });
  const posRef     = useRef<[number,number,number]>([0,0.5,0]);
  const overrideId = useRef('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem('vtuber-config');
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg?.vtuber?.modelPath) setModelPath(cfg.vtuber.modelPath);
        if (cfg?.vtuber?.name)      setVtuberName(cfg.vtuber.name);
        if (cfg?.vtuber?.scale)     setModelScale(cfg.vtuber.scale);
        // Load current game from config
        if (cfg?.game?.current && cfg.game.current !== 'none') {
          setGameState(prev => ({ ...prev, game: cfg.game.current }));
        }
      }
    } catch {}

    const poll = setInterval(() => {
      try {
        // Chat messages
        const raw = localStorage.getItem('obs-messages');
        if (raw) setMessages(JSON.parse(raw).slice(-5));

        // Override message
        const ov = localStorage.getItem('obs-override');
        if (ov) {
          const parsed: OverrideMsg = JSON.parse(ov);
          if (parsed.id !== overrideId.current) {
            overrideId.current = parsed.id;
            setOverride(parsed);
            setTimeout(() => setOverride(null), 30000); // 30s timeout
          }
        }

        // Game state (main app writes this)
        const gs = localStorage.getItem('obs-game-state');
        if (gs) setGameState(JSON.parse(gs));

        // Config reload signal
        const upd = localStorage.getItem('config-updated');
        if (upd) {
          const cfg = JSON.parse(localStorage.getItem('vtuber-config') || '{}');
          if (cfg?.vtuber?.modelPath) setModelPath(cfg.vtuber.modelPath);
          if (cfg?.vtuber?.name)      setVtuberName(cfg.vtuber.name);
          if (cfg?.game?.current)     setGameState(prev => ({ ...prev, game: cfg.game.current }));
        }
      } catch {}
    }, 500);

    return () => clearInterval(poll);
  }, [mounted]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.x) * 0.003;
    const dy = -(e.clientY - dragStart.current.y) * 0.003;
    posRef.current = [posRef.current[0]+dx, posRef.current[1]+dy, posRef.current[2]];
    setPosition([...posRef.current]);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp   = useCallback(() => { isDragging.current = false; }, []);
  const onWheel     = useCallback((e: React.WheelEvent) => {
    setCamZ(p => Math.max(1.5, Math.min(6, p + e.deltaY * 0.005)));
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'transparent', cursor: isDragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
    >
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        .msg-fade { animation: fadeIn 0.3s ease-out; }
        .override-in { animation: slideDown 0.4s ease-out; }
      `}</style>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, camZ], fov: 38 }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent', position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1,1,1]}    intensity={0.7} />
        <directionalLight position={[-1,-1,-1]} intensity={0.4} />
        <pointLight       position={[0,2,2]}    intensity={0.5} />
        <Suspense fallback={null}>
          <group position={position} scale={modelScale}>
            <VRMModel modelPath={modelPath} onLoaded={() => setLoaded(true)} />
          </group>
        </Suspense>
      </Canvas>

      {/* Chat messages - bottom left */}
      <div style={{ position:'absolute', bottom:32, left:32, display:'flex', flexDirection:'column', gap:8, maxWidth:360, zIndex:10, pointerEvents:'none' }}>
        {messages.map(m => (
          <div key={m.id} className="msg-fade" style={{
            background:'rgba(0,0,0,0.78)', backdropFilter:'blur(10px)',
            borderRadius:12, padding:'9px 15px',
            border:'1px solid rgba(255,255,255,0.08)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <span style={{ fontWeight:700, fontSize:13, color: m.color || (m.isAI ? '#c084fc' : '#93c5fd'), marginRight:8 }}>{m.username}</span>
            <span style={{ color:'#fff', fontSize:13 }}>{m.message}</span>
          </div>
        ))}
      </div>

      {/* Override message - top center */}
      {override && (
        <div className="override-in" style={{
          position:'absolute', top:24, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)',
          borderRadius:14, padding:'12px 24px',
          border:'1px solid rgba(124,58,237,0.5)',
          boxShadow:'0 4px 30px rgba(124,58,237,0.3)',
          pointerEvents:'none', zIndex:20, maxWidth:600, textAlign:'center',
        }}>
          <div style={{ fontSize:10, color:'#7c3aed', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>📡 ANNOUNCEMENT</div>
          <div style={{ color:'#fff', fontSize:16, fontWeight:600 }}>{override.text}</div>
        </div>
      )}

      {/* Game board - bottom right */}
      <GameOverlay gameState={gameState} />

      {/* VTuber name badge - if no game or above it */}
      {loaded && gameState.game === 'none' && (
        <div style={{
          position:'absolute', bottom:32, right:32, pointerEvents:'none',
          background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)',
          borderRadius:10, padding:'8px 14px',
          border:'1px solid rgba(147,51,234,0.4)',
        }}>
          <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>🎮 {vtuberName}</span>
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position:'absolute', top:16, left:16, pointerEvents:'none',
        background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
        borderRadius:8, padding:'5px 11px',
        color:'rgba(255,255,255,0.45)', fontSize:11,
        opacity: isDragging.current ? 1 : 0.35, transition:'opacity 0.3s',
      }}>
        🖱️ Drag · Scroll to zoom
      </div>

      {!loaded && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:16 }}>Loading VTuber...</div>
        </div>
      )}
    </div>
  );
}
