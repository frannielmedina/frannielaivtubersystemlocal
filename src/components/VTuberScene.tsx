'use client';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

// ─────────────────────────────────────────────────────────────
// Animation file map
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

// ─────────────────────────────────────────────────────────────
// VRMA track name → VRM humanoid bone name
// ─────────────────────────────────────────────────────────────
const TRACK_TO_HUMANOID: Record<string, string> = {
  'J_Bip_C_Hips': 'hips', 'J_Bip_C_Spine': 'spine',
  'J_Bip_C_Chest': 'chest', 'J_Bip_C_UpperChest': 'upperChest',
  'J_Bip_C_Neck': 'neck', 'J_Bip_C_Head': 'head',
  'J_Bip_L_Shoulder': 'leftShoulder', 'J_Bip_L_UpperArm': 'leftUpperArm',
  'J_Bip_L_LowerArm': 'leftLowerArm', 'J_Bip_L_Hand': 'leftHand',
  'J_Bip_R_Shoulder': 'rightShoulder', 'J_Bip_R_UpperArm': 'rightUpperArm',
  'J_Bip_R_LowerArm': 'rightLowerArm', 'J_Bip_R_Hand': 'rightHand',
  'J_Bip_L_UpperLeg': 'leftUpperLeg', 'J_Bip_L_LowerLeg': 'leftLowerLeg',
  'J_Bip_L_Foot': 'leftFoot', 'J_Bip_L_ToeBase': 'leftToes',
  'J_Bip_R_UpperLeg': 'rightUpperLeg', 'J_Bip_R_LowerLeg': 'rightLowerLeg',
  'J_Bip_R_Foot': 'rightFoot', 'J_Bip_R_ToeBase': 'rightToes',
  'J_Bip_L_Thumb1': 'leftThumbProximal', 'J_Bip_L_Thumb2': 'leftThumbIntermediate', 'J_Bip_L_Thumb3': 'leftThumbDistal',
  'J_Bip_L_Index1': 'leftIndexProximal', 'J_Bip_L_Index2': 'leftIndexIntermediate', 'J_Bip_L_Index3': 'leftIndexDistal',
  'J_Bip_L_Middle1': 'leftMiddleProximal', 'J_Bip_L_Middle2': 'leftMiddleIntermediate', 'J_Bip_L_Middle3': 'leftMiddleDistal',
  'J_Bip_L_Ring1': 'leftRingProximal', 'J_Bip_L_Ring2': 'leftRingIntermediate', 'J_Bip_L_Ring3': 'leftRingDistal',
  'J_Bip_L_Little1': 'leftLittleProximal', 'J_Bip_L_Little2': 'leftLittleIntermediate', 'J_Bip_L_Little3': 'leftLittleDistal',
  'J_Bip_R_Thumb1': 'rightThumbProximal', 'J_Bip_R_Thumb2': 'rightThumbIntermediate', 'J_Bip_R_Thumb3': 'rightThumbDistal',
  'J_Bip_R_Index1': 'rightIndexProximal', 'J_Bip_R_Index2': 'rightIndexIntermediate', 'J_Bip_R_Index3': 'rightIndexDistal',
  'J_Bip_R_Middle1': 'rightMiddleProximal', 'J_Bip_R_Middle2': 'rightMiddleIntermediate', 'J_Bip_R_Middle3': 'rightMiddleDistal',
  'J_Bip_R_Ring1': 'rightRingProximal', 'J_Bip_R_Ring2': 'rightRingIntermediate', 'J_Bip_R_Ring3': 'rightRingDistal',
  'J_Bip_R_Little1': 'rightLittleProximal', 'J_Bip_R_Little2': 'rightLittleIntermediate', 'J_Bip_R_Little3': 'rightLittleDistal',
  'Hips': 'hips', 'Spine': 'spine', 'Spine1': 'chest', 'Spine2': 'upperChest',
  'Neck': 'neck', 'Head': 'head',
  'LeftShoulder': 'leftShoulder', 'LeftArm': 'leftUpperArm', 'LeftForeArm': 'leftLowerArm', 'LeftHand': 'leftHand',
  'RightShoulder': 'rightShoulder', 'RightArm': 'rightUpperArm', 'RightForeArm': 'rightLowerArm', 'RightHand': 'rightHand',
  'LeftUpLeg': 'leftUpperLeg', 'LeftLeg': 'leftLowerLeg', 'LeftFoot': 'leftFoot', 'LeftToeBase': 'leftToes',
  'RightUpLeg': 'rightUpperLeg', 'RightLeg': 'rightLowerLeg', 'RightFoot': 'rightFoot', 'RightToeBase': 'rightToes',
  'hips': 'hips', 'spine': 'spine', 'chest': 'chest', 'upperChest': 'upperChest',
  'neck': 'neck', 'head': 'head',
  'leftShoulder': 'leftShoulder', 'leftUpperArm': 'leftUpperArm', 'leftLowerArm': 'leftLowerArm', 'leftHand': 'leftHand',
  'rightShoulder': 'rightShoulder', 'rightUpperArm': 'rightUpperArm', 'rightLowerArm': 'rightLowerArm', 'rightHand': 'rightHand',
  'leftUpperLeg': 'leftUpperLeg', 'leftLowerLeg': 'leftLowerLeg', 'leftFoot': 'leftFoot', 'leftToes': 'leftToes',
  'rightUpperLeg': 'rightUpperLeg', 'rightLowerLeg': 'rightLowerLeg', 'rightFoot': 'rightFoot', 'rightToes': 'rightToes',
  'leftThumbProximal': 'leftThumbProximal', 'leftThumbIntermediate': 'leftThumbIntermediate', 'leftThumbDistal': 'leftThumbDistal',
  'leftIndexProximal': 'leftIndexProximal', 'leftIndexIntermediate': 'leftIndexIntermediate', 'leftIndexDistal': 'leftIndexDistal',
  'leftMiddleProximal': 'leftMiddleProximal', 'leftMiddleIntermediate': 'leftMiddleIntermediate', 'leftMiddleDistal': 'leftMiddleDistal',
  'leftRingProximal': 'leftRingProximal', 'leftRingIntermediate': 'leftRingIntermediate', 'leftRingDistal': 'leftRingDistal',
  'leftLittleProximal': 'leftLittleProximal', 'leftLittleIntermediate': 'leftLittleIntermediate', 'leftLittleDistal': 'leftLittleDistal',
  'rightThumbProximal': 'rightThumbProximal', 'rightThumbIntermediate': 'rightThumbIntermediate', 'rightThumbDistal': 'rightThumbDistal',
  'rightIndexProximal': 'rightIndexProximal', 'rightIndexIntermediate': 'rightIndexIntermediate', 'rightIndexDistal': 'rightIndexDistal',
  'rightMiddleProximal': 'rightMiddleProximal', 'rightMiddleIntermediate': 'rightMiddleIntermediate', 'rightMiddleDistal': 'rightMiddleDistal',
  'rightRingProximal': 'rightRingProximal', 'rightRingIntermediate': 'rightRingIntermediate', 'rightRingDistal': 'rightRingDistal',
  'rightLittleProximal': 'rightLittleProximal', 'rightLittleIntermediate': 'rightLittleIntermediate', 'rightLittleDistal': 'rightLittleDistal',
};

