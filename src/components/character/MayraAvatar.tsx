import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssistantStatus, CharacterTransform, CharacterLockState, CharacterModelMetadata } from '../../types';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { 
  CharacterEmotion, 
  buildCharacterBindings, 
  applyReferenceBasePose, 
  computeReferenceBasePoseRotations,
  tuneCharacterMaterials, 
  updateFacialAnimations,
  EMOTION_EXPRESSIONS, 
  ResolvedMorphTarget, 
  CharacterSkeletonBones 
} from './myraCharacterEngine';
import { 
  PMX_MODEL_URL, 
  TEXTURES_JSON_URL, 
  RAW_TEXTURE_URLS, 
  loadEvelynPMXModel 
} from './pmxModelLoader';

// Priority Model URLs with automatic failover
export const MODEL_CANDIDATE_URLS = [
  PMX_MODEL_URL,
  '/models/Evelyn.glb',
  'https://cdn.jsdelivr.net/gh/mrsudarshan555/Model@main/Evelyn.glb',
  'https://raw.githubusercontent.com/mrsudarshan555/Model/main/Evelyn.glb'
];

export const PRIMARY_MODEL_URL = MODEL_CANDIDATE_URLS[0];
export const MODEL_URL = PRIMARY_MODEL_URL;
export const PMX_URL = PMX_MODEL_URL;
export const TEXTURES_URL = TEXTURES_JSON_URL;
export const TEXTURE_ASSETS = RAW_TEXTURE_URLS;

let cachedRawScene: THREE.Group | null = null;
let hasLoadedOnce = false;

interface ModelRendererProps {
  modelScene: THREE.Group;
  status: AssistantStatus;
  emotion?: CharacterEmotion;
  lockState?: CharacterLockState;
  transform?: CharacterTransform;
  characterSkinTone?: number;
}

