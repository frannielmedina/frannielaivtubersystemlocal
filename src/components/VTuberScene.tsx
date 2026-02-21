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
// THE ROOT PROBLEM (and fix):
//
// VRMUtils.removeUnnecessaryJoints() strips real bone nodes from vrm.scene.
// After that, the VRM humanoid creates "normalized" proxy bones that live
// in a separate sub-tree. AnimationMixer targets nodes by NAME inside the
// root object you pass to it.
//
// The VRMA files use different naming conventions:
//   - Some use "J_Bip_C_Hips" style  (raw VRM bone names)
//   - Some use "LeftUpperArm" style   (VRM humanoid normalized names)
//
// SOLUTION: Build a synthetic "proxy scene" that contains one Object3D per
// humanoid bone, named with ALL possible aliases for that bone. Then create
// the AnimationMixer on that proxy scene. This way the mixer finds every bone
// regardless of which naming convention the VRMA uses.
// ─────────────────────────────────────────────────────────────

// VRM humanoid bone name → all possible track name aliases used by VRMA files
const BONE_ALIASES: Record<string, string[]> = {
  hips:              ['hips', 'Hips', 'J_Bip_C_Hips'],
  spine:             ['spine', 'Spine', 'J_Bip_C_Spine'],
  chest:             ['chest', 'Chest', 'Spine1', 'J_Bip_C_Chest'],
  upperChest:        ['upperChest', 'UpperChest', 'Spine2', 'J_Bip_C_UpperChest'],
  neck:              ['neck', 'Neck', 'J_Bip_C_Neck'],
  head:              ['head', 'Head', 'J_Bip_C_Head'],
  leftShoulder:      ['leftShoulder', 'LeftShoulder', 'J_Bip_L_Shoulder'],
  leftUpperArm:      ['leftUpperArm', 'LeftUpperArm', 'LeftArm', 'J_Bip_L_UpperArm'],
  leftLowerArm:      ['leftLowerArm', 'LeftLowerArm', 'LeftForeArm', 'J_Bip_L_LowerArm'],
  leftHand:          ['leftHand', 'LeftHand', 'J_Bip_L_Hand'],
  rightShoulder:     ['rightShoulder', 'RightShoulder', 'J_Bip_R_Shoulder'],
  rightUpperArm:     ['rightUpperArm', 'RightUpperArm', 'RightArm', 'J_Bip_R_UpperArm'],
  rightLowerArm:     ['rightLowerArm', 'RightLowerArm', 'RightForeArm', 'J_Bip_R_LowerArm'],
  rightHand:         ['rightHand', 'RightHand', 'J_Bip_R_Hand'],
  leftUpperLeg:      ['leftUpperLeg', 'LeftUpperLeg', 'LeftUpLeg', 'J_Bip_L_UpperLeg'],
  leftLowerLeg:      ['leftLowerLeg', 'LeftLowerLeg', 'LeftLeg', 'J_Bip_L_LowerLeg'],
  leftFoot:          ['leftFoot', 'LeftFoot', 'J_Bip_L_Foot'],
  leftToes:          ['leftToes', 'LeftToes', 'LeftToeBase', 'J_Bip_L_ToeBase'],
  rightUpperLeg:     ['rightUpperLeg', 'RightUpperLeg', 'RightUpLeg', 'J_Bip_R_UpperLeg'],
  rightLowerLeg:     ['rightLowerLeg', 'RightLowerLeg', 'RightLeg', 'J_Bip_R_LowerLeg'],
  rightFoot:         ['rightFoot', 'RightFoot', 'J_Bip_R_Foot'],
  rightToes:         ['rightToes', 'RightToes', 'RightToeBase', 'J_Bip_R_ToeBase'],
  // Fingers left
  leftThumbProximal:      ['leftThumbProximal', 'LeftThumbProximal', 'LeftHandThumb1', 'J_Bip_L_Thumb1'],
  leftThumbIntermediate:  ['leftThumbIntermediate', 'LeftThumbIntermediate', 'LeftHandThumb2', 'J_Bip_L_Thumb2'],
  leftThumbDistal:        ['leftThumbDistal', 'LeftThumbDistal', 'LeftHandThumb3', 'J_Bip_L_Thumb3'],
  leftIndexProximal:      ['leftIndexProximal', 'LeftIndexProximal', 'LeftHandIndex1', 'J_Bip_L_Index1'],
  leftIndexIntermediate:  ['leftIndexIntermediate', 'LeftIndexIntermediate', 'LeftHandIndex2', 'J_Bip_L_Index2'],
  leftIndexDistal:        ['leftIndexDistal', 'LeftIndexDistal', 'LeftHandIndex3', 'J_Bip_L_Index3'],
  leftMiddleProximal:     ['leftMiddleProximal', 'LeftMiddleProximal', 'LeftHandMiddle1', 'J_Bip_L_Middle1'],
  leftMiddleIntermediate: ['leftMiddleIntermediate', 'LeftMiddleIntermediate', 'LeftHandMiddle2', 'J_Bip_L_Middle2'],
  leftMiddleDistal:       ['leftMiddleDistal', 'LeftMiddleDistal', 'LeftHandMiddle3', 'J_Bip_L_Middle3'],
  leftRingProximal:       ['leftRingProximal', 'LeftRingProximal', 'LeftHandRing1', 'J_Bip_L_Ring1'],
  leftRingIntermediate:   ['leftRingIntermediate', 'LeftRingIntermediate', 'LeftHandRing2', 'J_Bip_L_Ring2'],
  leftRingDistal:         ['leftRingDistal', 'LeftRingDistal', 'LeftHandRing3', 'J_Bip_L_Ring3'],
  leftLittleProximal:     ['leftLittleProximal', 'LeftLittleProximal', 'LeftHandPinky1', 'J_Bip_L_Little1'],
  leftLittleIntermediate: ['leftLittleIntermediate', 'LeftLittleIntermediate', 'LeftHandPinky2', 'J_Bip_L_Little2'],
  leftLittleDistal:       ['leftLittleDistal', 'LeftLittleDistal', 'LeftHandPinky3', 'J_Bip_L_Little3'],
  // Fingers right
  rightThumbProximal:      ['rightThumbProximal', 'RightThumbProximal', 'RightHandThumb1', 'J_Bip_R_Thumb1'],
  rightThumbIntermediate:  ['rightThumbIntermediate', 'RightThumbIntermediate', 'RightHandThumb2', 'J_Bip_R_Thumb2'],
  rightThumbDistal:        ['rightThumbDistal', 'RightThumbDistal', 'RightHandThumb3', 'J_Bip_R_Thumb3'],
  rightIndexProximal:      ['rightIndexProximal', 'RightIndexProximal', 'RightHandIndex1', 'J_Bip_R_Index1'],
  rightIndexIntermediate:  ['rightIndexIntermediate', 'RightIndexIntermediate', 'RightHandIndex2', 'J_Bip_R_Index2'],
  rightIndexDistal:        ['rightIndexDistal', 'RightIndexDistal', 'RightHandIndex3', 'J_Bip_R_Index3'],
  rightMiddleProximal:     ['rightMiddleProximal', 'RightMiddleProximal', 'RightHandMiddle1', 'J_Bip_R_Middle1'],
  rightMiddleIntermediate: ['rightMiddleIntermediate', 'RightMiddleIntermediate', 'RightHandMiddle2', 'J_Bip_R_Middle2'],
  rightMiddleDistal:       ['rightMiddleDistal', 'RightMiddleDistal', 'RightHandMiddle3', 'J_Bip_R_Middle3'],
  rightRingProximal:       ['rightRingProximal', 'RightRingProximal', 'RightHandRing1', 'J_Bip_R_Ring1'],
  rightRingIntermediate:   ['rightRingIntermediate', 'RightRingIntermediate', 'RightHandRing2', 'J_Bip_R_Ring2'],
  rightRingDistal:         ['rightRingDistal', 'RightRingDistal', 'RightHandRing3', 'J_Bip_R_Ring3'],
  rightLittleProximal:     ['rightLittleProximal', 'RightLittleProximal', 'RightHandPinky1', 'J_Bip_R_Little1'],
  rightLittleIntermediate: ['rightLittleIntermediate', 'RightLittleIntermediate', 'RightHandPinky2', 'J_Bip_R_Little2'],
  rightLittleDistal:       ['rightLittleDistal', 'RightLittleDistal', 'RightHandPinky3', 'J_Bip_R_Little3'],
};

