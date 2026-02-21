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
// All possible VRMA track name → VRM humanoid bone name
// Covers: J_Bip_ style, Mixamo style, VRM humanoid style
// ─────────────────────────────────────────────────────────────
const TRACK_TO_HUMANOID: Record<string, string> = {
  // J_Bip style (used by greet.vrma etc.)
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
  // Mixamo style
  'Hips': 'hips', 'Spine': 'spine', 'Spine1': 'chest', 'Spine2': 'upperChest',
  'Neck': 'neck', 'Head': 'head',
  'LeftShoulder': 'leftShoulder', 'LeftArm': 'leftUpperArm', 'LeftForeArm': 'leftLowerArm', 'LeftHand': 'leftHand',
  'RightShoulder': 'rightShoulder', 'RightArm': 'rightUpperArm', 'RightForeArm': 'rightLowerArm', 'RightHand': 'rightHand',
  'LeftUpLeg': 'leftUpperLeg', 'LeftLeg': 'leftLowerLeg', 'LeftFoot': 'leftFoot', 'LeftToeBase': 'leftToes',
  'RightUpLeg': 'rightUpperLeg', 'RightLeg': 'rightLowerLeg', 'RightFoot': 'rightFoot', 'RightToeBase': 'rightToes',
  'LeftHandThumb1': 'leftThumbProximal', 'LeftHandThumb2': 'leftThumbIntermediate', 'LeftHandThumb3': 'leftThumbDistal',
  'LeftHandIndex1': 'leftIndexProximal', 'LeftHandIndex2': 'leftIndexIntermediate', 'LeftHandIndex3': 'leftIndexDistal',
  'LeftHandMiddle1': 'leftMiddleProximal', 'LeftHandMiddle2': 'leftMiddleIntermediate', 'LeftHandMiddle3': 'leftMiddleDistal',
  'LeftHandRing1': 'leftRingProximal', 'LeftHandRing2': 'leftRingIntermediate', 'LeftHandRing3': 'leftRingDistal',
  'LeftHandPinky1': 'leftLittleProximal', 'LeftHandPinky2': 'leftLittleIntermediate', 'LeftHandPinky3': 'leftLittleDistal',
  'RightHandThumb1': 'rightThumbProximal', 'RightHandThumb2': 'rightThumbIntermediate', 'RightHandThumb3': 'rightThumbDistal',
  'RightHandIndex1': 'rightIndexProximal', 'RightHandIndex2': 'rightIndexIntermediate', 'RightHandIndex3': 'rightIndexDistal',
  'RightHandMiddle1': 'rightMiddleProximal', 'RightHandMiddle2': 'rightMiddleIntermediate', 'RightHandMiddle3': 'rightMiddleDistal',
  'RightHandRing1': 'rightRingProximal', 'RightHandRing2': 'rightRingIntermediate', 'RightHandRing3': 'rightRingDistal',
  'RightHandPinky1': 'rightLittleProximal', 'RightHandPinky2': 'rightLittleIntermediate', 'RightHandPinky3': 'rightLittleDistal',
  // VRM humanoid style (already correct, pass through)
  'hips': 'hips', 'spine': 'spine', 'chest': 'chest', 'upperChest': 'upperChest',
  'neck': 'neck', 'head': 'head',
  'leftShoulder': 'leftShoulder', 'leftUpperArm': 'leftUpperArm', 'leftLowerArm': 'leftLowerArm', 'leftHand': 'leftHand',
  'rightShoulder': 'rightShoulder', 'rightUpperArm': 'rightUpperArm', 'rightLowerArm': 'rightLowerArm', 'rightHand': 'rightHand',
  'leftUpperLeg': 'leftUpperLeg', 'leftLowerLeg': 'leftLowerLeg', 'leftFoot': 'leftFoot', 'leftToes': 'leftToes',
  'rightUpperLeg': 'rightUpperLeg', 'rightLowerLeg': 'rightLowerLeg', 'rightFoot': 'rightFoot', 'rightToes': 'rightToes',
  'LeftUpperLeg': 'leftUpperLeg', 'LeftLowerLeg': 'leftLowerLeg', 'LeftToes': 'leftToes',
  'RightUpperLeg': 'rightUpperLeg', 'RightLowerLeg': 'rightLowerLeg', 'RightToes': 'rightToes',
  'LeftUpperArm': 'leftUpperArm', 'LeftLowerArm': 'leftLowerArm',
  'RightUpperArm': 'rightUpperArm', 'RightLowerArm': 'rightLowerArm',
  'LeftThumbProximal': 'leftThumbProximal', 'LeftThumbIntermediate': 'leftThumbIntermediate', 'LeftThumbDistal': 'leftThumbDistal',
  'LeftIndexProximal': 'leftIndexProximal', 'LeftIndexIntermediate': 'leftIndexIntermediate', 'LeftIndexDistal': 'leftIndexDistal',
  'LeftMiddleProximal': 'leftMiddleProximal', 'LeftMiddleIntermediate': 'leftMiddleIntermediate', 'LeftMiddleDistal': 'leftMiddleDistal',
  'LeftRingProximal': 'leftRingProximal', 'LeftRingIntermediate': 'leftRingIntermediate', 'LeftRingDistal': 'leftRingDistal',
  'LeftLittleProximal': 'leftLittleProximal', 'LeftLittleIntermediate': 'leftLittleIntermediate', 'LeftLittleDistal': 'leftLittleDistal',
  'RightThumbProximal': 'rightThumbProximal', 'RightThumbIntermediate': 'rightThumbIntermediate', 'RightThumbDistal': 'rightThumbDistal',
  'RightIndexProximal': 'rightIndexProximal', 'RightIndexIntermediate': 'rightIndexIntermediate', 'RightIndexDistal': 'rightIndexDistal',
  'RightMiddleProximal': 'rightMiddleProximal', 'RightMiddleIntermediate': 'rightMiddleIntermediate', 'RightMiddleDistal': 'rightMiddleDistal',
  'RightRingProximal': 'rightRingProximal', 'RightRingIntermediate': 'rightRingIntermediate', 'RightRingDistal': 'rightRingDistal',
  'RightLittleProximal': 'rightLittleProximal', 'RightLittleIntermediate': 'rightLittleIntermediate', 'RightLittleDistal': 'rightLittleDistal',
};

