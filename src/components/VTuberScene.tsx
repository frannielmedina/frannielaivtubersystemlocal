 'use client';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

// VRMA animation clips mapped to trigger names
const VRMA_ANIMATIONS: Record<string, string[]> = {
  // Single-file animations
  crazy:         ['/motions/crazy.vrma'],
  greet:         ['/motions/greet.vrma'],
  modelpose:     ['/motions/modelpose.vrma'],
  peace:         ['/motions/peace.vrma'],
  shoot:         ['/motions/shoot.vrma'],
  spin:          ['/motions/spin1.vrma', '/motions/spin2.vrma'],  // random pick
  squat:         ['/motions/squat.vrma'],
  // Dance group — all three files, random pick on trigger [dance]
  dance:         ['/motions/dance1.vrma', '/motions/dance2.vrma', '/motions/dance3.vrma'],
  // Energetic dance — plays energeticdance1.vrma
  energetic:     ['/motions/energeticdance1.vrma'],
  // Kawaii dance
  kawaii:        ['/motions/kawaiidance1.vrma'],
  // Wave
  wave:          ['/motions/greet.vrma'],
};

// Map legacy/emote names → VRMA keys
const EMOTE_MAP: Record<string, string> = {
  wave:          'wave',
  celebrate:     'energetic',
  dance:         'dance',
  energetic:     'energetic',
  kawaii:        'kawaii',
  think:         'peace',
  thumbsup:      'modelpose',
  heart:         'peace',
  sad:           'squat',
  angry:         'crazy',
  surprised:     'shoot',
  bow:           'greet',
  spin:          'spin',
};

// Pick a random file from a list
function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────
// VRMA Loader hook
// ─────────────────────────────────────────────────────────────
async function loadVRMAClip(
  url: string,
  vrm: VRM,
  mixer: THREE.AnimationMixer
): Promise<THREE.AnimationAction | null> {
  try {
    const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import(
      '@pixiv/three-vrm-animation'
    );
    const loader = new GLTFLoader();
    loader.register((p) => new VRMAnimationLoaderPlugin(p));

    return new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          const vrmAnim = gltf.userData.vrmAnimations?.[0];
          if (!vrmAnim) { resolve(null); return; }
          const clip = createVRMAnimationClip(vrmAnim, vrm);
          const action = mixer.clipAction(clip);
          resolve(action);
        },
        undefined,
        () => resolve(null)
      );
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// VRM Model Component
// ─────────────────────────────────────────────────────────────
const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const modelLoadedRef = useRef(false);
  const currentAnimation = useStore((s) => s.currentAnimation);

  // Blinking
  const blinkRef = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });

  // ── Load VRM ──────────────────────────────────────────────
  useEffect(() => {
    if (modelLoadedRef.current) return;
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));

    setIsLoading(true);
    setLoadError(null);

    loader.load(
      modelPath,
      (gltf) => {
        const loaded = gltf.userData.vrm as VRM;
        if (!loaded) { setLoadError('Invalid VRM file'); setIsLoading(false); return; }

        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        loaded.scene.traverse((o) => { o.frustumCulled = false; });
        loaded.scene.rotation.y = Math.PI;

        const humanoid = loaded.humanoid;
        if (humanoid) {
          const lUA = humanoid.getNormalizedBoneNode('leftUpperArm');
          const rUA = humanoid.getNormalizedBoneNode('rightUpperArm');
          const lLA = humanoid.getNormalizedBoneNode('leftLowerArm');
          const rLA = humanoid.getNormalizedBoneNode('rightLowerArm');
          if (lUA) lUA.rotation.set(0, 0, 1.2);
          if (rUA) rUA.rotation.set(0, 0, -1.2);
          if (lLA) lLA.rotation.set(0, 0, 0.3);
          if (rLA) rLA.rotation.set(0, 0, -0.3);
        }

        mixerRef.current = new THREE.AnimationMixer(loaded.scene);
        modelLoadedRef.current = true;
        setVrm(loaded);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load';
        setLoadError(msg.includes('404') ? `Model not found: ${modelPath}` : msg);
        setIsLoading(false);
        modelLoadedRef.current = false;
      }
    );

    return () => {
      mixerRef.current?.stopAllAction();
    };
  }, [modelPath]);

  // ── Play VRMA when animation trigger changes ───────────────
  useEffect(() => {
    if (!vrm || !mixerRef.current || !currentAnimation) return;

    const animName = currentAnimation.name.toLowerCase();
    const emoteKey = EMOTE_MAP[animName] || animName;
    const files = VRMA_ANIMATIONS[emoteKey];

    if (!files) {
      // Fallback: play built-in pose animation
      playBuiltInAnimation(vrm, animName);
      return;
    }

    const file = pickRandom(files);

    (async () => {
      if (!mixerRef.current || !vrm) return;

      // Fade out current
      currentActionRef.current?.fadeOut(0.3);

      const action = await loadVRMAClip(file, vrm, mixerRef.current);
      if (!action) {
        playBuiltInAnimation(vrm, animName);
        return;
      }

      action.reset().setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.fadeIn(0.3).play();
      currentActionRef.current = action;

      // After duration, fade back to idle
      const dur = currentAnimation.duration || 3000;
      setTimeout(() => {
        action.fadeOut(0.5);
        currentActionRef.current = null;
        resetToIdlePose(vrm);
      }, dur);
    })();
  }, [currentAnimation, vrm]);

  // ── Frame loop ────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!vrm) return;
    mixerRef.current?.update(delta);
    vrm.update(delta);

    if (!currentActionRef.current) {
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }

    handleBlinking(vrm, state.clock.elapsedTime);
  });

  function handleBlinking(v: VRM, time: number) {
    if (!v.expressionManager) return;
    const b = blinkRef.current;
    if (b.isBlinking) {
      const elapsed = time - b.blinkStart;
      if (elapsed < 0.15) {
        v.expressionManager.setValue('blink', Math.sin((elapsed / 0.15) * Math.PI));
      } else {
        v.expressionManager.setValue('blink', 0);
        b.isBlinking = false;
      }
    } else if (time - b.lastBlink > 2 + Math.random() * 3) {
      b.isBlinking = true;
      b.blinkStart = time;
      b.lastBlink = time;
    }
  }

  if (isLoading) return <Text position={[0, 0, 0]} fontSize={0.3} color="#fff" anchorX="center">Loading VRM...</Text>;
  if (loadError)  return (
    <group>
      <Text position={[0, 0.3, 0]} fontSize={0.18} color="#ff6b6b" anchorX="center" maxWidth={4}>{loadError}</Text>
      <Text position={[0, -0.1, 0]} fontSize={0.13} color="#aaa" anchorX="center" maxWidth={4}>Place your .vrm file in /public/models/miko.vrm</Text>
    </group>
  );
  if (!vrm) return <Text position={[0, 0, 0]} fontSize={0.2} color="#ccc" anchorX="center">Initializing...</Text>;

  return <primitive object={vrm.scene} />;
};

