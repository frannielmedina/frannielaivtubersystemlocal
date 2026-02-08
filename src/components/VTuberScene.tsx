import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const currentAnimation = useStore(state => state.currentAnimation);
  const animationRef = useRef<{
    type: string;
    startTime: number;
    duration: number;
  } | null>(null);
  const modelLoadedRef = useRef(false);

  useEffect(() => {
    // Only load model once
    if (modelLoadedRef.current) return;
    
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    console.log('🎭 Loading VRM model from:', modelPath);

    loader.load(
      modelPath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        
        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        // Rotate model 180 degrees to face camera
        vrm.scene.rotation.y = Math.PI;

        // Set initial neutral pose - arms down
        const humanoid = vrm.humanoid;
        if (humanoid) {
          // Reset arms to natural position
          const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
          const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
          const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
          const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
          
          if (leftUpperArm) {
            leftUpperArm.rotation.set(0, 0, 0.1);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.set(0, 0, -0.1);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.set(0, 0, 0);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.set(0, 0, 0);
          }
        }

        modelLoadedRef.current = true;
        setVrm(vrm);
        console.log('✅ VRM model loaded successfully');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading model: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('❌ Error loading VRM:', error);
        modelLoadedRef.current = false;
      }
    );

    return () => {
      // Cleanup on unmount
      if (vrm) {
        vrm.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
      }
    };
  }, [modelPath]);

  useEffect(() => {
    if (currentAnimation && vrm) {
      console.log('🎬 Playing animation:', currentAnimation.name);
      animationRef.current = {
        type: currentAnimation.name,
        startTime: Date.now(),
        duration: currentAnimation.duration,
      };
    }
  }, [currentAnimation, vrm]);

  useFrame((state, delta) => {
    if (!vrm) return;

    vrm.update(delta);

    if (animationRef.current) {
      const elapsed = Date.now() - animationRef.current.startTime;
      const progress = Math.min(elapsed / animationRef.current.duration, 1);

      applyAnimation(vrm, animationRef.current.type, progress);

      if (progress >= 1) {
        console.log('✅ Animation complete:', animationRef.current.type);
        animationRef.current = null;
        resetToIdlePose(vrm);
      }
    } else {
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

    case 'thumbsup':
      const rightUpperArmT = humanoid.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArmT = humanoid.getNormalizedBoneNode('rightLowerArm');
      if (rightUpperArmT && rightLowerArmT) {
        rightUpperArmT.rotation.z = -0.3;
        rightUpperArmT.rotation.x = t * 0.5;
        rightLowerArmT.rotation.z = -0.5;
      }
      break;
  }

  if (vrm.expressionManager) {
    switch (animationType) {
      case 'celebrate':
      case 'wave':
      case 'thumbsup':
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
      case 'heart':
        vrm.expressionManager.setValue('happy', t);
        break;
    }
  }
}

function applyIdleAnimation(vrm: VRM, time: number) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Gentle breathing animation
  const spine = humanoid.getNormalizedBoneNode('spine');
  const chest = humanoid.getNormalizedBoneNode('chest');
  
  if (spine) {
    spine.rotation.x = Math.sin(time * 0.8) * 0.02;
  }
  
  if (chest) {
    chest.rotation.x = Math.sin(time * 0.8) * 0.015;
  }

  // Subtle head movement
  const head = humanoid.getNormalizedBoneNode('head');
  if (head) {
    head.rotation.y = Math.sin(time * 0.3) * 0.05;
    head.rotation.x = Math.sin(time * 0.5) * 0.03;
  }

  // Keep arms in natural resting position
  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  
  if (leftUpperArm) {
    leftUpperArm.rotation.z = 0.1 + Math.sin(time * 0.6) * 0.02;
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.z = -0.1 + Math.sin(time * 0.6 + Math.PI) * 0.02;
  }

  // Occasional blinking
  if (vrm.expressionManager && Math.random() < 0.001) {
    vrm.expressionManager.setValue('blink', 1);
    setTimeout(() => {
      vrm.expressionManager?.setValue('blink', 0);
    }, 100);
  }
}

function resetToIdlePose(vrm: VRM) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Reset to natural idle pose
  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
  const spine = humanoid.getNormalizedBoneNode('spine');
  const head = humanoid.getNormalizedBoneNode('head');
  const hips = humanoid.getNormalizedBoneNode('hips');

  if (leftUpperArm) leftUpperArm.rotation.set(0, 0, 0.1);
  if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -0.1);
  if (leftLowerArm) leftLowerArm.rotation.set(0, 0, 0);
  if (rightLowerArm) rightLowerArm.rotation.set(0, 0, 0);
  if (spine) spine.rotation.set(0, 0, 0);
  if (head) head.rotation.set(0, 0, 0);
  if (hips) {
    hips.position.set(0, 0, 0);
    hips.rotation.set(0, 0, 0);
  }

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
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 1, 1]} intensity={0.6} />
        <directionalLight position={[-1, -1, -1]} intensity={0.3} />
        
        <group position={vtuberPosition} rotation={vtuberRotation} scale={config.vtuber.scale}>
          <VRMModel modelPath={config.vtuber.modelPath} />
        </group>
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1}
          maxDistance={8}
          target={[0, 0.5, 0]}
        />
      </Canvas>
    </div>
  );
};