/**
 * Build a proxy scene containing one Object3D per bone alias.
 * Each Object3D is linked to the real VRM normalized bone node so
 * that position/quaternion changes on the proxy propagate to the real bone.
 *
 * The mixer targets this proxy scene, which has every possible alias name.
 */
function buildProxyScene(vrm: VRM): { proxyRoot: THREE.Object3D; aliasMap: Map<string, THREE.Object3D> } {
  const proxyRoot = new THREE.Object3D();
  proxyRoot.name  = '__vrma_proxy_root__';
  const aliasMap  = new Map<string, THREE.Object3D>();

  const h = vrm.humanoid;
  if (!h) return { proxyRoot, aliasMap };

  for (const [boneName, aliases] of Object.entries(BONE_ALIASES)) {
    const realNode = h.getNormalizedBoneNode(boneName as any);
    if (!realNode) continue;

    // First alias gets a proxy that directly wraps the real node's transform
    for (const alias of aliases) {
      if (aliasMap.has(alias)) continue;

      const proxy = new THREE.Object3D();
      proxy.name  = alias;

      // Sync proxy → real node every frame via onBeforeRender won't work here.
      // Instead we create a proper forwarding relationship:
      // The mixer will write to proxy.quaternion/position/scale,
      // and we manually copy those values to realNode in the frame loop.
      aliasMap.set(alias, proxy);
      proxyRoot.add(proxy);
    }
  }

  return { proxyRoot, aliasMap };
}