// ─────────────────────────────────────────────────────────────
// Built-in fallback animations (no VRMA file needed)
// ─────────────────────────────────────────────────────────────
function playBuiltInAnimation(vrm: VRM, name: string) {
  const h = vrm.humanoid;
  if (!h) return;
  // lightweight fallback — just reset bones; VRMA files handle real animations
  resetToIdlePose(vrm);
}

function applyIdleAnimation(vrm: VRM, time: number) {
  const h = vrm.humanoid;
  if (!h) return;

  const spine  = h.getNormalizedBoneNode('spine');
  const chest  = h.getNormalizedBoneNode('chest');
  const head   = h.getNormalizedBoneNode('head');
  const lUA    = h.getNormalizedBoneNode('leftUpperArm');
  const rUA    = h.getNormalizedBoneNode('rightUpperArm');
  const lLA    = h.getNormalizedBoneNode('leftLowerArm');
  const rLA    = h.getNormalizedBoneNode('rightLowerArm');
  const hips   = h.getNormalizedBoneNode('hips');

  if (spine) spine.rotation.x = Math.sin(time * 0.8) * 0.03;
  if (chest) chest.rotation.x = Math.sin(time * 0.8) * 0.025;
  if (head) {
    head.rotation.y = Math.sin(time * 0.3) * 0.08;
    head.rotation.x = Math.sin(time * 0.5) * 0.05;
    head.rotation.z = Math.sin(time * 0.4) * 0.02;
  }
  if (lUA) { lUA.rotation.z = 1.2 + Math.sin(time * 0.6) * 0.02; lUA.rotation.x = Math.sin(time * 0.7) * 0.02; }
  if (rUA) { rUA.rotation.z = -1.2 + Math.sin(time * 0.6 + Math.PI) * 0.02; rUA.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.02; }
  if (lLA) lLA.rotation.z = 0.3 + Math.sin(time * 0.5) * 0.02;
  if (rLA) rLA.rotation.z = -0.3 + Math.sin(time * 0.5 + Math.PI) * 0.02;
  if (hips) { hips.position.y = Math.sin(time * 0.5) * 0.01; hips.rotation.y = Math.sin(time * 0.4) * 0.02; }
}

