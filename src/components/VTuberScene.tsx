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
// Humanoid bone name → canonical VRM humanoid name
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

// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS APPROACH WORKS
// ─────────────────────────────────────────────────────────────────────────────
// The VRM spec defines a "normalized humanoid" space where every bone's rest
// pose has identity rotation. When you call vrm.humanoid.getNormalizedBoneNode()
// you get a proxy node that lives in this normalized space.
//
// When vrm.update() is called, it converts normalized-space rotations into the
// actual skeleton's local-space rotations, correctly accounting for any scene-
// level transform (including rotation.y = Math.PI).
//
// So the correct pipeline is:
//   VRMA quaternion → apply to NORMALIZED bone node → vrm.update() → correct visual
//
// The WRONG pipeline (what we were doing before) is:
//   VRMA quaternion → AnimationMixer → raw skeleton node → wrong visual (mirrored)
//
// This implementation:
// 1. Parses VRMA tracks and stores them as sampled keyframe data
// 2. Each frame: samples the current time, gets quaternion/position values
// 3. Applies them to vrm.humanoid.getNormalizedBoneNode() bones
// 4. vrm.update() handles the rest correctly
// ─────────────────────────────────────────────────────────────────────────────

// Parsed animation data structure
interface BoneTrack {
  humanoidName: string;
  times: Float32Array;
  // quaternion or position values
  quatValues?: Float32Array;   // length = times.length * 4
  posValues?:  Float32Array;   // length = times.length * 3
}

interface ParsedClip {
  duration: number;
  boneTracks: BoneTrack[];
}

// Sample a flat array of values at a given time using linear interpolation
function sampleQuat(times: Float32Array, values: Float32Array, t: number, out: THREE.Quaternion) {
  const n = times.length;
  if (n === 0) return;
  if (t <= times[0]) {
    out.set(values[0], values[1], values[2], values[3]);
    return;
  }
  if (t >= times[n - 1]) {
    const i = (n - 1) * 4;
    out.set(values[i], values[i+1], values[i+2], values[i+3]);
    return;
  }
  // Binary search
  let lo = 0, hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid;
  }
  const alpha = (t - times[lo]) / (times[hi] - times[lo]);
  const a = lo * 4, b = hi * 4;
  const qa = new THREE.Quaternion(values[a], values[a+1], values[a+2], values[a+3]);
  const qb = new THREE.Quaternion(values[b], values[b+1], values[b+2], values[b+3]);
  out.slerpQuaternions(qa, qb, alpha);
}

function sampleVec3(times: Float32Array, values: Float32Array, t: number, out: THREE.Vector3) {
  const n = times.length;
  if (n === 0) return;
  if (t <= times[0]) {
    out.set(values[0], values[1], values[2]);
    return;
  }
  if (t >= times[n - 1]) {
    const i = (n - 1) * 3;
    out.set(values[i], values[i+1], values[i+2]);
    return;
  }
  let lo = 0, hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid;
  }
  const alpha = (t - times[lo]) / (times[hi] - times[lo]);
  const a = lo * 3, b = hi * 3;
  out.set(
    values[a]   + (values[b]   - values[a])   * alpha,
    values[a+1] + (values[b+1] - values[a+1]) * alpha,
    values[a+2] + (values[b+2] - values[a+2]) * alpha,
  );
}

function parseVRMAClip(gltf: any): ParsedClip | null {
  if (!gltf.animations?.length) return null;
  const raw: THREE.AnimationClip = gltf.animations[0];
  const boneTracks: BoneTrack[] = [];

  // Group tracks by bone
  const byBone = new Map<string, { times: Float32Array; quat?: Float32Array; pos?: Float32Array }>();

  for (const track of raw.tracks) {
    const dot = track.name.indexOf('.');
    if (dot === -1) continue;
    const trackBone = track.name.substring(0, dot);
    const prop      = track.name.substring(dot);
    const humanoidName = TRACK_TO_HUMANOID[trackBone];
    if (!humanoidName) continue;

    if (!byBone.has(humanoidName)) {
      byBone.set(humanoidName, { times: track.times });
    }
    const entry = byBone.get(humanoidName)!;

    if (prop === '.quaternion') {
      entry.times = track.times;
      entry.quat  = track.values;
    } else if (prop === '.position') {
      entry.pos = track.values;
    }
  }

  for (const [humanoidName, data] of byBone) {
    const bt: BoneTrack = { humanoidName, times: data.times };
    if (data.quat) bt.quatValues = data.quat;
    if (data.pos)  bt.posValues  = data.pos;
    if (bt.quatValues || bt.posValues) boneTracks.push(bt);
  }

  return { duration: raw.duration, boneTracks };
}

// Cache parsed clips by URL
const parsedClipCache = new Map<string, ParsedClip | null>();

