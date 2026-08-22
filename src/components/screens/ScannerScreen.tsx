import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, FlipHorizontal, Flashlight, 
  Sparkles, CheckCircle2, X, FileText, 
  Layers, Globe, VideoOff
} from 'lucide-react';

interface ScannerScreenProps {
  onSendVisionQuery: (query: string) => void;
  triggerCaptureSignal?: number;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ 
  onSendVisionQuery,
  triggerCaptureSignal
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [scanMode, setScanMode] = useState<'ocr' | 'object' | 'scene'>('ocr');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [hasCameraStream, setHasCameraStream] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Real Camera Stream with Clean Fallback
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setHasCameraStream(false);
        return;
      }

      // Stop existing tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setHasCameraStream(true);
        }
      } catch (err) {
        console.info('[Vision Scanner] Camera stream fallback mode:', err);
        if (isMounted) {
          setHasCameraStream(false);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraFacing]);

  const executeCapture = () => {
    setIsScanning(true);
    setScannedResult(null);
    setTimeout(() => {
      setIsScanning(false);
      if (scanMode === 'ocr') {
        setScannedResult("Extracted Text: 'MAYRA AI Assistant — Neural Intelligence & Vision Engine'");
      } else if (scanMode === 'object') {
        setScannedResult("Identified: Developer Workspace & High-Resolution Display");
      } else {
        setScannedResult("Scene: Indoor Studio Environment with Ambient Lighting");
      }
    }, 1200);
  };

  // Listen to bottom navigation shutter trigger
  useEffect(() => {
    if (triggerCaptureSignal && triggerCaptureSignal > 0) {
      executeCapture();
    }
  }, [triggerCaptureSignal]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden bg-[#050711] text-slate-200 select-none px-3 py-1">
      
      {/* Unified Compact Scanner Container */}
      <div className="w-full max-w-[360px] flex flex-col items-center gap-2 my-auto">
        
        {/* 1. Scanner Heading + Camera Controls */}
        <div className="w-full px-2 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/[0.08] text-cyan-300 rounded-xl border border-white/10 backdrop-blur-xl">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white tracking-wide">Vision Scanner</h2>
              <p className="text-[10px] text-slate-400">Point at text, objects, or scenery</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTorchOn(!torchOn)}
              className={`p-2 rounded-xl border backdrop-blur-xl transition-all ${
                torchOn 
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]' 
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300'
              }`}
              title="Toggle Flashlight"
            >
              <Flashlight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
              className="p-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl text-slate-300 transition-all backdrop-blur-xl"
              title="Switch Camera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Camera / Scanner Area (Compact, framed viewport with real video or HUD) */}
        <div className="w-full aspect-[4/3] max-h-[300px] relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950/50 via-slate-900/30 to-slate-950/70 rounded-2xl border border-white/15 shadow-2xl">
          {/* Real Video Camera Stream */}
          {hasCameraStream ? (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          )}

          {/* Darkening overlay for HUD contrast */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Corner Scanner Guides */}
          <div className="w-[82%] h-[78%] relative pointer-events-none flex items-center justify-center z-10">
            {/* Top-Left */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            {/* Top-Right */}
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            {/* Bottom-Left */}
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            {/* Bottom-Right */}
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg shadow-[0_0_8px_rgba(6,182,212,0.6)]" />

            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div className="absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(6,182,212,1)] animate-pulse" />
            )}

            {/* Center Target Crosshair */}
            <div className="w-7 h-7 rounded-full border border-white/25 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-ping" />
            </div>
          </div>

          {/* Scanned Result Overlay Card */}
          {scannedResult && (
            <div className="absolute inset-x-2.5 bottom-2.5 p-3 bg-[#0D1124]/95 border border-cyan-500/30 rounded-xl text-xs text-white space-y-2 animate-in slide-in-from-bottom-2 z-30 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between text-[11px] text-cyan-300">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Recognition Complete
                </span>
                <button
                  onClick={() => setScannedResult(null)}
                  className="text-slate-400 hover:text-white p-0.5"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-200 leading-snug font-sans select-text">
                {scannedResult}
              </p>
              <button
                onClick={() => onSendVisionQuery(`Analyze this visual data: ${scannedResult}`)}
                className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-md active:scale-98 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ask MAYRA About This
              </button>
            </div>
          )}
        </div>

        {/* 3. Mode Switcher: Text OCR | Objects | Scene */}
        <div className="flex items-center gap-1 bg-[#0E1326]/95 border border-white/15 p-1 rounded-full backdrop-blur-2xl shadow-lg shrink-0">
          {[
            { id: 'ocr', label: 'Text OCR', icon: FileText },
            { id: 'object', label: 'Objects', icon: Layers },
            { id: 'scene', label: 'Scene', icon: Globe }
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = scanMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setScanMode(mode.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-md shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400/80 font-sans tracking-wide shrink-0">
          Tap center shutter to scan & analyze
        </p>
      </div>

    </div>
  );
};