// ─────────────────────────────────────────────────────────────
// Parsed animation types
// ─────────────────────────────────────────────────────────────
interface BoneTrack {
  humanoidName: string;
  times: Float32Array;
  quatValues?: Float32Array;
  posValues?:  Float32Array;
}

interface ParsedClip {
  duration: number;
  boneTracks: BoneTrack[];
}

const _q  = new THREE.Quaternion();
const _v3 = new THREE.Vector3();

function sampleQuat(times: Float32Array, values: Float32Array, t: number, out: THREE.Quaternion) {
  const n = times.length;
  if (n === 0) return;
  if (t <= times[0])    { out.set(values[0], values[1], values[2], values[3]); return; }
  if (t >= times[n-1])  { const i=(n-1)*4; out.set(values[i], values[i+1], values[i+2], values[i+3]); return; }
  let lo = 0, hi = n - 1;
  while (lo + 1 < hi) { const mid = (lo+hi)>>1; if (times[mid] <= t) lo=mid; else hi=mid; }
  const alpha = (t - times[lo]) / (times[hi] - times[lo]);
  const a = lo*4, b = hi*4;
  _q.set(values[a], values[a+1], values[a+2], values[a+3]);
  out.set(values[b], values[b+1], values[b+2], values[b+3]);
  out.slerp(_q.conjugate().multiply(out).normalize(), 0); // just slerp directly
  // Redo properly:
  const qa = new THREE.Quaternion(values[a], values[a+1], values[a+2], values[a+3]);
  const qb = new THREE.Quaternion(values[b], values[b+1], values[b+2], values[b+3]);
  out.slerpQuaternions(qa, qb, alpha);
}

