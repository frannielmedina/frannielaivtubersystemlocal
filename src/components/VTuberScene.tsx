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
  // J_Bip style (standard VRM)
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
  // VRM humanoid style (pass-through)
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
// WHY ANIMATIONS APPEAR MIRRORED / INVERTED
// ─────────────────────────────────────────────────────────────────────────────
// VRMA files store bone rotations in the model's LOCAL space, assuming the
// character faces the camera (i.e. the VRM root is NOT rotated).
//
// We set `loaded.scene.rotation.y = Math.PI` so the model faces the camera
// without needing the camera to orbit. This 180° rotation causes the
// AnimationMixer to apply bone quaternions that were authored for a
// forward-facing model — but the root is now flipped — so every rotation
// appears mirrored left↔right.
//
// FIX: Instead of rotating the scene, we rotate the CAMERA/group or we
// simply DON'T set rotation.y = Math.PI and instead adjust the camera
// position. The cleanest fix with zero animation math is to:
//   1. Keep scene.rotation.y = 0 (default, model faces +Z / away from camera)
//   2. Move the camera to Z = -3.2 (behind the model) so it faces the camera
//      — but this feels unnatural in Three.js.
//
// ACTUAL CLEANEST FIX: Remove rotation.y = Math.PI from the scene and instead
// wrap the VRMModel <primitive> in a <group rotation-y={Math.PI}> at the
// React/Three level — but this still causes the same inversion.
//
// THE REAL FIX: Keep rotation.y = Math.PI. In retargetClip(), mirror EVERY
// quaternion track by negating its X and Z components. This mathematically
// conjugates the rotation across the Y axis, exactly cancelling the π flip.
// For positions: negate the X component (left↔right flip).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirror a quaternion keyframe track to correct animation inversion caused by
 * a 180° (Math.PI) Y-axis rotation on the VRM scene root.
 *
 * A quaternion Q represents a rotation. When the parent has rotation.y = π,
 * the effective rotation seen in world space is: R_parent * Q.
 * To get the SAME world-space rotation without the parent flip, we need Q' such that:
 *   R_parent * Q' = Q  →  Q' = R_parent⁻¹ * Q
 *
 * For rotation.y = π, the conjugate flip is: negate X and Z, keep Y and W.
 * This is equivalent to: q' = (-qx, qy, -qz, qw)
 */
function mirrorQuaternionTrack(track: THREE.QuaternionKeyframeTrack): THREE.QuaternionKeyframeTrack {
  const src = track.values;
  const dst = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = -src[i];      // x → -x
    dst[i + 1] =  src[i + 1]; // y → y
    dst[i + 2] = -src[i + 2]; // z → -z
    dst[i + 3] =  src[i + 3]; // w → w
  }
  return new THREE.QuaternionKeyframeTrack(
    track.name,
    Array.from(track.times),
    Array.from(dst),
  );
}

/**
 * Mirror a position keyframe track: negate X (left↔right flip).
 */
function mirrorPositionTrack(track: THREE.VectorKeyframeTrack): THREE.VectorKeyframeTrack {
  const src = track.values;
  const dst = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    dst[i]     = -src[i];      // x → -x
    dst[i + 1] =  src[i + 1]; // y → y
    dst[i + 2] =  src[i + 2]; // z → z
  }
  return new THREE.VectorKeyframeTrack(
    track.name,
    Array.from(track.times),
    Array.from(dst),
  );
}

/**
 * Retarget a raw VRMA AnimationClip to the VRM's actual bone node names,
 * strip hips position (to prevent floating), and mirror all tracks so
 * animations look correct when scene has rotation.y = Math.PI.
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
    } catch { /* bone doesn't exist in this VRM */ }
  }

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of raw.tracks) {
    const dot = track.name.indexOf('.');
    if (dot === -1) continue;
    const trackBone = track.name.substring(0, dot);
    const prop      = track.name.substring(dot); // ".position" | ".quaternion" | ".scale"

    const humanoidName = TRACK_TO_HUMANOID[trackBone];
    if (!humanoidName) continue;
    const nodeName = humanoidToNodeName.get(humanoidName);
    if (!nodeName) continue;

    // ── Skip hips POSITION — prevents character floating ──────────────
    if (humanoidName === 'hips' && prop === '.position') continue;

    const renamedTrack = track.clone();
    renamedTrack.name  = nodeName + prop;

    // ── Mirror tracks to correct 180° scene rotation inversion ────────
    if (prop === '.quaternion' && renamedTrack instanceof THREE.QuaternionKeyframeTrack) {
      newTracks.push(mirrorQuaternionTrack(renamedTrack));
    } else if (prop === '.position' && renamedTrack instanceof THREE.VectorKeyframeTrack) {
      newTracks.push(mirrorPositionTrack(renamedTrack));
    } else {
      newTracks.push(renamedTrack);
    }
  }

  if (newTracks.length === 0) return null;
  return new THREE.AnimationClip(raw.name, raw.duration, newTracks);
}

