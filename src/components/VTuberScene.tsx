import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';
import type { VTuberAnimation, EmoteType } from '@/types';

const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const currentAnimation = useStore(state => state.currentAnimation);
  const animationRef = useRef<{
    type: string;
    startTime: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelPath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        
        // Setup model
        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        setVrm(vrm);
      },
      (progress) => {
        console.log('Loading model:', (progress.loaded / progress.total) * 100, '%');
      },
      (error) => {
        console.error('Error loading VRM:', error);
      }
    );
  }, [modelPath]);

  useEffect(() => {
    if (currentAnimation && vrm) {
      animationRef.current = {
        type: currentAnimation.name,
        startTime: Date.now(),
        duration: currentAnimation.duration,
      };
    }
  }, [currentAnimation, vrm]);

  useFrame((state, delta) => {
    if (!vrm) return;

    // Update VRM
    vrm.update(delta);

    // Handle animations
    if (animationRef.current) {
      const elapsed = Date.now() - animationRef.current.startTime;
      const progress = Math.min(elapsed / animationRef.current.duration, 1);

      applyAnimation(vrm, animationRef.current.type, progress);

      if (progress >= 1) {
        animationRef.current = null;
        resetPose(vrm);
      }
    } else {
      // Idle animation
      applyIdleAnimation(vrm, state.clock.elapsedTime);
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} />;
};

function applyAnimation(vrm: VRM, animationType: string, progress: number) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const t = easeInOutCubic(progress);

  switch (animationType) {
    case 'wave':
      const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
      if (rightUpperArm && rightLowerArm) {
        rightUpperArm.rotation.z = Math.sin(progress * Math.PI * 4) * 0.8 - 0.5;
        rightLowerArm.rotation.z = Math.sin(progress * Math.PI * 4) * 0.3;
      }
      break;

    case 'celebrate':
      const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmC = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (leftUpperArm && rightUpperArmC) {
        leftUpperArm.rotation.z = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
        rightUpperArmC.rotation.z = Math.sin(progress * Math.PI * 2) * 0.5 - 0.5;
      }
      break;

    case 'bow':
      const spine = humanoid.getNormalizedBoneNode('spine');
      if (spine) {
        spine.rotation.x = Math.sin(t * Math.PI) * 0.5;
      }
      break;

    case 'dance':
      const hips = humanoid.getNormalizedBoneNode('hips');
      if (hips) {
        hips.position.y = Math.sin(progress * Math.PI * 8) * 0.1;
        hips.rotation.y = Math.sin(progress * Math.PI * 4) * 0.2;
      }
      break;

    case 'think':
      const head = humanoid.getNormalizedBoneNode('head');
      const rightHand = humanoid.getNormalizedBoneNode('rightHand');
      if (head && rightHand) {
        head.rotation.x = t * 0.2;
        rightHand.position.z = t * 0.3;
      }
      break;
  }

  // Update expressions
  if (vrm.expressionManager) {
    switch (animationType) {
      case 'celebrate':
      case 'wave':
        vrm.expressionManager.setValue('happy', t);
        break;
      case 'sad':
        vrm.expressionManager.setValue('sad', t);
        break;
      case 'angry':
        vrm.expressionManager.setValue('angry', t);
        break;
      case 'surprised':
        vrm.expressionManager.setValue('surprised', t);
        break;
    }
  }
}

function applyIdleAnimation(vrm: VRM, time: number) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Subtle breathing animation
  const spine = humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    spine.rotation.x = Math.sin(time * 2) * 0.02;
  }

  // Blink occasionally
  if (vrm.expressionManager && Math.random() < 0.001) {
    vrm.expressionManager.setValue('blink', 1);
    setTimeout(() => {
      vrm.expressionManager?.setValue('blink', 0);
    }, 100);
  }
}

function resetPose(vrm: VRM) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  humanoid.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, 0);
  humanoid.getNormalizedBoneNode('rightLowerArm')?.rotation.set(0, 0, 0);
  humanoid.getNormalizedBoneNode('leftUpperArm')?.rotation.set(0, 0, 0);
  humanoid.getNormalizedBoneNode('spine')?.rotation.set(0, 0, 0);
  humanoid.getNormalizedBoneNode('head')?.rotation.set(0, 0, 0);

  if (vrm.expressionManager) {
    vrm.expressionManager.setValue('happy', 0);
    vrm.expressionManager.setValue('sad', 0);
    vrm.expressionManager.setValue('angry', 0);
    vrm.expressionManager.setValue('surprised', 0);
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const VTuberScene: React.FC = () => {
  const config = useStore(state => state.config);
  const vtuberPosition = useStore(state => state.vtuberPosition);
  const vtuberRotation = useStore(state => state.vtuberRotation);

  return (
    <div className="w-full h-full bg-gradient-to-b from-purple-900 to-blue-900">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 30 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 1, 1]} intensity={0.6} />
        <directionalLight position={[-1, -1, -1]} intensity={0.3} />
        
        <group position={vtuberPosition} rotation={vtuberRotation}>
          <VRMModel modelPath={config.vtuber.modelPath} />
        </group>
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={10}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};