function resetToIdlePose(vrm: VRM) {
  const h = vrm.humanoid;
  if (!h) return;
  const bones = ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','spine','head','hips'];
  bones.forEach(name => { const b = h.getNormalizedBoneNode(name as any); if (b) b.rotation.set(0,0,0); });
  const lUA = h.getNormalizedBoneNode('leftUpperArm');
  const rUA = h.getNormalizedBoneNode('rightUpperArm');
  const lLA = h.getNormalizedBoneNode('leftLowerArm');
  const rLA = h.getNormalizedBoneNode('rightLowerArm');
  if (lUA) lUA.rotation.set(0,0,1.2);
  if (rUA) rUA.rotation.set(0,0,-1.2);
  if (lLA) lLA.rotation.set(0,0,0.3);
  if (rLA) rLA.rotation.set(0,0,-0.3);
  if (vrm.expressionManager) {
    ['happy','sad','angry','surprised','neutral','aa','blink'].forEach(e => {
      try { vrm.expressionManager!.setValue(e, 0); } catch {}
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Background options
// ─────────────────────────────────────────────────────────────
export const BG_OPTIONS = [
  { id: 'gradient-purple',  label: 'Purple Gradient',  style: 'linear-gradient(to bottom, #4a1d96, #1e3a8a)' },
  { id: 'gradient-pink',    label: 'Pink Gradient',    style: 'linear-gradient(to bottom, #831843, #4a1d96)' },
  { id: 'gradient-dark',    label: 'Dark Blue',        style: 'linear-gradient(to bottom, #0f172a, #1e3a8a)' },
  { id: 'solid-black',      label: 'Black (OBS key)',  style: '#000000' },
  { id: 'solid-green',      label: 'Green (OBS key)',  style: '#00b140' },
  { id: 'solid-white',      label: 'White',            style: '#ffffff' },
  { id: 'transparent',      label: 'Transparent',      style: 'transparent' },
];

// ─────────────────────────────────────────────────────────────
// Main VTuberScene export
// ─────────────────────────────────────────────────────────────
export const VTuberScene: React.FC<{ bgId?: string }> = ({ bgId = 'gradient-purple' }) => {
  const config          = useStore((s) => s.config);
  const vtuberPosition  = useStore((s) => s.vtuberPosition);
  const vtuberRotation  = useStore((s) => s.vtuberRotation);
  const setVTuberPosition = useStore((s) => s.setVTuberPosition);
  const setConfig       = useStore((s) => s.setConfig);

  const [isDragging, setIsDragging]   = useState(false);
  const [dragStart, setDragStart]     = useState({ x: 0, y: 0 });
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const bg = BG_OPTIONS.find((b) => b.id === bgId) || BG_OPTIONS[0];
  const isTransparent = bg.id === 'transparent';

  const showHint = () => {
    setHintVisible(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    showHint();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) * 0.003;
    const dy = -(e.clientY - dragStart.y) * 0.003;
    setVTuberPosition([vtuberPosition[0] + dx, vtuberPosition[1] + dy, vtuberPosition[2]]);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = Math.max(0.5, Math.min(2.5, config.vtuber.scale - e.deltaY * 0.001));
    setConfig({ vtuber: { ...config.vtuber, scale: newScale } });
    showHint();
  };

  const bgStyle = isTransparent
    ? { background: 'transparent' }
    : bg.style.startsWith('linear')
      ? { backgroundImage: bg.style }
      : { backgroundColor: bg.style };

  return (
    <div
      className="w-full h-full relative"
      style={{ ...bgStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [0, 0.7, 2.8], fov: 45 }}
        gl={{ alpha: isTransparent, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 1, 1]} intensity={0.7} />
        <directionalLight position={[-1, -1, -1]} intensity={0.4} />
        <pointLight position={[0, 2, 2]} intensity={0.5} />

        <Suspense fallback={null}>
          <group position={vtuberPosition} rotation={vtuberRotation} scale={config.vtuber.scale}>
            <VRMModel modelPath={config.vtuber.modelPath} />
          </group>
        </Suspense>

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 0.7, 0]} />
      </Canvas>

      {hintVisible && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 px-3 py-2 rounded text-white text-xs pointer-events-none">
          🖱️ Drag to move · Scroll to zoom
        </div>
      )}
    </div>
  );
};