// Cache retargeted clips per VRM instance to avoid re-processing
const clipCache = new Map<string, THREE.AnimationClip | null>();

function loadClip(url: string, vrm: VRM): Promise<THREE.AnimationClip | null> {
  const key = url + '|' + vrm.scene.uuid;
  return new Promise((resolve) => {
    if (clipCache.has(key)) { resolve(clipCache.get(key) ?? null); return; }
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!gltf.animations?.length) { clipCache.set(key, null); resolve(null); return; }
        const retargeted = retargetClip(gltf.animations[0], vrm);
        clipCache.set(key, retargeted);
        resolve(retargeted);
      },
      undefined,
      () => { resolve(null); }
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
// Idle breathing animation (only when no VRMA playing)
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
  // Restore natural arm drape
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
// VRM Model component
// ─────────────────────────────────────────────────────────────
const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm,       setVrm]       = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mixerRef             = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef     = useRef<THREE.AnimationAction | null>(null);
  const modelLoadedRef       = useRef(false);
  const blinkRef             = useRef({ lastBlink: 0, isBlinking: false, blinkStart: 0 });
  const sceneGroundOffsetRef = useRef<number>(0);

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

        // Rotate 180° so model faces the camera.
        // All VRMA tracks are mirrored in retargetClip() to compensate.
        loaded.scene.rotation.y = Math.PI;

        // Set idle arm pose before measuring bounding box
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

        // Ground the model: measure bounding box, lift so feet are at Y=0
        loaded.scene.position.set(0, 0, 0);
        loaded.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(loaded.scene);
        const groundOffset = -box.min.y;
        sceneGroundOffsetRef.current = groundOffset;
        loaded.scene.position.y = groundOffset;

        mixerRef.current   = new THREE.AnimationMixer(loaded.scene);
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

  // ── Play VRMA animation ──────────────────────────────────────
  useEffect(() => {
    if (!vrm || !mixerRef.current || !currentAnimation) return;
    const key   = EMOTE_MAP[currentAnimation.name.toLowerCase()] ?? currentAnimation.name.toLowerCase();
    const files = VRMA_ANIMATIONS[key];
    if (!files) return;
    const file = pickRandom(files);

    (async () => {
      const mixer = mixerRef.current;
      if (!mixer) return;

      mixer.stopAllAction();
      currentActionRef.current = null;

      const clip = await loadClip(file, vrm);
      if (!clip || !mixerRef.current) return;

      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      currentActionRef.current = action;

      const onFinished = (e: any) => {
        if (e.action !== action) return;
        mixer.removeEventListener('finished', onFinished);
        mixer.stopAllAction();
        currentActionRef.current = null;
        resetToIdlePose(vrm);
        vrm.scene.position.y = sceneGroundOffsetRef.current;
      };
      mixer.addEventListener('finished', onFinished);

      // Safety timeout in case 'finished' never fires
      setTimeout(() => {
        mixer.removeEventListener('finished', onFinished);
        if (currentActionRef.current === action) {
          mixer.stopAllAction();
          currentActionRef.current = null;
          resetToIdlePose(vrm);
          vrm.scene.position.y = sceneGroundOffsetRef.current;
        }
      }, clip.duration * 1000 + 1500);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimation]);

  // ── Frame loop ───────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!vrm) return;
    mixerRef.current?.update(delta);

    // Keep model grounded at all times
    vrm.scene.position.y = sceneGroundOffsetRef.current;

    vrm.update(delta);

    // Idle breathing only when no VRMA is active
    if (!currentActionRef.current) {
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }

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

  if (isLoading) return <Text position={[0,0,0]} fontSize={0.3} color="#fff" anchorX="center">Loading…</Text>;
  if (loadError) return (
    <group>
      <Text position={[0, 0.3,0]} fontSize={0.17} color="#ff6b6b" anchorX="center" maxWidth={4}>{loadError}</Text>
      <Text position={[0,-0.1,0]} fontSize={0.13} color="#aaa"    anchorX="center" maxWidth={4}>Place model at /public/models/miko.vrm</Text>
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    showHint();
  };
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
        <directionalLight position={[-1,-1,-1]} intensity={0.4} />
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