function sampleVec3(times: Float32Array, values: Float32Array, t: number, out: THREE.Vector3) {
  const n = times.length;
  if (n === 0) return;
  if (t <= times[0])   { out.set(values[0], values[1], values[2]); return; }
  if (t >= times[n-1]) { const i=(n-1)*3; out.set(values[i], values[i+1], values[i+2]); return; }
  let lo = 0, hi = n - 1;
  while (lo + 1 < hi) { const mid = (lo+hi)>>1; if (times[mid] <= t) lo=mid; else hi=mid; }
  const alpha = (t - times[lo]) / (times[hi] - times[lo]);
  const a = lo*3, b = hi*3;
  out.set(
    values[a]   + (values[b]   - values[a])   * alpha,
    values[a+1] + (values[b+1] - values[a+1]) * alpha,
    values[a+2] + (values[b+2] - values[a+2]) * alpha,
  );
}

function parseVRMAClip(gltf: any): ParsedClip | null {
  if (!gltf.animations?.length) return null;
  const raw: THREE.AnimationClip = gltf.animations[0];

  const map = new Map<string, { times?: Float32Array; quat?: Float32Array; pos?: Float32Array }>();

  for (const track of raw.tracks) {
    const dot = track.name.indexOf('.');
    if (dot === -1) continue;
    const trackBone    = track.name.substring(0, dot);
    const prop         = track.name.substring(dot);
    const humanoidName = TRACK_TO_HUMANOID[trackBone];
    if (!humanoidName) continue;

    if (!map.has(humanoidName)) map.set(humanoidName, {});
    const e = map.get(humanoidName)!;
    if (prop === '.quaternion') { e.times = track.times; e.quat = track.values; }
    else if (prop === '.position') { if (!e.times) e.times = track.times; e.pos = track.values; }
  }

  const boneTracks: BoneTrack[] = [];
  for (const [humanoidName, data] of map) {
    if (!data.times) continue;
    const bt: BoneTrack = { humanoidName, times: data.times };
    if (data.quat) bt.quatValues = data.quat;
    if (data.pos)  bt.posValues  = data.pos;
    boneTracks.push(bt);
  }

  return { duration: raw.duration, boneTracks };
}

const parsedClipCache = new Map<string, ParsedClip | null>();

function loadParsedClip(url: string): Promise<ParsedClip | null> {
  return new Promise((resolve) => {
    if (parsedClipCache.has(url)) { resolve(parsedClipCache.get(url) ?? null); return; }
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const parsed = parseVRMAClip(gltf);
      parsedClipCache.set(url, parsed);
      resolve(parsed);
    }, undefined, () => { parsedClipCache.set(url, null); resolve(null); });
  });
}

