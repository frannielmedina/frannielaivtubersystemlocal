'use client';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

// ─────────────────────────────────────────────────────────────
// VRMA file map
// .vrma files are standard GLTF — GLTFLoader reads their animations[]
// No @pixiv/three-vrm-animation package required!
// ─────────────────────────────────────────────────────────────
const VRMA_ANIMATIONS: Record<string, string[]> = {
  crazy:     ['/motions/crazy.vrma'],
  greet:     ['/motions/greet.vrma'],
  modelpose: ['/motions/modelpose.vrma'],
  peace:     ['/motions/peace.vrma'],
  shoot:     ['/motions/shoot.vrma'],
  spin:      ['/motions/spin1.vrma', '/motions/spin2.vrma'],
  squat:     ['/motions/squat.vrma'],
  dance:     ['/motions/dance1.vrma', '/motions/dance2.vrma', '/motions/dance3.vrma'],
  energetic: ['/motions/energeticdance1.vrma'],
  kawaii:    ['/motions/kawaiidance1.vrma'],
  wave:      ['/motions/greet.vrma'],
};

// Emote/trigger name → VRMA key
const EMOTE_MAP: Record<string, string> = {
  wave: 'wave', celebrate: 'energetic', dance: 'dance',
  energetic: 'energetic', kawaii: 'kawaii', think: 'peace',
  thumbsup: 'modelpose', heart: 'peace', sad: 'squat',
  angry: 'crazy', surprised: 'shoot', bow: 'greet',
  spin: 'spin', peace: 'peace', shoot: 'shoot',
  crazy: 'crazy', squat: 'squat', modelpose: 'modelpose', greet: 'greet',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Mixamo/BVH bone name → VRM normalized humanoid bone name
// VRM bones are accessed via humanoid.getNormalizedBoneNode(vrmName)
// but the actual THREE node names inside vrm.scene depend on the model.
// Strategy: build a map from vrm.scene node names, then remap VRMA tracks.
const MIXAMO_TO_VRM: Record<string, string> = {
  // Hips / spine
  Hips:           'hips',
  Spine:          'spine',
  Spine1:         'chest',
  Spine2:         'upperChest',
  Neck:           'neck',
  Head:           'head',
  // Left arm
  LeftShoulder:   'leftShoulder',
  LeftArm:        'leftUpperArm',
  LeftForeArm:    'leftLowerArm',
  LeftHand:       'leftHand',
  // Right arm
  RightShoulder:  'rightShoulder',
  RightArm:       'rightUpperArm',
  RightForeArm:   'rightLowerArm',
  RightHand:      'rightHand',
  // Left leg
  LeftUpLeg:      'leftUpperLeg',
  LeftLeg:        'leftLowerLeg',
  LeftFoot:       'leftFoot',
  LeftToeBase:    'leftToes',
  // Right leg
  RightUpLeg:     'rightUpperLeg',
  RightLeg:       'rightLowerLeg',
  RightFoot:      'rightFoot',
  RightToeBase:   'rightToes',
  // Left fingers
  LeftHandThumb1:  'leftThumbMetacarpal',
  LeftHandThumb2:  'leftThumbProximal',
  LeftHandThumb3:  'leftThumbDistal',
  LeftHandIndex1:  'leftIndexProximal',
  LeftHandIndex2:  'leftIndexIntermediate',
  LeftHandIndex3:  'leftIndexDistal',
  LeftHandMiddle1: 'leftMiddleProximal',
  LeftHandMiddle2: 'leftMiddleIntermediate',
  LeftHandMiddle3: 'leftMiddleDistal',
  LeftHandRing1:   'leftRingProximal',
  LeftHandRing2:   'leftRingIntermediate',
  LeftHandRing3:   'leftRingDistal',
  LeftHandPinky1:  'leftLittleProximal',
  LeftHandPinky2:  'leftLittleIntermediate',
  LeftHandPinky3:  'leftLittleDistal',
  // Right fingers
  RightHandThumb1:  'rightThumbMetacarpal',
  RightHandThumb2:  'rightThumbProximal',
  RightHandThumb3:  'rightThumbDistal',
  RightHandIndex1:  'rightIndexProximal',
  RightHandIndex2:  'rightIndexIntermediate',
  RightHandIndex3:  'rightIndexDistal',
  RightHandMiddle1: 'rightMiddleProximal',
  RightHandMiddle2: 'rightMiddleIntermediate',
  RightHandMiddle3: 'rightMiddleDistal',
  RightHandRing1:   'rightRingProximal',
  RightHandRing2:   'rightRingIntermediate',
  RightHandRing3:   'rightRingDistal',
  RightHandPinky1:  'rightLittleProximal',
  RightHandPinky2:  'rightLittleIntermediate',
  RightHandPinky3:  'rightLittleDistal',
};

/**
 * Build a map: vrmHumanoidBoneName → actual THREE.Object3D name inside vrm.scene
 * This lets us remap VRMA track names → real node names.
 */
function buildVRMBoneNameMap(vrm: VRM): Record<string, string> {
  const map: Record<string, string> = {};
  const h = vrm.humanoid;
  if (!h) return map;
  // All VRM humanoid bone names we care about
  const boneNames = Object.values(MIXAMO_TO_VRM);
  for (const boneName of boneNames) {
    try {
      // getNormalizedBoneNode returns the normalized (rest-pose corrected) node
      const node = h.getNormalizedBoneNode(boneName as any);
      if (node) map[boneName] = node.name;
    } catch {}
  }
  return map;
}

/**
 * Remap animation clip track names from Mixamo/BVH names to actual VRM node names.
 * Tracks that can't be mapped are dropped.
 */
function remapClipToVRM(clip: THREE.AnimationClip, vrm: VRM): THREE.AnimationClip | null {
  const vrmBoneMap = buildVRMBoneNameMap(vrm); // vrmBoneName → node.name
  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    // Track name format: "BoneName.property" or "BoneName.property[index]"
    const dotIdx = track.name.indexOf('.');
    if (dotIdx === -1) continue;
    const mixamoName = track.name.substring(0, dotIdx);
    const property   = track.name.substring(dotIdx); // e.g. ".quaternion"

    // Skip end bones and other non-humanoid tracks
    if (mixamoName.endsWith('_end')) continue;

    const vrmBoneName = MIXAMO_TO_VRM[mixamoName];
    if (!vrmBoneName) continue; // not in our map → skip

    const nodeName = vrmBoneMap[vrmBoneName];
    if (!nodeName) continue; // VRM doesn't have this bone → skip

    // Clone the track with the correct node name
    const newTrack = track.clone();
    newTrack.name = nodeName + property;
    newTracks.push(newTrack);
  }

  if (newTracks.length === 0) {
    console.warn('[VRMA] No tracks could be remapped for', clip.name);
    return null;
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

// Load a .vrma file and remap its bones to match the VRM model
function loadVRMAClip(url: string, vrm: VRM): Promise<THREE.AnimationClip | null> {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!gltf.animations || gltf.animations.length === 0) {
          console.warn('[VRMA] No animations found in', url);
          resolve(null);
          return;
        }
        const rawClip    = gltf.animations[0];
        const remapped   = remapClipToVRM(rawClip, vrm);
        resolve(remapped);
      },
      undefined,
      (err) => {
        console.warn('[VRMA] Failed to load', url, err);
        resolve(null);
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────
// Background options
// ─────────────────────────────────────────────────────────────
export const BG_OPTIONS = [
  { id: 'gradient-purple', label: 'Purple',       style: 'linear-gradient(to bottom, #4a1d96, #1e3a8a)' },
  { id: 'gradient-pink',   label: 'Pink',         style: 'linear-gradient(to bottom, #831843, #4a1d96)' },
  { id: 'gradient-dark',   label: 'Dark Blue',    style: 'linear-gradient(to bottom, #0f172a, #1e3a8a)' },
  { id: 'solid-black',     label: 'Black (OBS)',  style: '#000000' },
  { id: 'solid-green',     label: 'Green (OBS)',  style: '#00b140' },
  { id: 'solid-white',     label: 'White',        style: '#ffffff' },
  { id: 'transparent',     label: 'Transparent',  style: 'transparent' },
];

// ─────────────────────────────────────────────────────────────
// Idle bone animation
// ─────────────────────────────────────────────────────────────
function applyIdleAnimation(vrm: VRM, t: number) {
  const h = vrm.humanoid;
  if (!h) return;
  const spine = h.getNormalizedBoneNode('spine');
  const chest = h.getNormalizedBoneNode('chest');
  const head  = h.getNormalizedBoneNode('head');
  const lUA   = h.getNormalizedBoneNode('leftUpperArm');
  const rUA   = h.getNormalizedBoneNode('rightUpperArm');
  const lLA   = h.getNormalizedBoneNode('leftLowerArm');
  const rLA   = h.getNormalizedBoneNode('rightLowerArm');
  const hips  = h.getNormalizedBoneNode('hips');
  if (spine) spine.rotation.x = Math.sin(t * 0.8) * 0.03;
  if (chest) chest.rotation.x = Math.sin(t * 0.8) * 0.025;
  if (head)  { head.rotation.y = Math.sin(t * 0.3) * 0.08; head.rotation.x = Math.sin(t * 0.5) * 0.05; }
  if (lUA) { lUA.rotation.z = 1.2  + Math.sin(t * 0.6) * 0.02; }
  if (rUA) { rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02; }
  if (lLA) lLA.rotation.z = 0.3  + Math.sin(t * 0.5) * 0.02;
  if (rLA) rLA.rotation.z = -0.3 + Math.sin(t * 0.5 + Math.PI) * 0.02;
  if (hips) { hips.position.y = Math.sin(t * 0.5) * 0.01; }
}

function resetToIdlePose(vrm: VRM) {
  const h = vrm.humanoid;
  if (!h) return;
  (['spine','chest','head','hips','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm'] as const)
    .forEach((n) => { const b = h.getNormalizedBoneNode(n as any); if (b) b.rotation.set(0, 0, 0); });
  const lUA = h.getNormalizedBoneNode('leftUpperArm');
  const rUA = h.getNormalizedBoneNode('rightUpperArm');
  const lLA = h.getNormalizedBoneNode('leftLowerArm');
  const rLA = h.getNormalizedBoneNode('rightLowerArm');
  if (lUA) lUA.rotation.set(0, 0, 1.2);
  if (rUA) rUA.rotation.set(0, 0, -1.2);
  if (lLA) lLA.rotation.set(0, 0, 0.3);
  if (rLA) rLA.rotation.set(0, 0, -0.3);
  if (vrm.expressionManager) {
    ['happy','sad','angry','surprised','neutral','blink'].forEach((e) => {
      try { vrm.expressionManager!.setValue(e, 0); } catch {}
    });
  }
}

// ─────────────────────────────────────────────────────────────
// VRM Model component
// ─────────────────────────────────────────────────────────────
const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm,       setVrm]       = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mixerRef         = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const modelLoadedRef   = useRef(false);
  const blinkRef         = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const currentAnimation = useStore((s) => s.currentAnimation);

  // Load VRM
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
        modelLoadedRef.current = true;
        setVrm(loaded);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg.includes('404') ? `Model not found: ${modelPath}` : msg);
        setIsLoading(false);
        modelLoadedRef.current = false;
      }
    );
    return () => { mixerRef.current?.stopAllAction(); };
  }, [modelPath]);

  // Play VRMA on animation trigger
  useEffect(() => {
    if (!vrm || !mixerRef.current || !currentAnimation) return;
    const key   = EMOTE_MAP[currentAnimation.name.toLowerCase()] ?? currentAnimation.name.toLowerCase();
    const files = VRMA_ANIMATIONS[key];
    if (!files) return;

    const file = pickRandom(files);
    (async () => {
      if (!mixerRef.current) return;
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(0.3);
        currentActionRef.current = null;
      }
      const clip = await loadVRMAClip(file, vrm);
      if (!clip || !mixerRef.current) return;
      const action = mixerRef.current.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.fadeIn(0.3).play();
      currentActionRef.current = action;
      const dur = currentAnimation.duration ?? 3000;
      setTimeout(() => {
        if (currentActionRef.current === action) {
          action.fadeOut(0.5);
          currentActionRef.current = null;
        }
        resetToIdlePose(vrm);
      }, dur);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  // Frame loop
  useFrame((state, delta) => {
    if (!vrm) return;
    mixerRef.current?.update(delta);
    vrm.update(delta);
    if (!currentActionRef.current) applyIdleAnimation(vrm, state.clock.elapsedTime);

    // Blinking
    const b = blinkRef.current;
    const t = state.clock.elapsedTime;
    if (vrm.expressionManager) {
      if (b.isBlinking) {
        const e = t - b.blinkStart;
        if (e < 0.15) {
          vrm.expressionManager.setValue('blink', Math.sin((e / 0.15) * Math.PI));
        } else {
          vrm.expressionManager.setValue('blink', 0);
          b.isBlinking = false;
        }
      } else if (t - b.lastBlink > 2 + Math.random() * 3) {
        b.isBlinking = true; b.blinkStart = t; b.lastBlink = t;
      }
    }
  });

  if (isLoading) return <Text position={[0,0,0]} fontSize={0.3} color="#fff" anchorX="center">Loading…</Text>;
  if (loadError) return (
    <group>
      <Text position={[0,0.3,0]} fontSize={0.17} color="#ff6b6b" anchorX="center" maxWidth={4}>{loadError}</Text>
      <Text position={[0,-0.1,0]} fontSize={0.13} color="#aaa" anchorX="center" maxWidth={4}>Place model at /public/models/miko.vrm</Text>
    </group>
  );
  if (!vrm) return <Text position={[0,0,0]} fontSize={0.2} color="#ccc" anchorX="center">Initializing…</Text>;
  return <primitive object={vrm.scene} />;
};

// ─────────────────────────────────────────────────────────────
// Main VTuberScene export
// ─────────────────────────────────────────────────────────────
export const VTuberScene: React.FC<{ bgId?: string }> = ({ bgId = 'gradient-purple' }) => {
  const config            = useStore((s) => s.config);
  const vtuberPosition    = useStore((s) => s.vtuberPosition);
  const vtuberRotation    = useStore((s) => s.vtuberRotation);
  const setVTuberPosition = useStore((s) => s.setVTuberPosition);
  const setConfig         = useStore((s) => s.setConfig);

  const [isDragging,  setIsDragging]  = useState(false);
  const [dragStart,   setDragStart]   = useState({ x: 0, y: 0 });
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg            = BG_OPTIONS.find((b) => b.id === bgId) ?? BG_OPTIONS[0];
  const isTransparent = bg.id === 'transparent';

  const showHint = () => {
    setHintVisible(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000);
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); showHint(); };
  const handleMouseUp   = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) * 0.003;
    const dy = -(e.clientY - dragStart.y) * 0.003;
    setVTuberPosition([vtuberPosition[0] + dx, vtuberPosition[1] + dy, vtuberPosition[2]]);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = Math.max(0.5, Math.min(2.5, config.vtuber.scale - e.deltaY * 0.001));
    setConfig({ vtuber: { ...config.vtuber, scale: newScale } });
    showHint();
  };

  const bgStyle: React.CSSProperties = isTransparent
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