/**
 * Retarget a raw VRMA clip to the VRM's actual normalized bone node names.
 * The mixer runs on vrm.scene; getNormalizedBoneNode() returns the Object3D
 * whose .name is the key we need for the track.
 */
function retargetClip(raw: THREE.AnimationClip, vrm: VRM): THREE.AnimationClip | null {
  const h = vrm.humanoid;
  if (!h) return null;

  // Build: humanoidBoneName → actual Object3D name inside vrm.scene
  const humanoidToNodeName = new Map<string, string>();
  for (const humanoidName of Object.values(TRACK_TO_HUMANOID)) {
    if (humanoidToNodeName.has(humanoidName)) continue;
    try {
      const node = h.getNormalizedBoneNode(humanoidName as any);
      if (node) humanoidToNodeName.set(humanoidName, node.name);
    } catch {}
  }

  // Debug: log what nodes we found (first time only)
  if (humanoidToNodeName.size > 0) {
    const sample = [...humanoidToNodeName.entries()].slice(0, 4);
    console.log('[VRMA] humanoidToNodeName sample:', sample);
  }

  const newTracks: THREE.KeyframeTrack[] = [];
  let logged = false;
  for (const track of raw.tracks) {
    const dot = track.name.indexOf('.');
    if (dot === -1) continue;
    const trackBone = track.name.substring(0, dot);
    const prop      = track.name.substring(dot);

    const humanoidName = TRACK_TO_HUMANOID[trackBone];
    if (!humanoidName) continue;
    const nodeName = humanoidToNodeName.get(humanoidName);
    if (!nodeName) continue;

    if (!logged) {
      console.log('[VRMA] Retarget sample — track:', trackBone, '→ humanoid:', humanoidName, '→ node:', nodeName);
      logged = true;
    }

    const t = track.clone();
    t.name  = nodeName + prop;
    newTracks.push(t);
  }

  if (newTracks.length === 0) return null;
  return new THREE.AnimationClip(raw.name, raw.duration, newTracks);
}

// Cache retargeted clips per VRM instance
const clipCache = new Map<string, THREE.AnimationClip | null>();