function applyParsedClip(clip: ParsedClip, vrm: VRM, t: number) {
  const h = vrm.humanoid;
  if (!h) return;
  for (const bt of clip.boneTracks) {
    const node = h.getNormalizedBoneNode(bt.humanoidName as any);
    if (!node) continue;
    if (bt.quatValues) {
      sampleQuat(bt.times, bt.quatValues, t, _q);
      node.quaternion.copy(_q);
    }
    if (bt.posValues && bt.humanoidName === 'hips') {
      sampleVec3(bt.times, bt.posValues, t, _v3);
      node.position.y = Math.max(0, _v3.y);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Background options
// ─────────────────────────────────────────────────────────────
export const BG_OPTIONS = [
  { id: 'gradient-purple', label: 'Purple',      style: 'linear-gradient(to bottom, #4a1d96, #1e3a8a)' },
  { id: 'gradient-pink',   label: 'Pink',        style: 'linear-gradient(to bottom, #831843, #4a1d96)' },
  { id: 'gradient-dark',   label: 'Dark Blue',   style: 'linear-gradient(to bottom, #0f172a, #1e3a8a)' },
  { id: 'solid-black',     label: 'Black (OBS)', style: '#000000' },
  { id: 'solid-green',     label: 'Green (OBS)', style: '#00b140' },
  { id: 'solid-white',     label: 'White',       style: '#ffffff' },
  { id: 'transparent',     label: 'Transparent', style: 'transparent' },
];

// ─────────────────────────────────────────────────────────────
// Idle pose
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
  if (lUA)   lUA.rotation.z = 1.2  + Math.sin(t * 0.6) * 0.02;
  if (rUA)   rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02;
  if (lLA)   lLA.rotation.z = 0.3  + Math.sin(t * 0.5) * 0.02;
  if (rLA)   rLA.rotation.z = -0.3 + Math.sin(t * 0.5 + Math.PI) * 0.02;
  if (hips)  hips.position.y = Math.sin(t * 0.5) * 0.01;
}

function resetToIdlePose(vrm: VRM) {
  const h = vrm.humanoid;
  if (!h) return;
  ['hips','spine','chest','upperChest','neck','head',
   'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
   'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
   'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
   'rightUpperLeg','rightLowerLeg','rightFoot','rightToes'].forEach((n) => {
    const b = h.getNormalizedBoneNode(n as any);
    if (b) { b.rotation.set(0,0,0); b.position.set(0,0,0); }
  });
  const lUA = h.getNormalizedBoneNode('leftUpperArm');
  const rUA = h.getNormalizedBoneNode('rightUpperArm');
  const lLA = h.getNormalizedBoneNode('leftLowerArm');
  const rLA = h.getNormalizedBoneNode('rightLowerArm');
  if (lUA) lUA.rotation.set(0,0, 1.2);
  if (rUA) rUA.rotation.set(0,0,-1.2);
  if (lLA) lLA.rotation.set(0,0, 0.3);
  if (rLA) rLA.rotation.set(0,0,-0.3);
  if (vrm.expressionManager) {
    ['happy','sad','angry','surprised','neutral','blink'].forEach((e) => {
      try { vrm.expressionManager!.setValue(e, 0); } catch {}
    });
  }
}

// ─────────────────────────────────────────────────────────────
// VRM Model — NO scene.rotation, animations via normalized bones
// The parent <group rotation-y={Math.PI}> in the Canvas handles facing.
// ─────────────────────────────────────────────────────────────
interface VRMModelProps {
  modelPath: string;
  onLoaded?: () => void;
  onError?:  (msg: string) => void;
}
const VRMModel: React.FC<VRMModelProps> = ({ modelPath, onLoaded, onError }) => {
  const [vrm,       setVrm]       = useState<VRM | null>(null);
  const modelLoadedRef       = useRef(false);
  const blinkRef             = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const sceneGroundOffsetRef = useRef<number>(0);
  const currentClipRef       = useRef<ParsedClip | null>(null);
  const animStartRef         = useRef<number>(-1);
  const isPlayingRef         = useRef(false);

  const currentAnimation = useStore((s) => s.currentAnimation);

  useEffect(() => {
    if (modelLoadedRef.current) return;
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    loader.load(modelPath, (gltf) => {
      const loaded = gltf.userData.vrm as VRM;
      if (!loaded) { onError?.('Invalid VRM file'); return; }

      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      loaded.scene.traverse((o) => { o.frustumCulled = false; });

      // ── NO rotation on scene — parent group handles the PI rotation ──
      // This means normalized bones = world bones, no compensation needed.
      // VRMA animations apply correctly with no mirroring.

      // Set idle arms
      const h = loaded.humanoid;
      if (h) {
        const lUA = h.getNormalizedBoneNode('leftUpperArm');
        const rUA = h.getNormalizedBoneNode('rightUpperArm');
        const lLA = h.getNormalizedBoneNode('leftLowerArm');
        const rLA = h.getNormalizedBoneNode('rightLowerArm');
        if (lUA) lUA.rotation.set(0,0, 1.2);
        if (rUA) rUA.rotation.set(0,0,-1.2);
        if (lLA) lLA.rotation.set(0,0, 0.3);
        if (rLA) rLA.rotation.set(0,0,-0.3);
      }

      // Ground: measure bounding box with no rotation on scene
      loaded.scene.position.set(0, 0, 0);
      loaded.update(0);
      loaded.scene.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(loaded.scene);
      const groundOffset = -box.min.y;
      sceneGroundOffsetRef.current = groundOffset;
      loaded.scene.position.y = groundOffset;

      modelLoadedRef.current = true;
      setVrm(loaded);
      onLoaded?.();
    }, undefined, (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const display = msg.includes('404') ? `Model not found: ${modelPath}` : msg;
      onError?.(display);
      modelLoadedRef.current = false;
    });
  }, [modelPath]);

  useEffect(() => {
    if (!vrm || !currentAnimation) return;
    const key   = EMOTE_MAP[currentAnimation.name.toLowerCase()] ?? currentAnimation.name.toLowerCase();
    const files = VRMA_ANIMATIONS[key];
    if (!files) return;
    loadParsedClip(pickRandom(files)).then((clip) => {
      if (!clip) return;
      currentClipRef.current = clip;
      animStartRef.current   = -1;
      isPlayingRef.current   = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  useFrame((state, delta) => {
    if (!vrm) return;
    vrm.scene.position.y = sceneGroundOffsetRef.current;

    if (isPlayingRef.current && currentClipRef.current) {
      const clip = currentClipRef.current;
      if (animStartRef.current < 0) animStartRef.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - animStartRef.current;
      if (elapsed <= clip.duration) {
        applyParsedClip(clip, vrm, elapsed);
      } else {
        isPlayingRef.current   = false;
        currentClipRef.current = null;
        resetToIdlePose(vrm);
      }
    } else {
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }

    vrm.update(delta);

    // Blink
    const b = blinkRef.current;
    const t = state.clock.elapsedTime;
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

  if (isLoading) return null; // loading indicator shown outside rotated group
  if (loadError) return null;
  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
};



// ─────────────────────────────────────────────────────────────
// Main VTuberScene
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
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
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
    const newScale = Math.max(0.5, Math.min(2.5, config.vtuber.scale - e.deltaY * 0.001));
    setConfig({ vtuber: { ...config.vtuber, scale: newScale } });
    showHint();
  };

  const bgStyle: React.CSSProperties = isTransparent
    ? { background: 'transparent' }
    : bg.style.startsWith('linear')
      ? { backgroundImage: bg.style }
      : { backgroundColor: bg.style };

  // The key insight: wrap VRMModel in a group rotated Math.PI on Y.
  // The model faces +Z, the group rotates it to face the camera at +Z.
  // scene.rotation is ZERO inside VRMModel, so normalized bones work correctly.
  const modelRotation: [number, number, number] = [
    vtuberRotation[0],
    vtuberRotation[1] + Math.PI, // add PI here instead of in scene
    vtuberRotation[2],
  ];

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
        camera={{ position: [0, 1.2, 3.2], fov: 38 }}
        gl={{ alpha: isTransparent, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1,  1, 1]} intensity={0.7} />
        <directionalLight position={[-1,-1,-1]} intensity={0.4} />
        <pointLight       position={[0,  2, 2]} intensity={0.5} />
        <Suspense fallback={null}>
          {/* PI rotation on the GROUP, not on vrm.scene → animations unaffected */}
          <group position={vtuberPosition} rotation={modelRotation} scale={config.vtuber.scale}>
            <VRMModel
              modelPath={config.vtuber.modelPath}
              onLoaded={() => setIsLoading(false)}
              onError={(msg) => { setIsLoading(false); setLoadError(msg); }}
            />
          </group>
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 1.0, 0]} />
      </Canvas>

      {/* Loading/error overlays rendered in HTML so they're never rotated */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-lg opacity-70">Loading...</span>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <span className="text-red-400 text-sm text-center px-4">{loadError}</span>
          <span className="text-gray-400 text-xs">Place model at /public/models/miko.vrm</span>
        </div>
      )}
      {hintVisible && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 px-3 py-2 rounded text-white text-xs pointer-events-none">
          🖱️ Drag to move · Scroll to zoom
        </div>
      )}
    </div>
  );
};
