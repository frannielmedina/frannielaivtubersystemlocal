import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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

        // Set initial idle pose - arms slightly raised for visible movement
        const humanoid = vrm.humanoid;
        if (humanoid) {
          const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
          const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
          const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
          const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
          
          // Arms slightly raised for more visible idle animation
          if (leftUpperArm) {
            leftUpperArm.rotation.set(0, 0, 0.3);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.set(0, 0, -0.3);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.set(0, 0, 0.1);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.set(0, 0, -0.1);
          }
        }

        modelLoadedRef.current = true;
        setVrm(vrm);
        setLoadError(null);
        console.log('✅ VRM model loaded successfully');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`📊 Loading model: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('❌ Error loading VRM:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load VRM model';
        setLoadError(errorMessage);
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

  if (loadError) {
    return (
      <mesh>
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial color="#ff00ff" />
      </mesh>
    );
  }

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
        rightUpperArm.rotation.x = -0.3;
        rightLowerArm.rotation.z = Math.sin(progress * Math.PI * 4) * 0.3;
      }
      break;

    case 'celebrate':
      const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmC = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (leftUpperArm && rightUpperArmC) {
        leftUpperArm.rotation.z = Math.sin(progress * Math.PI * 3) * 0.6 + 0.8;
        leftUpperArm.rotation.x = -0.3;
        rightUpperArmC.rotation.z = Math.sin(progress * Math.PI * 3) * 0.6 - 0.8;
        rightUpperArmC.rotation.x = -0.3;
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
      const leftUpperArmD = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmD = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (hips) {
        hips.position.y = Math.sin(progress * Math.PI * 8) * 0.15;
        hips.rotation.y = Math.sin(progress * Math.PI * 4) * 0.3;
      }
      if (leftUpperArmD && rightUpperArmD) {
        leftUpperArmD.rotation.z = Math.sin(progress * Math.PI * 6) * 0.5 + 0.5;
        rightUpperArmD.rotation.z = Math.sin(progress * Math.PI * 6 + Math.PI) * 0.5 - 0.5;
      }
      break;

    case 'think':
      const head = humanoid.getNormalizedBoneNode('head');
      const rightHandT = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (head) {
        head.rotation.x = t * 0.2;
        head.rotation.z = t * 0.1;
      }
      if (rightHandT) {
        rightHandT.rotation.z = -0.5;
        rightHandT.rotation.x = t * -0.3;
      }
      break;

    case 'thumbsup':
      const rightUpperArmT = humanoid.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArmT = humanoid.getNormalizedBoneNode('rightLowerArm');
      if (rightUpperArmT && rightLowerArmT) {
        rightUpperArmT.rotation.z = -0.5;
        rightUpperArmT.rotation.x = -0.5;
        rightLowerArmT.rotation.z = -0.3;
      }
      break;

    case 'heart':
      const leftUpperArmH = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmH = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (leftUpperArmH && rightUpperArmH) {
        // Make a heart shape with arms
        leftUpperArmH.rotation.z = 0.8;
        leftUpperArmH.rotation.x = -0.5;
        rightUpperArmH.rotation.z = -0.8;
        rightUpperArmH.rotation.x = -0.5;
      }
      break;

    case 'sad':
      const spineS = humanoid.getNormalizedBoneNode('spine');
      const headS = humanoid.getNormalizedBoneNode('head');
      if (spineS) {
        spineS.rotation.x = t * -0.2;
      }
      if (headS) {
        headS.rotation.x = t * 0.3;
      }
      break;

    case 'angry':
      const headA = humanoid.getNormalizedBoneNode('head');
      if (headA) {
        headA.rotation.y = Math.sin(progress * Math.PI * 8) * 0.1;
      }
      break;

    case 'surprised':
      const headSur = humanoid.getNormalizedBoneNode('head');
      const leftUpperArmSur = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmSur = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (headSur) {
        headSur.rotation.x = -0.1;
      }
      if (leftUpperArmSur && rightUpperArmSur) {
        leftUpperArmSur.rotation.z = 0.8;
        rightUpperArmSur.rotation.z = -0.8;
      }
      break;
  }

  if (vrm.expressionManager) {
    switch (animationType) {
      case 'celebrate':
      case 'wave':
      case 'thumbsup':
      case 'heart':
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
      case 'think':
        vrm.expressionManager.setValue('neutral', t * 0.5);
        break;
    }
  }
}

function applyIdleAnimation(vrm: VRM, time: number) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // More visible breathing animation
  const spine = humanoid.getNormalizedBoneNode('spine');
  const chest = humanoid.getNormalizedBoneNode('chest');
  
  if (spine) {
    spine.rotation.x = Math.sin(time * 0.8) * 0.03;
  }
  
  if (chest) {
    chest.rotation.x = Math.sin(time * 0.8) * 0.025;
  }

  // More noticeable head movement
  const head = humanoid.getNormalizedBoneNode('head');
  if (head) {
    head.rotation.y = Math.sin(time * 0.3) * 0.08;
    head.rotation.x = Math.sin(time * 0.5) * 0.05;
    head.rotation.z = Math.sin(time * 0.4) * 0.02;
  }

  // Arms with visible wave motion - slightly raised
  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  
  if (leftUpperArm) {
    leftUpperArm.rotation.z = 0.3 + Math.sin(time * 0.6) * 0.05;
    leftUpperArm.rotation.x = Math.sin(time * 0.7) * 0.03;
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.z = -0.3 + Math.sin(time * 0.6 + Math.PI) * 0.05;
    rightUpperArm.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.03;
  }

  // Gentle body sway
  const hips = humanoid.getNormalizedBoneNode('hips');
  if (hips) {
    hips.position.y = Math.sin(time * 0.5) * 0.01;
    hips.rotation.y = Math.sin(time * 0.4) * 0.02;
  }

  // Occasional blinking
  if (vrm.expressionManager && Math.random() < 0.002) {
    vrm.expressionManager.setValue('blink', 1);
    setTimeout(() => {
      vrm.expressionManager?.setValue('blink', 0);
    }, 100);
  }
}

function resetToIdlePose(vrm: VRM) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Reset to natural idle pose with arms slightly raised
  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
  const spine = humanoid.getNormalizedBoneNode('spine');
  const head = humanoid.getNormalizedBoneNode('head');
  const hips = humanoid.getNormalizedBoneNode('hips');

  if (leftUpperArm) leftUpperArm.rotation.set(0, 0, 0.3);
  if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -0.3);
  if (leftLowerArm) leftLowerArm.rotation.set(0, 0, 0.1);
  if (rightLowerArm) rightLowerArm.rotation.set(0, 0, -0.1);
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
    vrm.expressionManager.setValue('neutral', 0);
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
        camera={{ position: [0, 0.5, 3], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[1, 1, 1]} intensity={0.7} />
        <directionalLight position={[-1, -1, -1]} intensity={0.4} />
        <pointLight position={[0, 2, 2]} intensity={0.5} color="#ffffff" />
        
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