function ModelRenderer({ 
  modelScene, 
  status, 
  emotion,
  lockState,
  transform,
  characterSkinTone = 50
}: ModelRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const initialMaterialsRef = useRef<Map<THREE.Material, { color: THREE.Color; roughness: number }>>(new Map());

  const { morphTargets, bones, restRotations, facialFeatures, meshRestTransforms } = useMemo(() => {
    return buildCharacterBindings(modelScene);
  }, [modelScene]);

  const targetBaseRotations = useMemo(() => {
    return computeReferenceBasePoseRotations(bones, restRotations);
  }, [bones, restRotations]);

  useEffect(() => {
    applyReferenceBasePose(bones, restRotations);
  }, [bones, restRotations]);

  useEffect(() => {
    tuneCharacterMaterials(modelScene, characterSkinTone, initialMaterialsRef.current);
  }, [characterSkinTone, modelScene]);

  const speechAuthorityRef = useRef<number>(0);
  const blinkTimerRef = useRef<number>(2.5);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkProgressRef = useRef<number>(0);

  const morphsByChannel = useMemo(() => {
    const map = new Map<string, ResolvedMorphTarget[]>();
    morphTargets.forEach((target) => {
      if (!map.has(target.channel)) {
        map.set(target.channel, []);
      }
      map.get(target.channel)!.push(target);
    });
    return map;
  }, [morphTargets]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // 1. BASE POSITION & SCALE: Strictly locked to 1.0x with zero whole-body scaling or distortion
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.scale.set(1.0, 1.0, 1.0);
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;

    if (transform && !lockState?.isLocked) {
      const targetRadY = (transform.rotationY * Math.PI) / 180;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRadY, 0.1);
    } else if (lockState?.isLocked) {
      groupRef.current.rotation.y = 0;
    }

    // 2. IDLE BREATHING & CONVERSATIONAL MICRO-MOTION (Additive to reference base pose)
    const isSpeaking = status === 'SPEAKING';
    const isListening = status === 'LISTENING';

    speechAuthorityRef.current = THREE.MathUtils.lerp(
      speechAuthorityRef.current,
      isSpeaking ? 1.0 : 0.0,
      1.0 - Math.exp(-6.0 * delta)
    );

    const breathFrequency = 0.23;
    const breathCycle = Math.sin(time * 2 * Math.PI * breathFrequency);

    // Natural speaking head nod & conversational micro-gestures (does not scale or warp the character)
    const speechHeadNod = isSpeaking ? Math.sin(time * 7) * 0.015 * speechAuthorityRef.current : 0;
    const speechHeadTilt = isSpeaking ? Math.sin(time * 3.5) * 0.012 * speechAuthorityRef.current : (isListening ? 0.015 : 0);

    if (bones.neck) {
      const base = targetBaseRotations.get(bones.neck) || restRotations.get(bones.neck) || new THREE.Euler();
      bones.neck.rotation.set(
        base.x + breathCycle * 0.005 + speechHeadNod * 0.4,
        base.y + speechHeadTilt * 0.3,
        base.z
      );
    }
    if (bones.head) {
      const base = targetBaseRotations.get(bones.head) || restRotations.get(bones.head) || new THREE.Euler();
      bones.head.rotation.set(
        base.x + breathCycle * 0.008 + speechHeadNod * 0.6,
        base.y + speechHeadTilt * 0.7,
        base.z
      );
    }

    // 3. BLINKING
    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0 && !isBlinkingRef.current) {
      isBlinkingRef.current = true;
      blinkProgressRef.current = 0;
      blinkTimerRef.current = 2.4 + Math.random() * 4.5;
    }

    let blinkVal = 0;
    if (isBlinkingRef.current) {
      blinkProgressRef.current += delta / 0.15;
      if (blinkProgressRef.current >= 1.0) {
        isBlinkingRef.current = false;
        blinkVal = 0;
      } else {
        blinkVal = Math.sin(blinkProgressRef.current * Math.PI);
      }
    }

    // 4. EMOTION EXPRESSIONS
    let currentEmotion: CharacterEmotion = emotion || 'idle';
    if (!emotion) {
      if (status === 'SPEAKING') currentEmotion = 'happy';
      else if (status === 'THINKING') currentEmotion = 'thinking';
      else if (status === 'LISTENING') currentEmotion = 'curious';
      else currentEmotion = 'happy';
    }

    const targetExpressions = EMOTION_EXPRESSIONS[currentEmotion] || {};

    // 5. VISEME PHONEME LIP-SYNC WITH ORGANIC SPEECH RHYTHM
    const speechCadenceA = Math.sin(time * 14) * 0.5 + 0.5;
    const speechCadenceI = Math.sin(time * 18 + 1.0) * 0.5 + 0.5;
    const speechCadenceO = Math.sin(time * 11 + 2.0) * 0.5 + 0.5;

    const mouthOpennessA = speechCadenceA * 0.75 * speechAuthorityRef.current;
    const mouthOpennessI = speechCadenceI * 0.55 * speechAuthorityRef.current;
    const mouthOpennessO = speechCadenceO * 0.60 * speechAuthorityRef.current;

    // Delta-time aware smooth damping factor prevents facial jerk/snapping across rapid status transitions
    const morphDampingFactor = 1.0 - Math.exp(-7.0 * delta);

    morphsByChannel.forEach((targets, channel) => {
      let channelValue = targetExpressions[channel] || 0;

      // Natural eye blinking
      if (channel === 'blink' || channel === 'blinkL' || channel === 'blinkR') {
        channelValue = Math.max(channelValue, blinkVal);
      }

      // Responsive speech viseme & expressive speaking animation
      if (speechAuthorityRef.current > 0.01) {
        if (channel === 'visemeA' || channel === 'visemeTalk') {
          channelValue = Math.max(channelValue, mouthOpennessA);
        } else if (channel === 'visemeI' || channel === 'visemeE') {
          channelValue = Math.max(channelValue, mouthOpennessI);
        } else if (channel === 'visemeU' || channel === 'visemeO') {
          channelValue = Math.max(channelValue, mouthOpennessO);
        } else if (channel === 'mouthCornerUpL' || channel === 'mouthCornerUpR' || channel === 'mouthSmile') {
          channelValue = Math.max(channelValue, 0.45 * speechAuthorityRef.current);
        } else if (channel === 'smileEyes') {
          channelValue = Math.max(channelValue, 0.25 * speechAuthorityRef.current);
        } else if (channel === 'browUp') {
          channelValue = Math.max(channelValue, 0.20 * speechAuthorityRef.current);
        }
      }

      targets.forEach((target) => {
        if (target.mesh.morphTargetInfluences) {
          const currentInfluence = target.mesh.morphTargetInfluences[target.targetIndex] || 0;
          target.mesh.morphTargetInfluences[target.targetIndex] = THREE.MathUtils.lerp(
            currentInfluence,
            channelValue,
            morphDampingFactor
          );
        }
      });
    });

    updateFacialAnimations(
      facialFeatures,
      meshRestTransforms,
      currentEmotion,
      isSpeaking,
      speechAuthorityRef.current,
      blinkVal,
      time
    );

    // 6. PERMANENT NATURAL RELAXED ARM & HAND POSE (with subtle additive breathing)
    const armBreathing = Math.sin(time * 2 * Math.PI * 0.23) * 0.005;

    // Shoulders
    if (bones.shoulderL) {
      const base = targetBaseRotations.get(bones.shoulderL);
      if (base) bones.shoulderL.rotation.set(base.x, base.y, base.z);
    }
    if (bones.shoulderR) {
      const base = targetBaseRotations.get(bones.shoulderR);
      if (base) bones.shoulderR.rotation.set(base.x, base.y, base.z);
    }

    // Upper Arms
    if (bones.armL) {
      const base = targetBaseRotations.get(bones.armL);
      if (base) {
        bones.armL.rotation.set(base.x + armBreathing, base.y, base.z);
      }
    }
    if (bones.armR) {
      const base = targetBaseRotations.get(bones.armR);
      if (base) {
        bones.armR.rotation.set(base.x + armBreathing, base.y, base.z);
      }
    }

    // Elbows
    if (bones.elbowL) {
      const base = targetBaseRotations.get(bones.elbowL);
      if (base) bones.elbowL.rotation.set(base.x, base.y, base.z);
    }
    if (bones.elbowR) {
      const base = targetBaseRotations.get(bones.elbowR);
      if (base) bones.elbowR.rotation.set(base.x, base.y, base.z);
    }

    // Wrists
    if (bones.wristL) {
      const base = targetBaseRotations.get(bones.wristL);
      if (base) bones.wristL.rotation.set(base.x, base.y, base.z);
    }
    if (bones.wristR) {
      const base = targetBaseRotations.get(bones.wristR);
      if (base) bones.wristR.rotation.set(base.x, base.y, base.z);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <primitive object={modelScene} />
    </group>
  );
}