function loadClip(url: string, vrm: VRM): Promise<THREE.AnimationClip | null> {
  const key = url + '|' + vrm.scene.uuid;
  return new Promise((resolve) => {
    if (clipCache.has(key)) { resolve(clipCache.get(key)!); return; }
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      if (!gltf.animations?.length) { clipCache.set(key, null); resolve(null); return; }
      const retargeted = retargetClip(gltf.animations[0], vrm);
      clipCache.set(key, retargeted);
      resolve(retargeted);
    }, undefined, () => { resolve(null); });
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
// Idle animation
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
  if (lUA) lUA.rotation.z = 1.2  + Math.sin(t * 0.6) * 0.02;
  if (rUA) rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02;
  if (lLA) lLA.rotation.z = 0.3  + Math.sin(t * 0.5) * 0.02;
  if (rLA) rLA.rotation.z = -0.3 + Math.sin(t * 0.5 + Math.PI) * 0.02;
  if (hips) hips.position.y = Math.sin(t * 0.5) * 0.01;
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
  const hipsBaseYRef     = useRef<number>(0); // Y position of hips at rest
  const currentAnimation = useStore((s) => s.currentAnimation);

  // ── Load VRM ─────────────────────────────────────────────────
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

        // Calculate the model's floor offset so feet land at Y=0
        // We do this by computing the bounding box after the first frame
        // Store the scene Y offset needed to ground the model
        loaded.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(loaded.scene);
        // box.min.y is the lowest point (feet). We push scene up by -box.min.y
        // so feet land at world Y=0. Typically negative since model is centered.
        hipsBaseYRef.current = -box.min.y;
        loaded.scene.position.y = hipsBaseYRef.current;

        // Mixer on vrm.scene — normalized bone nodes live here
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

  // ── Play VRMA ────────────────────────────────────────────────
  useEffect(() => {
    if (!vrm || !mixerRef.current || !currentAnimation) return;
    const key   = EMOTE_MAP[currentAnimation.name.toLowerCase()] ?? currentAnimation.name.toLowerCase();
    const files = VRMA_ANIMATIONS[key];
    if (!files) return;
    const file = pickRandom(files);

    (async () => {
      const mixer = mixerRef.current;
      if (!mixer) return;

      // Stop any current action cleanly
      mixer.stopAllAction();
      currentActionRef.current = null;

      const clip = await loadClip(file, vrm);
      if (!clip || !mixerRef.current) return;

      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.play();
      currentActionRef.current = action;

      // Use 'finished' event for precise cleanup
      const onFinished = (e: any) => {
        if (e.action !== action) return;
        mixer.removeEventListener('finished', onFinished);
        mixer.stopAllAction();
        currentActionRef.current = null;
        vrm.scene.position.set(0, hipsBaseYRef.current, 0);
        vrm.scene.rotation.set(0, Math.PI, 0);
        resetToIdlePose(vrm);
      };
      mixer.addEventListener('finished', onFinished);

      // Safety fallback
      setTimeout(() => {
        mixer.removeEventListener('finished', onFinished);
        if (currentActionRef.current === action) {
          mixer.stopAllAction();
          currentActionRef.current = null;
          vrm.scene.position.set(0, hipsBaseYRef.current, 0);
          vrm.scene.rotation.set(0, Math.PI, 0);
          resetToIdlePose(vrm);
        }
      }, clip.duration * 1000 + 1500);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  // ── Frame loop ───────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!vrm) return;
    mixerRef.current?.update(delta);

    vrm.update(delta);

    // Keep model grounded: restore scene position so animations don't drift
    vrm.scene.position.set(0, hipsBaseYRef.current, 0);
    if (!currentActionRef.current) {
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }
    // Blinking
    const b = blinkRef.current;
    const t = state.clock.elapsedTime;
    if (vrm.expressionManager) {
      if (b.isBlinking) {
        const e = t - b.blinkStart;
        if (e < 0.15) { vrm.expressionManager.setValue('blink', Math.sin((e / 0.15) * Math.PI)); }
        else { vrm.expressionManager.setValue('blink', 0); b.isBlinking = false; }
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
        <directionalLight position={[1, 1, 1]} intensity={0.7} />
        <directionalLight position={[-1, -1, -1]} intensity={0.4} />
        <pointLight position={[0, 2, 2]} intensity={0.5} />
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