function loadParsedClip(url: string): Promise<ParsedClip | null> {
  return new Promise((resolve) => {
    if (parsedClipCache.has(url)) { resolve(parsedClipCache.get(url) ?? null); return; }
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const parsed = parseVRMAClip(gltf);
        parsedClipCache.set(url, parsed);
        resolve(parsed);
      },
      undefined,
      () => { parsedClipCache.set(url, null); resolve(null); }
    );
  });
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
// Idle breathing animation
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
  const bones = [
    'hips','spine','chest','upperChest','neck','head',
    'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
    'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
    'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
    'rightUpperLeg','rightLowerLeg','rightFoot','rightToes',
  ];
  bones.forEach((n) => {
    const b = h.getNormalizedBoneNode(n as any);
    if (b) { b.rotation.set(0, 0, 0); b.position.set(0, 0, 0); }
  });
  const lUA = h.getNormalizedBoneNode('leftUpperArm');
  const rUA = h.getNormalizedBoneNode('rightUpperArm');
  const lLA = h.getNormalizedBoneNode('leftLowerArm');
  const rLA = h.getNormalizedBoneNode('rightLowerArm');
  if (lUA) lUA.rotation.set(0, 0,  1.2);
  if (rUA) rUA.rotation.set(0, 0, -1.2);
  if (lLA) lLA.rotation.set(0, 0,  0.3);
  if (rLA) rLA.rotation.set(0, 0, -0.3);
  if (vrm.expressionManager) {
    ['happy','sad','angry','surprised','neutral','blink'].forEach((e) => {
      try { vrm.expressionManager!.setValue(e, 0); } catch {}
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Apply a parsed clip at time t to the VRM's normalized bones
// ─────────────────────────────────────────────────────────────
const _q  = new THREE.Quaternion();
const _v3 = new THREE.Vector3();

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
    // Only apply hips position (Y component) for vertical movement like greet/squat
    // Skip X/Z position to prevent the model from drifting sideways
    if (bt.posValues && bt.humanoidName === 'hips') {
      sampleVec3(bt.times, bt.posValues, t, _v3);
      // Only take the Y offset; clamp it above 0 so feet don't go underground
      node.position.y = Math.max(0, _v3.y);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// VRM Model component
// ─────────────────────────────────────────────────────────────
const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm,       setVrm]       = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const modelLoadedRef       = useRef(false);
  const blinkRef             = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const sceneGroundOffsetRef = useRef<number>(0);

  // Animation state
  const currentClipRef  = useRef<ParsedClip | null>(null);
  const animStartRef    = useRef<number>(0);
  const isPlayingRef    = useRef(false);

  const currentAnimation = useStore((s) => s.currentAnimation);

  // ── Load VRM ────────────────────────────────────────────────
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

        // Model faces camera. Camera is at +Z. This is the standard setup.
        loaded.scene.rotation.y = Math.PI;

        // Set initial arm pose on normalized bones
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

        // Ground the model
        loaded.scene.position.set(0, 0, 0);
        loaded.update(0); // ensure normalized bones are propagated
        loaded.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(loaded.scene);
        const groundOffset = -box.min.y;
        sceneGroundOffsetRef.current = groundOffset;
        loaded.scene.position.y = groundOffset;

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
  }, [modelPath]);

  // ── Trigger animation ────────────────────────────────────────
  useEffect(() => {
    if (!vrm || !currentAnimation) return;
    const key   = EMOTE_MAP[currentAnimation.name.toLowerCase()] ?? currentAnimation.name.toLowerCase();
    const files = VRMA_ANIMATIONS[key];
    if (!files) return;
    const file = pickRandom(files);

    loadParsedClip(file).then((clip) => {
      if (!clip) return;
      currentClipRef.current = clip;
      animStartRef.current   = -1; // will be set on first frame
      isPlayingRef.current   = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  // ── Frame loop ───────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!vrm) return;

    vrm.scene.position.y = sceneGroundOffsetRef.current;

    if (isPlayingRef.current && currentClipRef.current) {
      const clip = currentClipRef.current;

      // Initialize start time on first frame
      if (animStartRef.current < 0) {
        animStartRef.current = state.clock.elapsedTime;
      }

      const elapsed = state.clock.elapsedTime - animStartRef.current;

      if (elapsed <= clip.duration) {
        applyParsedClip(clip, vrm, elapsed);
      } else {
        // Animation finished
        isPlayingRef.current  = false;
        currentClipRef.current = null;
        resetToIdlePose(vrm);
      }
    } else {
      // Idle breathing
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }

    vrm.update(delta);

    // Blinking
    const b = blinkRef.current;
    const t = state.clock.elapsedTime;
    if (vrm.expressionManager) {
      if (b.isBlinking) {
        const elapsed = t - b.blinkStart;
        if (elapsed < 0.15) {
          vrm.expressionManager.setValue('blink', Math.sin((elapsed / 0.15) * Math.PI));
        } else {
          vrm.expressionManager.setValue('blink', 0);
          b.isBlinking = false;
        }
      } else if (t - b.lastBlink > 2 + Math.random() * 3) {
        b.isBlinking = true;
        b.blinkStart = t;
        b.lastBlink  = t;
      }
    }
  });

  if (isLoading) return (
    <Text position={[0, 1, 0]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">
      Loading...
    </Text>
  );
  if (loadError) return (
    <group>
      <Text position={[0, 1.3, 0]} fontSize={0.17} color="#ff6b6b" anchorX="center" maxWidth={4}>{loadError}</Text>
      <Text position={[0, 0.9, 0]} fontSize={0.13} color="#aaa"    anchorX="center" maxWidth={4}>Place model at /public/models/miko.vrm</Text>
    </group>
  );
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
        <directionalLight position={[1,  1,  1]} intensity={0.7} />
        <directionalLight position={[-1,-1, -1]} intensity={0.4} />
        <pointLight       position={[0,  2,  2]} intensity={0.5} />
        <Suspense fallback={null}>
          <group position={vtuberPosition} rotation={vtuberRotation} scale={config.vtuber.scale}>
            <VRMModel modelPath={config.vtuber.modelPath} />
          </group>
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 1.0, 0]} />
      </Canvas>
      {hintVisible && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 px-3 py-2 rounded text-white text-xs pointer-events-none">
          🖱️ Drag to move · Scroll to zoom
        </div>
      )}
    </div>
  );
};