export interface MayraAvatarProps {
  status: AssistantStatus;
  emotion?: CharacterEmotion;
  scaleMultiplier?: number;
  characterZoom?: number;
  characterSkinTone?: number;
  transform?: CharacterTransform;
  lockState?: CharacterLockState;
  modelMetadata?: CharacterModelMetadata;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onWheel?: (e: React.WheelEvent) => void;
  onTriggerVoice?: () => void;
}

export const MayraAvatar: React.FC<MayraAvatarProps> = ({
  status,
  emotion,
  scaleMultiplier = 1.0,
  characterZoom = 100,
  characterSkinTone = 50,
  transform,
  lockState,
  modelMetadata,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTouchStart,
  onTouchMove,
  onWheel,
  onTriggerVoice
}) => {
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedRawScene);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [cameraConfig, setCameraConfig] = useState<{
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  }>({
    position: [0, 0, 2.25],
    target: [0, 0, 0],
    fov: 30
  });

  const effectiveZoom = useMemo(() => {
    const rawZoom = (characterZoom ?? 100) / 100;
    return rawZoom * (scaleMultiplier ?? 1.0);
  }, [characterZoom, scaleMultiplier]);

  useEffect(() => {
    let isMounted = true;
    const gltfLoader = new GLTFLoader();

    const configureSceneHierarchy = (scene: THREE.Group) => {
      // Ensure scene transform is reset before computing true bounding box
      scene.position.set(0, 0, 0);
      scene.rotation.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
      scene.updateMatrixWorld(true);

      // 1. Calculate Real Bounding Box
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const actualHeight = size.y;
      console.log('[MayraAvatar] Model Bounding Box Computed:', {
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z },
        size: { x: size.x, y: size.y, z: size.z },
        center: { x: center.x, y: center.y, z: center.z },
        actualHeight
      });

      // 2. MODEL SCALE & UPPER-TORSO ALIGNMENT
      const TARGET_HEIGHT = 1.95;
      const scaleFactor = (actualHeight > 0.001 ? (TARGET_HEIGHT / actualHeight) : 1.0) * effectiveZoom;
      scene.scale.setScalar(scaleFactor);

      // Align chest/tie level directly to origin (Y=0) and center on X & Z for bust-up portrait
      const chestY = box.max.y - actualHeight * 0.32;
      scene.position.x = -center.x * scaleFactor;
      scene.position.y = -chestY * scaleFactor;
      scene.position.z = -center.z * scaleFactor;
      scene.rotation.set(0, 0, 0);

      // 3. CAMERA CALIBRATION (Bust-up portrait framing matching old APK: FOV 30, distance 2.25)
      const CAMERA_DISTANCE = 2.25;
      const fov = 30;

      setCameraConfig({
        position: [0, 0, CAMERA_DISTANCE],
        target: [0, 0, 0],
        fov
      });

      console.log('[MayraAvatar] Mobile Portrait Camera & Positioning Calibrated:', {
        cameraPosition: [0, 0, CAMERA_DISTANCE],
        cameraTarget: [0, 0, 0],
        fov,
        modelPosition: [scene.position.x, scene.position.y, scene.position.z],
        scaleFactor
      });

      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => {
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            });
          }
        }
      });
    };

    if (cachedRawScene) {
      configureSceneHierarchy(cachedRawScene);
      setModelScene(cachedRawScene);
      setIsLoading(false);
      return;
    }

    const tryLoadGltfFallback = (urlIdx: number) => {
      const glbUrls = MODEL_CANDIDATE_URLS.filter(u => !u.endsWith('.pmx'));
      if (urlIdx >= glbUrls.length) {
        if (isMounted) {
          setLoadError('Failed to load 3D character asset.');
          setIsLoading(false);
        }
        return;
      }

      const currentUrl = glbUrls[urlIdx];
      gltfLoader.load(
        currentUrl,
        (gltf) => {
          if (!isMounted) return;
          try {
            cachedRawScene = gltf.scene;
            hasLoadedOnce = true;

            configureSceneHierarchy(gltf.scene);
            setModelScene(gltf.scene);
            setIsLoading(false);
          } catch (err: any) {
            console.error('[Mayra3D] Error processing GLTF scene:', err);
            tryLoadGltfFallback(urlIdx + 1);
          }
        },
        undefined,
        (err) => {
          if (!isMounted) return;
          console.warn(`[Mayra3D] Failed loading GLTF from ${currentUrl}:`, err);
          tryLoadGltfFallback(urlIdx + 1);
        }
      );
    };

    const loadCharacter = async () => {
      if (isMounted && !hasLoadedOnce) {
        setIsLoading(true);
        setLoadError(null);
      }

      try {
        console.log('[Mayra3D] Loading Evelyn PMX model with textures from GitHub...');
        const pmxScene = await loadEvelynPMXModel();
        if (!isMounted) return;

        cachedRawScene = pmxScene;
        hasLoadedOnce = true;

        configureSceneHierarchy(pmxScene);
        setModelScene(pmxScene);
        setIsLoading(false);
        console.log('[Mayra3D] Evelyn PMX model successfully loaded.');
        return;
      } catch (pmxErr) {
        console.warn('[Mayra3D] PMX loader failed, falling back to GLB candidates:', pmxErr);
      }

      tryLoadGltfFallback(0);
    };

    loadCharacter();

    return () => {
      isMounted = false;
    };
  }, [attemptCount, effectiveZoom]);

  const handleRetry = () => {
    cachedRawScene = null;
    hasLoadedOnce = false;
    setModelScene(null);
    setAttemptCount(prev => prev + 1);
  };

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center select-none overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/40 via-[#050711] to-[#020308]">
      {/* Background Radial Halo Light */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[340px] h-[340px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="w-[240px] h-[240px] rounded-full bg-indigo-500/10 blur-2xl -mt-12" />
      </div>

      {/* 1. Loading Overlay */}
      {isLoading && !hasLoadedOnce && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050711]/90 backdrop-blur-sm pointer-events-none transition-opacity">
          <div className="flex flex-col items-center gap-3 p-5 bg-[#080C1E]/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_25px_rgba(6,182,212,0.25)] max-w-xs w-full mx-4 text-center">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
              <Sparkles className="w-4 h-4 text-cyan-300 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-sans font-semibold text-white tracking-wide">Starting...</p>
              <p className="text-[10px] text-cyan-400/70 font-sans mt-0.5">Initializing AI Engine</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Error Overlay */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050711]/95 p-4 text-center">
          <div className="p-5 bg-[#0D1127] border border-rose-500/40 rounded-3xl text-slate-200 text-xs font-mono max-w-sm w-full space-y-3 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Character Unavailable</p>
              <p className="text-rose-400/80 text-[11px] mt-1">{loadError}</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* 3. Three.js Canvas Scene */}
      {modelScene && (
        <Canvas
          key={`avatar-canvas-${cameraConfig.fov}-${cameraConfig.position[2]}`}
          camera={{
            position: cameraConfig.position,
            fov: cameraConfig.fov,
            near: 0.1,
            far: 1000
          }}
          className="w-full h-full touch-none"
          onCreated={({ gl, camera }) => {
            camera.lookAt(...cameraConfig.target);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.LinearToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          {/* Reference Soft Lighting Rig: Natural Ambient & Hemisphere base + single gentle front-top diffuse key */}
          {/* 1. Base Soft Ambient Light (even global illumination for entire character, clothing and hands) */}
          <ambientLight intensity={0.82} color="#ffffff" />

          {/* 2. Soft Sky/Ground Hemisphere Light (natural gentle gradient, zero harsh contrast) */}
          <hemisphereLight color="#fffaf5" groundColor="#3e4c5f" intensity={0.40} />

          {/* 3. Single Gentle Front-Top Key Light (very soft natural under-nose shadow and subtle chin depth, zero hot spots) */}
          <directionalLight position={[0.2, 2.0, 2.4]} intensity={0.42} color="#fffdfa" />

          <ModelRenderer 
            modelScene={modelScene} 
            status={status} 
            emotion={emotion}
            lockState={lockState}
            transform={transform}
            characterSkinTone={characterSkinTone}
          />

          <OrbitControls
            target={cameraConfig.target}
            enabled={false}
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
          />
        </Canvas>
      )}
    </div>
  );
};
