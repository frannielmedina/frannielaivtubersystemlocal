'use client';

/**
 * OBS Browser Source page  →  http://localhost:3000/obs
 *
 * OBS Setup:
 *  1. Add "Browser Source"
 *  2. URL: http://localhost:3000/obs
 *  3. Width/Height: e.g. 1920x1080
 *  4. Check "Shutdown source when not visible"
 *  5. Custom CSS:  body { background: transparent !important; margin: 0; }
 *
 * The page auto-loads your config from localStorage.
 * To pass a specific config via URL:
 *   http://localhost:3000/obs?config=<base64-encoded-JSON>
 *   (Export config from Settings → Export Config, then base64-encode it)
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';
import { TTSService } from '@/services/TTSService';
import { TwitchService } from '@/services/TwitchService';
import { AIService } from '@/services/AIService';

function idleBreathing(vrm: VRM, t: number) {
  const h = vrm.humanoid;
  if (!h) return;
  const spine = h.getNormalizedBoneNode('spine');
  const head  = h.getNormalizedBoneNode('head');
  const lUA   = h.getNormalizedBoneNode('leftUpperArm');
  const rUA   = h.getNormalizedBoneNode('rightUpperArm');
  if (spine) spine.rotation.x = Math.sin(t * 0.8) * 0.03;
  if (head)  { head.rotation.y = Math.sin(t * 0.3) * 0.08; head.rotation.x = Math.sin(t * 0.5) * 0.05; }
  if (lUA)   lUA.rotation.z = 1.2 + Math.sin(t * 0.6) * 0.02;
  if (rUA)   rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02;
}

const OBSVRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    loader.load(modelPath, (gltf) => {
      const loaded = gltf.userData.vrm as VRM;
      if (!loaded) return;
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      loaded.scene.traverse((o) => { o.frustumCulled = false; });
      loaded.scene.rotation.y = Math.PI;
      const h = loaded.humanoid;
      if (h) {
        const lUA = h.getNormalizedBoneNode('leftUpperArm');
        const rUA = h.getNormalizedBoneNode('rightUpperArm');
        const lLA = h.getNormalizedBoneNode('leftLowerArm');
        const rLA = h.getNormalizedBoneNode('rightLowerArm');
        if (lUA) lUA.rotation.set(0, 0, 1.2);
        if (rUA) rUA.rotation.set(0, 0, -1.2);
        if (lLA) lLA.rotation.set(0, 0, 0.3);
        if (rLA) rLA.rotation.set(0, 0, -0.3);
      }
      mixerRef.current = new THREE.AnimationMixer(loaded.scene);
      setVrm(loaded);
    }, undefined, (err) => console.error('OBS VRM error:', err));
  }, [modelPath]);

  useFrame((_, delta) => {
    if (!vrm) return;
    mixerRef.current?.update(delta);
    vrm.update(delta);
    idleBreathing(vrm, performance.now() / 1000);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
};

interface OBSMsg { id: string; username: string; message: string; color?: string; isAI?: boolean; }

export default function OBSPage() {
  const { config, setConfig, chatMessages, addChatMessage } = useStore();
  const [messages, setMessages] = useState<OBSMsg[]>([]);
  const [ready, setReady] = useState(false);
  const twitchRef = useRef<TwitchService | null>(null);
  const aiRef     = useRef<AIService | null>(null);
  const ttsRef    = useRef<TTSService | null>(null);

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const encoded = params.get('config');
    if (encoded) {
      try { setConfig(JSON.parse(atob(encoded))); setReady(true); return; } catch {}
    }
    try {
      const saved = localStorage.getItem('vtuber-config');
      if (saved) setConfig(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (!last) return;
    const msg: OBSMsg = { id: last.id, username: last.username, message: last.message, color: last.color, isAI: last.isAI };
    setMessages((prev) => [...prev.slice(-4), msg]);
    const t = setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== msg.id)), 30000);
    return () => clearTimeout(t);
  }, [chatMessages]);

  useEffect(() => {
    if (!ready) return;
    aiRef.current  = new AIService(config.ai);
    ttsRef.current = new TTSService(config.tts);
    twitchRef.current = new TwitchService(config.twitch);

    if (config.twitch.enabled && config.twitch.channel?.trim()) {
      twitchRef.current.connect(async (msg: any) => {
        addChatMessage({ id: Date.now().toString(), username: msg.username, message: msg.message, timestamp: msg.timestamp, color: msg.color });
        if (config.ai.apiKey && !/^!(move|place)/i.test(msg.message)) {
          try {
            const resp = await aiRef.current!.generateResponse([
              { role: 'system', content: config.ai.systemPrompt },
              { role: 'user',   content: `${msg.username}: ${msg.message}` },
            ]);
            addChatMessage({ id: (Date.now()+1).toString(), username: config.vtuber.name||'Miko', message: resp, timestamp: Date.now(), isAI: true, color: '#9333ea' });
            if (config.tts.enabled) ttsRef.current?.speak(resp);
          } catch {}
        }
      }).catch(() => {});
    }
    return () => { twitchRef.current?.disconnect(); };
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0.7, 2.8], fov: 45 }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent', position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 1, 1]} intensity={0.7} />
        <directionalLight position={[-1, -1, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <group position={[0, 0.5, 0]} scale={config.vtuber.scale}>
            <OBSVRMModel modelPath={config.vtuber.modelPath} />
          </group>
        </Suspense>
      </Canvas>

      <div className="absolute bottom-8 left-8 flex flex-col gap-2 max-w-sm z-10">
        {messages.map((m) => (
          <div key={m.id} className="bg-black bg-opacity-75 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg animate-fade-in">
            <span className="font-bold text-sm mr-2" style={{ color: m.color || (m.isAI ? '#a855f7' : '#60a5fa') }}>{m.username}</span>
            <span className="text-white text-sm">{m.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
