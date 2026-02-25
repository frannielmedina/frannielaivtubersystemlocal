'use client';

/**
 * OBS Browser Source page  →  https://your-app.vercel.app/obs
 *
 * OBS Setup:
 *  1. Add "Browser Source"
 *  2. URL: https://your-app.vercel.app/obs
 *  3. Width/Height: 1920x1080 (or your stream resolution)
 *  4. Check "Shutdown source when not visible"
 *  5. Custom CSS: body { background: transparent !important; margin: 0; }
 *
 * Controls (visible when OBS Browser "Interact" is active):
 *  - Drag model to reposition
 *  - Scroll to zoom in/out
 *  - All settings come from your main app config (localStorage)
 */

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Types ────────────────────────────────────────────────────
interface OBSMsg {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  color?: string;
  isAI?: boolean;
}

interface VRMModelProps {
  modelPath: string;
  onLoaded?: () => void;
}

// ─── Idle Animation ───────────────────────────────────────────
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

// ─── VRM Model Component ──────────────────────────────────────
const VRMModel: React.FC<VRMModelProps> = ({ modelPath, onLoaded }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const loadedRef   = useRef(false);
  const blinkRef    = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const groundRef   = useRef(0);

  useEffect(() => {
    if (loadedRef.current || !modelPath) return;
    loadedRef.current = true;

    const loader = new GLTFLoader();
    loader.register(p => new VRMLoaderPlugin(p));
    loader.load(
      modelPath,
      gltf => {
        const loaded = gltf.userData.vrm as VRM;
        if (!loaded) return;
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        loaded.scene.traverse(o => { o.frustumCulled = false; });
        loaded.scene.rotation.y = Math.PI;

        // Set idle arms
        const h = loaded.humanoid;
        if (h) {
          const lUA = h.getNormalizedBoneNode('leftUpperArm');
          const rUA = h.getNormalizedBoneNode('rightUpperArm');
          const lLA = h.getNormalizedBoneNode('leftLowerArm');
          const rLA = h.getNormalizedBoneNode('rightLowerArm');
          if (lUA) lUA.rotation.set(0, 0,  1.2);
          if (rUA) rUA.rotation.set(0, 0, -1.2);
          if (lLA) lLA.rotation.set(0, 0,  0.3);
          if (rLA) rLA.rotation.set(0, 0, -0.3);
        }

        loaded.scene.position.set(0, 0, 0);
        loaded.update(0);
        loaded.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(loaded.scene);
        groundRef.current = -box.min.y;
        loaded.scene.position.y = groundRef.current;

        setVrm(loaded);
        onLoaded?.();
      },
      undefined,
      err => console.error('OBS VRM load error:', err)
    );
  }, [modelPath]);

  useFrame((state, delta) => {
    if (!vrm) return;
    vrm.scene.position.y = groundRef.current;
    applyIdle(vrm, state.clock.elapsedTime);
    vrm.update(delta);

    // Blink
    const b = blinkRef.current;
    const t = state.clock.elapsedTime;
    if (vrm.expressionManager) {
      if (b.isBlinking) {
        const e = t - b.blinkStart;
        if (e < 0.15) vrm.expressionManager.setValue('blink', Math.sin((e / 0.15) * Math.PI));
        else { vrm.expressionManager.setValue('blink', 0); b.isBlinking = false; }
      } else if (t - b.lastBlink > 2 + Math.random() * 3) {
        b.isBlinking = true; b.blinkStart = t; b.lastBlink = t;
      }
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
};

// ─── Main OBS Page ────────────────────────────────────────────
export default function OBSPage() {
  const [mounted, setMounted]       = useState(false);
  const [modelPath, setModelPath]   = useState('/models/miko.vrm');
  const [vtuberName, setVtuberName] = useState('Miko');
  const [modelScale, setModelScale] = useState(1.0);
  const [messages, setMessages]     = useState<OBSMsg[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Draggable / zoomable model position
  const [position, setPosition]   = useState<[number, number, number]>([0, 0.5, 0]);
  const [camZ, setCamZ]           = useState(3.2);
  const isDragging  = useRef(false);
  const dragStart   = useRef({ x: 0, y: 0 });
  const posRef      = useRef<[number, number, number]>([0, 0.5, 0]);

  // Mount guard (avoids SSR hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load config from localStorage (only on client)
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem('vtuber-config');
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg?.vtuber?.modelPath) setModelPath(cfg.vtuber.modelPath);
        if (cfg?.vtuber?.name)      setVtuberName(cfg.vtuber.name);
        if (cfg?.vtuber?.scale)     setModelScale(cfg.vtuber.scale);
      }
    } catch {}

    // Poll localStorage every 2 seconds for new chat messages
    // (set by the main app window via postMessage or shared storage)
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('obs-messages');
        if (raw) {
          const msgs: OBSMsg[] = JSON.parse(raw);
          setMessages(msgs.slice(-5));
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [mounted]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.x) * 0.003;
    const dy = -(e.clientY - dragStart.current.y) * 0.003;
    posRef.current = [
      posRef.current[0] + dx,
      posRef.current[1] + dy,
      posRef.current[2],
    ];
    setPosition([...posRef.current]);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    setCamZ(prev => Math.max(1.5, Math.min(6, prev + e.deltaY * 0.005)));
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="w-screen h-screen relative overflow-hidden"
      style={{ background: 'transparent', cursor: isDragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [0, 1.2, camZ], fov: 38 }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent', position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 1, 1]}   intensity={0.7} />
        <directionalLight position={[-1, -1, -1]} intensity={0.4} />
        <pointLight       position={[0, 2, 2]}    intensity={0.5} />
        <Suspense fallback={null}>
          <group position={position} scale={modelScale}>
            <VRMModel
              modelPath={modelPath}
              onLoaded={() => setLoaded(true)}
            />
          </group>
        </Suspense>
      </Canvas>

      {/* ── Chat message overlay (bottom-left) ── */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 max-w-sm z-10 pointer-events-none">
        {messages.map(m => (
          <div
            key={m.id}
            className="animate-fade-in"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              padding: '10px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, color: m.color || (m.isAI ? '#c084fc' : '#93c5fd'), marginRight: 8 }}>
              {m.username}
            </span>
            <span style={{ color: '#fff', fontSize: 13 }}>{m.message}</span>
          </div>
        ))}
      </div>

      {/* ── VTuber name badge (bottom-right) ── */}
      {loaded && (
        <div
          className="absolute bottom-8 right-8 pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            padding: '8px 14px',
            border: '1px solid rgba(147,51,234,0.4)',
          }}
        >
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>🎮 {vtuberName}</span>
        </div>
      )}

      {/* ── Controls hint (shows on hover in OBS Interact mode) ── */}
      <div
        className="absolute top-4 left-4 pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          borderRadius: 8,
          padding: '6px 12px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          opacity: isDragging.current ? 1 : 0.4,
          transition: 'opacity 0.3s',
        }}
      >
        🖱️ Drag to move · Scroll to zoom
      </div>

      {/* Loading indicator */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
            Loading VTuber...
          </div>
        </div>
      )}

      {/* Inline CSS for animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
