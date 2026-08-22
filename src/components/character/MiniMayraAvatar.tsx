import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssistantStatus } from '../../types';
import { MODEL_CANDIDATE_URLS } from './MayraAvatar';

interface MiniMayraAvatarProps {
  status: AssistantStatus;
  size?: number;
}

function MiniModelRenderer({ modelScene }: { modelScene: THREE.Group; status: AssistantStatus }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // Static in place (no floating/bobbing)
    groupRef.current.position.set(0, 0, 0);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={modelScene} />
    </group>
  );
}

export const MiniMayraAvatar: React.FC<MiniMayraAvatarProps> = ({ status, size = 64 }) => {
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new GLTFLoader();

    const loadWithFallback = (urlIdx: number) => {
      if (urlIdx >= MODEL_CANDIDATE_URLS.length) return;
      const currentUrl = MODEL_CANDIDATE_URLS[urlIdx];

      loader.load(
        currentUrl,
        (gltf) => {
          if (!isMounted) return;
          try {
            const clone = gltf.scene.clone(true);
            const box = new THREE.Box3().setFromObject(clone);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Focus on head/face for mini avatar
            const targetFaceY = box.max.y - (size.y * 0.12);
            const scaleFactor = 2.0 / (size.y || 21.6);

            clone.position.x = -center.x * scaleFactor;
            clone.position.y = -targetFaceY * scaleFactor;
            clone.position.z = -center.z * scaleFactor;
            clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

            setModelScene(clone);
          } catch (err) {
            loadWithFallback(urlIdx + 1);
          }
        },
        undefined,
        () => loadWithFallback(urlIdx + 1)
      );
    };

    loadWithFallback(0);

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div 
      className="relative rounded-full overflow-hidden border border-cyan-400/40 bg-slate-950/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
      style={{ width: size, height: size }}
    >
      {modelScene ? (
        <Canvas
          camera={{
            position: [0, 0, 0.70],
            fov: 34,
            near: 0.1,
            far: 100
          }}
          className="w-full h-full"
          onCreated={({ gl, camera }) => {
            camera.lookAt(0, 0, 0);
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.5} color="#ffffff" />
          <directionalLight position={[1.5, 2.5, 2.0]} intensity={1.8} color="#ffffff" />
          <directionalLight position={[-1.5, 1.5, 1.0]} intensity={0.9} color="#06B6D4" />
          <MiniModelRenderer modelScene={modelScene} status={status} />
        </Canvas>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 animate-pulse text-cyan-400 font-mono text-[9px]">
          MAYRA
        </div>
      )}
    </div>
  );
};
