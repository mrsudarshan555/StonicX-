import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, FileText, X } from 'lucide-react';

export interface AttachmentItem {
  type: 'photo' | 'gallery' | 'file';
  name: string;
  size: string;
  dataUrl?: string;
  file?: File;
}

interface AttachmentBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAttachment: (attachment: AttachmentItem) => void;
}

export const AttachmentBottomSheet: React.FC<AttachmentBottomSheetProps> = ({
  isOpen,
  onClose,
  onSelectAttachment
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      onSelectAttachment({
        type: 'photo',
        name: file.name || `Camera_${Date.now()}.jpg`,
        size: sizeStr,
        file
      });
      onClose();
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      onSelectAttachment({
        type: 'gallery',
        name: file.name,
        size: sizeStr,
        file
      });
      onClose();
    }
  };

  const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      onSelectAttachment({
        type: 'file',
        name: file.name,
        size: sizeStr,
        file
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleGallerySelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleFileBrowse}
      />

      {/* Compact Gemini Vertical List Bottom Sheet */}
      <div 
        className="relative z-10 w-full max-w-md bg-[#111528]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl p-4 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div className="w-9 h-1 bg-white/20 rounded-full mx-auto mb-1" />

        {/* Minimal Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-white tracking-wide">Attach</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical List of Options */}
        <div className="space-y-1">
          {/* 1. Camera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors text-left group"
          >
            <div className="p-2 bg-white/[0.06] group-hover:bg-cyan-500/20 rounded-xl text-slate-300 group-hover:text-cyan-300 transition-colors border border-white/5">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors">Camera</p>
              <p className="text-[11px] text-slate-400">Take a photo or record</p>
            </div>
          </button>

          {/* 2. Gallery */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors text-left group"
          >
            <div className="p-2 bg-white/[0.06] group-hover:bg-purple-500/20 rounded-xl text-slate-300 group-hover:text-purple-300 transition-colors border border-white/5">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-purple-200 transition-colors">Gallery</p>
              <p className="text-[11px] text-slate-400">Choose photos and videos</p>
            </div>
          </button>

          {/* 3. Files / Documents */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors text-left group"
          >
            <div className="p-2 bg-white/[0.06] group-hover:bg-emerald-500/20 rounded-xl text-slate-300 group-hover:text-emerald-300 transition-colors border border-white/5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-emerald-200 transition-colors">Files & Documents</p>
              <p className="text-[11px] text-slate-400">PDFs, docs, audio, and more</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
