import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  Scissors,
  Film,
  Play,
  Clock,
  HardDrive,
  CheckCircle,
  ArrowRight,
  Trash2,
  Copy,
  Layers,
  Wand2,
  FileVideo,
  AlertCircle,
} from 'lucide-react';
import { Project } from '../types';
import { VideoProcessor } from '../services/videoProcessor';

interface DashboardViewProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onImportVideo: (file: File) => Promise<void>;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  storageStats: { usedBytes: number; quotaBytes: number; percentage: number };
  onNavigate: (tab: any) => void;
  isProcessing: boolean;
  statusMessage: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onImportVideo,
  onDeleteProject,
  onDuplicateProject,
  storageStats,
  onNavigate,
  isProcessing,
  statusMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndImport(file);
    e.target.value = '';
  };

  const validateAndImport = async (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, WebM, MOV, MKV).');
      return;
    }
    try {
      await onImportVideo(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import video.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndImport(file);
    }
  };

  const handleCreateDemo = async () => {
    setIsGeneratingDemo(true);
    setErrorMsg(null);
    try {
      const demoFile = await VideoProcessor.generateSampleVideo(
        'Tech Podcast: The AI Video Revolution',
        25
      );
      await onImportVideo(demoFile);
      onNavigate('clipper');
    } catch (err: any) {
      setErrorMsg('Failed to generate demo studio video: ' + err.message);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const totalClips = projects.reduce((acc, p) => acc + (p.clips?.length || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181B2B] via-[#121522] to-[#0A0C13] border border-[#23293E] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-20 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/70 border border-violet-800/50 text-xs font-semibold text-violet-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI-Powered Short-Form Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            One Long Video. <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Endless Viral Possibilities.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Transform long podcasts, interviews, gaming streams, and webinars into high-engagement vertical shorts for TikTok, Reels, and YouTube with automated hook detection, smart 9:16 reframing, and animated karaoke subtitles.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isGeneratingDemo}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Local Video</span>
            </button>

            <button
              onClick={handleCreateDemo}
              disabled={isProcessing || isGeneratingDemo}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1F30] hover:bg-[#232A42] border border-violet-500/30 text-violet-300 hover:text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-cyan-400" />
              <span>{isGeneratingDemo ? 'Building Demo Studio...' : 'Try Instant Demo Video'}</span>
            </button>

            {projects.length > 0 && (
              <button
                onClick={() => onNavigate('clipper')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-slate-300 hover:text-white text-sm font-medium hover:bg-slate-800/50 transition"
              >
                <span>Go to AI Clipper</span>
                <ArrowRight className="w-4 h-4 text-violet-400" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Error / Processing Notice */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {isProcessing && (
        <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-800/60 text-violet-200 flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">{statusMessage || 'Processing video...'}</p>
        </div>
      )}

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-violet-500 bg-violet-950/20 scale-[1.01]'
            : 'border-[#23293E] hover:border-violet-500/50 bg-[#10131E]/60 hover:bg-[#131724]'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#1A1F30] border border-[#28314D] mx-auto flex items-center justify-center text-violet-400 mb-4 shadow-lg">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Drag & drop your video here, or <span className="text-violet-400 underline underline-offset-4">browse files</span>
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Supports MP4, WebM, MOV, and MKV. Local-first architecture: your raw videos stay private in your browser.
        </p>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Projects</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-black text-white">{projects.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Generated Clips</span>
            <Scissors className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">{totalClips}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reframing Ratio</span>
            <Film className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">9:16 / 1:1</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">IndexedDB Cache</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white truncate">
            {formatBytes(storageStats.usedBytes)}
          </p>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Projects</h2>
          </div>
          {projects.length > 0 && (
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              View all ({projects.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111420] border border-[#1E2436] text-center space-y-3">
            <FileVideo className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No projects yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Import a video above or click "Try Instant Demo Video" to immediately test the AI Clipper and Subtitle Editor.
            </p>
            <button
              onClick={handleCreateDemo}
              className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-300 transition"
            >
              Generate Demo Studio Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="group relative rounded-2xl bg-[#121520] border border-[#1E2333] hover:border-violet-500/50 p-4 transition-all hover:shadow-xl hover:shadow-violet-950/30 cursor-pointer space-y-3"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl bg-[#0B0D13] overflow-hidden border border-slate-800">
                  {project.metadata?.thumbnail ? (
                    <img
                      src={project.metadata.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Film className="w-8 h-8" />
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-mono font-medium text-slate-200">
                    {VideoProcessor.formatTime(project.metadata?.duration || 0)}
                  </div>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-violet-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{project.clips?.length || 0} clips</span>
                    <span>•</span>
                    <span>{project.metadata?.aspectRatio || '16:9'}</span>
                    <span>•</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">
                    {formatBytes(project.metadata?.fileSize || 0)}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDuplicateProject(project.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Duplicate project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Cards Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-800 text-violet-400 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">Smart Highlight Detection</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-signal scanning analyzes vocal energy spikes, audio silence boundaries, and hook velocity to isolate thumb-stopping moments.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">Smart Reframing & Crop</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instantly reframe 16:9 widescreen footage into 9:16 vertical shorts, 1:1 squares, or 4:5 feeds with pan/zoom positioning.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">Animated Subtitle Engine</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Alex Hormozi viral captions, Neon Cyber typography, word-level dynamic highlights, and native SRT/VTT export.
          </p>
        </div>
      </div>
    </div>
  );
};