/**
 * Copy proxy transforms → real VRM normalized bone nodes.
 * Called every frame after mixer.update().
 */
function syncProxyToVRM(vrm: VRM, aliasMap: Map<string, THREE.Object3D>) {
  const h = vrm.humanoid;
  if (!h) return;

  for (const [boneName] of Object.entries(BONE_ALIASES)) {
    const realNode = h.getNormalizedBoneNode(boneName as any);
    if (!realNode) continue;

    // Use the first alias proxy as the canonical source
    const primaryAlias = BONE_ALIASES[boneName][0];
    const proxy = aliasMap.get(primaryAlias);
    if (!proxy) continue;

    realNode.quaternion.copy(proxy.quaternion);
    realNode.position.copy(proxy.position);
  }
}

// Raw clip cache (no retargeting needed, proxy handles it)
const rawClipCache = new Map<string, THREE.AnimationClip>();

/**
 * Load VRMA and rewrite track names to match the proxy scene aliases.
 * We build a per-VRM retargeted clip.
 */
function loadAndRetargetClip(
  url: string,
  aliasMap: Map<string, THREE.Object3D>
): Promise<THREE.AnimationClip | null> {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!gltf.animations?.length) { resolve(null); return; }
        const raw = gltf.animations[0];

        // Remap: keep only tracks whose bone name exists in aliasMap
        // (i.e. we know how to handle them), and normalize the track name
        // to the alias that's actually in the proxy scene.
        const newTracks: THREE.KeyframeTrack[] = [];
        for (const track of raw.tracks) {
          const dot      = track.name.indexOf('.');
          if (dot === -1) continue;
          const boneName = track.name.substring(0, dot);
          const prop     = track.name.substring(dot);
          // Check if this alias is in our proxy
          if (aliasMap.has(boneName)) {
            const t = track.clone();
            t.name  = boneName + prop; // keep as-is, proxy has this exact name
            newTracks.push(t);
          }
        }

        if (newTracks.length === 0) {
          console.warn('[VRMA] No usable tracks in', url);
          resolve(null);
          return;
        }

        const clip = new THREE.AnimationClip(raw.name, raw.duration, newTracks);
        resolve(clip);
      },
      undefined,
      (err) => { console.warn('[VRMA] Error loading', url, err); resolve(null); }
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
  if (lUA) lUA.rotation.z = 1.2  + Math.sin(t * 0.6) * 0.02;
  if (rUA) rUA.rotation.z = -1.2 + Math.sin(t * 0.6 + Math.PI) * 0.02;
  if (lLA) lLA.rotation.z = 0.3  + Math.sin(t * 0.5) * 0.02;
  if (rLA) rLA.rotation.z = -0.3 + Math.sin(t * 0.5 + Math.PI) * 0.02;
  if (hips) hips.position.y = Math.sin(t * 0.5) * 0.01;
}

