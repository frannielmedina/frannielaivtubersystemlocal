import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStore } from '@/store/useStore';

const VRMModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentAnimation = useStore(state => state.currentAnimation);
  const animationRef = useRef<{
    type: string;
    startTime: number;
    duration: number;
  } | null>(null);
  const modelLoadedRef = useRef(false);

  useEffect(() => {
    if (modelLoadedRef.current) return;
    
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    console.log('🎭 Loading VRM model from:', modelPath);
    setIsLoading(true);
    setLoadError(null);

    loader.load(
      modelPath,
      (gltf) => {
        console.log('📦 GLTF loaded, extracting VRM...');
        const vrm = gltf.userData.vrm as VRM;
        
        if (!vrm) {
          console.error('❌ No VRM data found in GLTF');
          setLoadError('Invalid VRM file - no VRM data found');
          setIsLoading(false);
          return;
        }

        console.log('✅ VRM data extracted successfully');
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        
        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        vrm.scene.rotation.y = Math.PI;

        const humanoid = vrm.humanoid;
        if (humanoid) {
          console.log('🦴 Setting up humanoid bones...');
          const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
          const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
          const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
          const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
          
          // Brazos abajo en posición natural (colgando a los lados del cuerpo)
          if (leftUpperArm) leftUpperArm.rotation.set(0, 0, 1.2); // Brazo izquierdo hacia abajo
          if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -1.2); // Brazo derecho hacia abajo
          if (leftLowerArm) leftLowerArm.rotation.set(0, 0, 0.3); // Ligeramente doblado
          if (rightLowerArm) rightLowerArm.rotation.set(0, 0, -0.3); // Ligeramente doblado
        }

        modelLoadedRef.current = true;
        setVrm(vrm);
        setLoadError(null);
        setIsLoading(false);
        console.log('✅ VRM model loaded and ready!');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        if (percent % 10 === 0 || percent === 100) {
          console.log(`📊 Loading VRM: ${percent.toFixed(0)}%`);
        }
      },
      (error) => {
        console.error('❌ Error loading VRM:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load VRM model';
        
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          setLoadError(`Model not found at: ${modelPath}`);
          console.error('💡 Make sure your VRM file is in: public/models/miko.vrm');
        } else if (errorMessage.includes('CORS')) {
          setLoadError('CORS error - check file permissions');
        } else {
          setLoadError(errorMessage);
        }
        
        setIsLoading(false);
        modelLoadedRef.current = false;
      }
    );

    return () => {
      if (vrm) {
        console.log('🧹 Cleaning up VRM model...');
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

  if (isLoading) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.3} color="#ffffff" anchorX="center" anchorY="middle">
        Loading VRM Model...
      </Text>
    );
  }

  if (loadError) {
    console.error('🚫 VRM Load Error:', loadError);
    return (
      <group>
        <Text position={[0, 0.5, 0]} fontSize={0.2} color="#ff6b6b" anchorX="center" anchorY="middle" maxWidth={3}>
          Error Loading VRM
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={4}>
          {loadError}
        </Text>
        <Text position={[0, -0.5, 0]} fontSize={0.12} color="#aaaaaa" anchorX="center" anchorY="middle" maxWidth={4}>
          Check browser console (F12) for details
        </Text>
      </group>
    );
  }

  if (!vrm) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.2} color="#cccccc" anchorX="center" anchorY="middle">
        Initializing...
      </Text>
    );
  }

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
      if (spine) spine.rotation.x = Math.sin(t * Math.PI) * 0.5;
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
        leftUpperArmH.rotation.z = 0.8;
        leftUpperArmH.rotation.x = -0.5;
        rightUpperArmH.rotation.z = -0.8;
        rightUpperArmH.rotation.x = -0.5;
      }
      break;

    case 'sad':
      const spineS = humanoid.getNormalizedBoneNode('spine');
      const headS = humanoid.getNormalizedBoneNode('head');
      if (spineS) spineS.rotation.x = t * -0.2;
      if (headS) headS.rotation.x = t * 0.3;
      break;

    case 'angry':
      const headA = humanoid.getNormalizedBoneNode('head');
      if (headA) headA.rotation.y = Math.sin(progress * Math.PI * 8) * 0.1;
      break;

    case 'surprised':
      const headSur = humanoid.getNormalizedBoneNode('head');
      const leftUpperArmSur = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArmSur = humanoid.getNormalizedBoneNode('rightUpperArm');
      if (headSur) headSur.rotation.x = -0.1;
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

  // Breathing animation
  const spine = humanoid.getNormalizedBoneNode('spine');
  const chest = humanoid.getNormalizedBoneNode('chest');
  
  if (spine) spine.rotation.x = Math.sin(time * 0.8) * 0.03;
  if (chest) chest.rotation.x = Math.sin(time * 0.8) * 0.025;

  // Head movement
  const head = humanoid.getNormalizedBoneNode('head');
  if (head) {
    head.rotation.y = Math.sin(time * 0.3) * 0.08;
    head.rotation.x = Math.sin(time * 0.5) * 0.05;
    head.rotation.z = Math.sin(time * 0.4) * 0.02;
  }

  // Arms down - natural idle position (colgando a los lados)
  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
  
  // Brazos abajo con movimiento sutil de respiración
  if (leftUpperArm) {
    leftUpperArm.rotation.z = 1.2 + Math.sin(time * 0.6) * 0.02; // Hacia abajo
    leftUpperArm.rotation.x = Math.sin(time * 0.7) * 0.02;
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.z = -1.2 + Math.sin(time * 0.6 + Math.PI) * 0.02; // Hacia abajo
    rightUpperArm.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.02;
  }
  
  // Lower arms slightly bent
  if (leftLowerArm) {
    leftLowerArm.rotation.z = 0.3 + Math.sin(time * 0.5) * 0.02;
  }
  if (rightLowerArm) {
    rightLowerArm.rotation.z = -0.3 + Math.sin(time * 0.5 + Math.PI) * 0.02;
  }

  // Hip sway
  const hips = humanoid.getNormalizedBoneNode('hips');
  if (hips) {
    hips.position.y = Math.sin(time * 0.5) * 0.01;
    hips.rotation.y = Math.sin(time * 0.4) * 0.02;
  }

  // Blink
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

  const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
  const spine = humanoid.getNormalizedBoneNode('spine');
  const head = humanoid.getNormalizedBoneNode('head');
  const hips = humanoid.getNormalizedBoneNode('hips');

  // Brazos abajo en posición natural (colgando a los lados del cuerpo)
  if (leftUpperArm) leftUpperArm.rotation.set(0, 0, 1.2); // Hacia abajo
  if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -1.2); // Hacia abajo
  if (leftLowerArm) leftLowerArm.rotation.set(0, 0, 0.3); // Ligeramente doblado
  if (rightLowerArm) rightLowerArm.rotation.set(0, 0, -0.3); // Ligeramente doblado
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
  const setVTuberPosition = useStore(state => state.setVTuberPosition);
  const setConfig = useStore(state => state.setConfig);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hintVisible, setHintVisible] = useState(true);
  const [hintTimeout, setHintTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide hint after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setHintVisible(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Show hint on interaction
    setHintVisible(true);
    if (hintTimeout) clearTimeout(hintTimeout);
    const timeout = setTimeout(() => setHintVisible(false), 3000);
    setHintTimeout(timeout);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      // Show hint on mouse move
      setHintVisible(true);
      if (hintTimeout) clearTimeout(hintTimeout);
      const timeout = setTimeout(() => setHintVisible(false), 3000);
      setHintTimeout(timeout);
      return;
    }

    const deltaX = (e.clientX - dragStart.x) * 0.003;
    const deltaY = -(e.clientY - dragStart.y) * 0.003;

    const newPosition: [number, number, number] = [
      vtuberPosition[0] + deltaX,
      vtuberPosition[1] + deltaY,
      vtuberPosition[2]
    ];

    setVTuberPosition(newPosition);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.max(0.5, Math.min(2.5, config.vtuber.scale + delta));
    
    setConfig({
      vtuber: {
        ...config.vtuber,
        scale: newScale
      }
    });
    
    // Show hint on wheel
    setHintVisible(true);
    if (hintTimeout) clearTimeout(hintTimeout);
    const timeout = setTimeout(() => setHintVisible(false), 3000);
    setHintTimeout(timeout);
  };

  return (
    <div 
      className="w-full h-full bg-gradient-to-b from-purple-900 to-blue-900 relative"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ 
          position: [0, 0.7, 2.8], 
          fov: 45
        }}
        gl={{ 
          alpha: true, 
          antialias: true
        }}
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
          enableZoom={false}
          enableRotate={false}
          target={[0, 0.7, 0]}
        />
      </Canvas>

      {/* Hint text - Auto-hide and reappear on mouse move */}
      <div 
        className={`absolute bottom-4 right-4 bg-black bg-opacity-60 px-3 py-2 rounded text-white text-xs pointer-events-none transition-opacity duration-500 ${
          hintVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        🖱️ Drag: Click + Move | 🔍 Zoom: Mouse Wheel
      </div>
    </div>
  );
};