function resetToIdlePose(vrm: VRM, aliasMap: Map<string, THREE.Object3D>) {
  const h = vrm.humanoid;
  if (!h) return;
  const allBones = Object.keys(BONE_ALIASES);
  allBones.forEach((n) => {
    const b = h.getNormalizedBoneNode(n as any);
    if (b) { b.rotation.set(0, 0, 0); b.position.set(0, 0, 0); }
    // Also reset proxy
    const proxy = aliasMap.get(BONE_ALIASES[n][0]);
    if (proxy) { proxy.rotation.set(0, 0, 0); proxy.position.set(0, 0, 0); }
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
  const proxyRootRef     = useRef<THREE.Object3D | null>(null);
  const aliasMapRef      = useRef<Map<string, THREE.Object3D>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const modelLoadedRef   = useRef(false);
  const blinkRef         = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
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

        // NOTE: Do NOT call removeUnnecessaryJoints — it destroys bones we need
        loaded.scene.traverse((o) => { o.frustumCulled = false; });
        loaded.scene.rotation.y = Math.PI;

        // Set idle arm pose
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

        // Build proxy scene with all bone aliases
        const { proxyRoot, aliasMap } = buildProxyScene(loaded);
        proxyRootRef.current  = proxyRoot;
        aliasMapRef.current   = aliasMap;

        // Mixer targets the PROXY scene, not vrm.scene
        mixerRef.current = new THREE.AnimationMixer(proxyRoot);

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

  // ── Play animation ───────────────────────────────────────────
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

      const clip = await loadAndRetargetClip(file, aliasMapRef.current);
      if (!clip || !mixerRef.current) return;

      const action = mixerRef.current.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.fadeIn(0.3).play();
      currentActionRef.current = action;

      const dur = clip.duration * 1000;
      setTimeout(() => {
        if (currentActionRef.current === action) {
          action.fadeOut(0.5);
          currentActionRef.current = null;
        }
        resetToIdlePose(vrm, aliasMapRef.current);
      }, dur + 200);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  // ── Frame loop ───────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!vrm) return;

    // 1. Update mixer (writes to proxy nodes)
    mixerRef.current?.update(delta);

    // 2. Copy proxy transforms → real VRM bones
    if (currentActionRef.current) {
      syncProxyToVRM(vrm, aliasMapRef.current);
    } else {
      // Idle animation drives real bones directly
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }

    // 3. Update VRM (physics, lookAt, expressions)
    vrm.update(delta);

    // 4. Blinking
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
        b.isBlinking = true; b.blinkStart = t; b.lastBlink = t;
      }
    }
  });

  if (isLoading) return (
    <Text position={[0,0,0]} fontSize={0.3} color="#fff" anchorX="center">Loading…</Text>
  );
  if (loadError) return (
    <group>
      <Text position={[0,0.3,0]} fontSize={0.17} color="#ff6b6b" anchorX="center" maxWidth={4}>{loadError}</Text>
      <Text position={[0,-0.1,0]} fontSize={0.13} color="#aaa" anchorX="center" maxWidth={4}>Place model at /public/models/miko.vrm</Text>
    </group>
  );
  if (!vrm) return (
    <Text position={[0,0,0]} fontSize={0.2} color="#ccc" anchorX="center">Initializing…</Text>
  );
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
