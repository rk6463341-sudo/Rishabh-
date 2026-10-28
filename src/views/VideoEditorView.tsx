import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Scissors,
  Split,
  Trash2,
  Copy,
  Volume2,
  VolumeX,
  Type,
  Palette,
  Sparkles,
  Maximize2,
  Move,
  Check,
  AlertCircle,
  Plus,
  Sliders,
  Layers,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Project, ClipCandidate, AspectRatio, CaptionCue, CaptionStyle, BrandKit } from '../types';
import { DEFAULT_CAPTION_STYLE, STYLE_TEMPLATES } from '../constants/templates';
import { VideoProcessor } from '../services/videoProcessor';
import { MediaExporter, RenderResult } from '../services/mediaExporter';

interface VideoEditorViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  brandKit?: BrandKit;
}

export const VideoEditorView: React.FC<VideoEditorViewProps> = ({
  project,
  onUpdateProject,
  brandKit,
}) => {
  if (!project) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h2 className="text-xl font-bold text-white">No Project Loaded</h2>
        <p className="text-sm text-slate-400">Please import or select a project first.</p>
      </div>
    );
  }

  // Active clip state
  const activeClipId = project.activeClipId || project.clips[0]?.id;
  const activeClip = project.clips.find((c) => c.id === activeClipId) || project.clips[0] || null;

  // Video element and playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(activeClip ? activeClip.startTime : 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);

  // Inspector tabs: 'reframe' | 'captions' | 'presets' | 'audio'
  const [activeTab, setActiveTab] = useState<'reframe' | 'captions' | 'presets' | 'audio'>('reframe');

  // Caption styling state
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    project.brandKitId && brandKit?.captionStyle ? brandKit.captionStyle : DEFAULT_CAPTION_STYLE
  );

  // Undo / Redo history
  const [history, setHistory] = useState<Project[]>([project]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Real Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportResolution, setExportResolution] = useState<'1080p' | '720p'>('1080p');
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSecondsRemaining, setExportSecondsRemaining] = useState(0);
  const [exportedFile, setExportedFile] = useState<RenderResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync video time within clip boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    video.currentTime = activeClip.startTime;
    setCurrentTime(activeClip.startTime);

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= activeClip.endTime) {
        video.currentTime = activeClip.startTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeClipId, activeClip?.startTime, activeClip?.endTime]);

  const commitProjectChange = useCallback(
    (newProject: Project) => {
      onUpdateProject(newProject);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newProject);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex, onUpdateProject]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateProject(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateProject(next);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !activeClip) return;
    const clamped = Math.max(activeClip.startTime, Math.min(activeClip.endTime, time));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Split clip at playhead
  const handleSplitClip = () => {
    if (!activeClip) return;
    const splitTime = currentTime;
    if (splitTime <= activeClip.startTime + 1 || splitTime >= activeClip.endTime - 1) {
      alert('Playhead must be at least 1 second away from clip boundaries to split.');
      return;
    }

    const firstHalf: ClipCandidate = {
      ...activeClip,
      id: `clip_${Date.now()}_a`,
      title: `${activeClip.title} (Part 1)`,
      endTime: splitTime,
      duration: splitTime - activeClip.startTime,
    };

    const secondHalf: ClipCandidate = {
      ...activeClip,
      id: `clip_${Date.now()}_b`,
      title: `${activeClip.title} (Part 2)`,
      startTime: splitTime,
      duration: activeClip.endTime - splitTime,
    };

    const newClips = project.clips.flatMap((c) =>
      c.id === activeClip.id ? [firstHalf, secondHalf] : [c]
    );

    commitProjectChange({
      ...project,
      clips: newClips,
      activeClipId: firstHalf.id,
    });
  };

  // Duplicate clip
  const handleDuplicateClip = () => {
    if (!activeClip) return;
    const clone: ClipCandidate = {
      ...activeClip,
      id: `clip_${Date.now()}_copy`,
      title: `${activeClip.title} (Copy)`,
    };
    commitProjectChange({
      ...project,
      clips: [...project.clips, clone],
      activeClipId: clone.id,
    });
  };

  // Delete clip
  const handleDeleteClip = () => {
    if (!activeClip || project.clips.length <= 1) {
      alert('You must keep at least one clip in the project.');
      return;
    }
    const remaining = project.clips.filter((c) => c.id !== activeClip.id);
    commitProjectChange({
      ...project,
      clips: remaining,
      activeClipId: remaining[0]?.id,
    });
  };

  // Update active clip properties
  const updateActiveClip = (updates: Partial<ClipCandidate>) => {
    if (!activeClip) return;
    const updatedClips = project.clips.map((c) => (c.id === activeClip.id ? { ...c, ...updates } : c));
    commitProjectChange({ ...project, clips: updatedClips });
  };

  // Apply visual preset
  const handleApplyPreset = (template: typeof STYLE_TEMPLATES[0]) => {
    setCaptionStyle(template.style);
  };

  // Actual video export trigger
  const handleStartExport = async () => {
    if (!project.videoUrl || !activeClip) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportSecondsRemaining(0);
    setExportedFile(null);

    abortControllerRef.current = new AbortController();

    try {
      const result = await MediaExporter.renderClip({
        videoUrl: project.videoUrl,
        startTime: activeClip.startTime,
        endTime: activeClip.endTime,
        aspect: activeClip.aspect,
        resolution: exportResolution,
        panX: activeClip.panX ?? 0.5,
        panY: activeClip.panY ?? 0.5,
        zoom: activeClip.zoom ?? 1.0,
        volume: activeClip.isMuted ? 0 : activeClip.volume ?? 1.0,
        isMuted: activeClip.isMuted ?? false,
        captions: burnCaptions ? project.captions : [],
        captionStyle: burnCaptions ? captionStyle : undefined,
        brandKit: includeWatermark ? brandKit : undefined,
        onProgress: (pct, secRemaining) => {
          setExportProgress(pct);
          setExportSecondsRemaining(secRemaining);
        },
        signal: abortControllerRef.current.signal,
      });

      setExportedFile(result);
    } catch (err: any) {
      if (err.message !== 'Export aborted by user') {
        alert('Export failed: ' + err.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    abortControllerRef.current?.abort();
    setIsExporting(false);
  };

  // Find currently active caption for live canvas preview overlay
  const activeCaption = project.captions?.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div className="flex items-center gap-2">
          {/* Clip Selector */}
          <div className="flex items-center gap-2 bg-[#0E111A] border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 font-medium">Clip:</span>
            <select
              value={activeClip?.id || ''}
              onChange={(e) => {
                commitProjectChange({ ...project, activeClipId: e.target.value });
              }}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[180px] truncate"
            >
              {project.clips.map((clip, idx) => (
                <option key={clip.id} value={clip.id} className="bg-[#121520] text-slate-200">
                  #{idx + 1} {clip.title}
                </option>
              ))}
            </select>
          </div>

          {/* Undo & Redo */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-950 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Clip File</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Player on Left, Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport Preview & Timeline */}
        <div className="lg:col-span-8 space-y-4">
          {/* Video Preview Container */}
          <div className="relative rounded-2xl bg-[#08090E] border border-[#1E2333] p-4 flex flex-col items-center justify-center min-h-[460px] shadow-2xl overflow-hidden">
            {/* Aspect Mask Frame */}
            <div
              className={`relative bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 transition-all duration-200 flex items-center justify-center ${
                activeClip?.aspect === '9:16'
                  ? 'w-[270px] sm:w-[310px] aspect-[9/16]'
                  : activeClip?.aspect === '1:1'
                  ? 'w-[320px] sm:w-[380px] aspect-square'
                  : activeClip?.aspect === '4:5'
                  ? 'w-[300px] sm:w-[340px] aspect-[4/5]'
                  : 'w-full max-w-[540px] aspect-video'
              }`}
            >
              {project.videoUrl ? (
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  playsInline
                  muted={isMuted}
                  style={{
                    transform: `scale(${activeClip?.zoom || 1}) translate(${
                      ((activeClip?.panX ?? 0.5) - 0.5) * -50
                    }%, ${((activeClip?.panY ?? 0.5) - 0.5) * -50}%)`,
                  }}
                  className="w-full h-full object-cover transition-transform duration-75"
                />
              ) : (
                <div className="text-slate-600 text-xs">No video stream loaded</div>
              )}

              {/* Live Burnt Subtitle Preview on Viewport */}
              {activeCaption && (
                <div
                  className="absolute left-4 right-4 text-center pointer-events-none transition-all duration-75"
                  style={{
                    top: `${captionStyle.yPercent}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: captionStyle.fontFamily,
                      fontSize: `${Math.round(captionStyle.fontSize * 0.45)}px`,
                      fontWeight: captionStyle.fontWeight,
                      color: captionStyle.textColor,
                      textTransform: captionStyle.textTransform,
                      WebkitTextStroke:
                        captionStyle.outlineWidth > 0
                          ? `${Math.round(captionStyle.outlineWidth * 0.45)}px ${captionStyle.outlineColor}`
                          : 'none',
                      backgroundColor:
                        captionStyle.bgOpacity > 0
                          ? `rgba(0,0,0,${captionStyle.bgOpacity})`
                          : 'transparent',
                      padding: captionStyle.bgOpacity > 0 ? '4px 10px' : '0',
                      borderRadius: `${captionStyle.borderRadius}px`,
                      textShadow: captionStyle.shadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
                    }}
                  >
                    {activeCaption.text}
                  </span>
                </div>
              )}

              {/* Watermark preview */}
              {brandKit && brandKit.watermarkText && (
                <div
                  className={`absolute p-2 pointer-events-none text-[10px] font-bold text-white bg-black/60 rounded backdrop-blur-sm ${
                    brandKit.watermarkPosition === 'top-right'
                      ? 'top-2 right-2'
                      : brandKit.watermarkPosition === 'bottom-left'
                      ? 'bottom-2 left-2'
                      : brandKit.watermarkPosition === 'bottom-right'
                      ? 'bottom-2 right-2'
                      : 'top-2 left-2'
                  }`}
                  style={{ opacity: brandKit.watermarkOpacity }}
                >
                  {brandKit.watermarkText}
                </div>
              )}
            </div>

            {/* In-viewport playback bar */}
            <div className="w-full max-w-lg mt-4 flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[#121520] border border-slate-800 text-xs text-slate-300">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <span className="font-mono text-cyan-400">
                {VideoProcessor.formatTime(currentTime)} / {VideoProcessor.formatTime(activeClip?.endTime || 0)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v;
                    updateActiveClip({ volume: v });
                  }}
                  className="w-16 accent-violet-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Interactive Multi-Track Timeline */}
          <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-violet-400" />
                  Timeline Track
                </span>
                <span className="text-slate-400 font-mono">
                  Clip: {VideoProcessor.formatTime(activeClip?.startTime || 0)} -{' '}
                  {VideoProcessor.formatTime(activeClip?.endTime || 0)} ({activeClip?.duration.toFixed(1)}s)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSplitClip}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181D2D] hover:bg-[#20273D] text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  title="Split clip at playhead"
                >
                  <Split className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Split</span>
                </button>

                <button
                  onClick={handleDuplicateClip}
                  className="p-1.5 rounded-lg bg-[#181D2D] hover:bg-[#20273D] text-slate-300 border border-slate-700 transition"
                  title="Duplicate clip"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleDeleteClip}
                  className="p-1.5 rounded-lg bg-[#181D2D] hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                  title="Delete clip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrubber Ruler */}
            <div className="relative h-14 bg-[#0B0D13] rounded-xl border border-slate-800 p-2 flex items-center overflow-hidden">
              {/* Active clip block on ruler */}
              {activeClip && (
                <div
                  className="absolute top-1 bottom-1 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-2 border-violet-500 rounded-lg"
                  style={{
                    left: `${(activeClip.startTime / project.metadata.duration) * 100}%`,
                    width: `${
                      ((activeClip.endTime - activeClip.startTime) / project.metadata.duration) * 100
                    }%`,
                  }}
                >
                  <div className="text-[10px] font-bold text-violet-300 px-2 py-0.5 truncate">
                    {activeClip.title}
                  </div>
                </div>
              )}

              {/* Playhead marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_#38bdf8] pointer-events-none z-10"
                style={{
                  left: `${(currentTime / project.metadata.duration) * 100}%`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 -ml-1 -mt-0.5" />
              </div>

              {/* Click scrubber track */}
              <input
                type="range"
                min="0"
                max={project.metadata.duration}
                step="0.1"
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>
        </div>

        {/* Right: Inspector Settings Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
            {/* Inspector Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0B0D13] rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('reframe')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'reframe'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Reframe
              </button>
              <button
                onClick={() => setActiveTab('captions')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'captions'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Captions
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'presets'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Styles
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'audio'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Audio
              </button>
            </div>

            {/* TAB 1: Smart Reframing & Crop */}
            {activeTab === 'reframe' && activeClip && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-2">
                    Aspect Ratio Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '9:16', label: '9:16 Vertical (TikTok/Reels)' },
                      { id: '1:1', label: '1:1 Square (Instagram)' },
                      { id: '16:9', label: '16:9 Landscape (YouTube)' },
                      { id: '4:5', label: '4:5 Feed (Facebook)' },
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        onClick={() => updateActiveClip({ aspect: asp.id as AspectRatio })}
                        className={`p-2.5 rounded-xl border text-left transition font-semibold ${
                          activeClip.aspect === asp.id
                            ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                            : 'border-slate-800 bg-[#0E111A] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pan Position Sliders */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Subject Horizontal Focal Pan</span>
                    <span className="font-mono text-cyan-400">{Math.round((activeClip.panX ?? 0.5) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={activeClip.panX ?? 0.5}
                    onChange={(e) => updateActiveClip({ panX: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-slate-300">Subject Vertical Focal Pan</span>
                    <span className="font-mono text-cyan-400">{Math.round((activeClip.panY ?? 0.5) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={activeClip.panY ?? 0.5}
                    onChange={(e) => updateActiveClip({ panY: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-slate-300">Subject Zoom</span>
                    <span className="font-mono text-violet-400">{(activeClip.zoom ?? 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.05"
                    value={activeClip.zoom ?? 1.0}
                    onChange={(e) => updateActiveClip({ zoom: Number(e.target.value) })}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Captions & Subtitles */}
            {activeTab === 'captions' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Subtitle Cues ({project.captions?.length || 0})</span>
                  <button
                    onClick={() => {
                      const newCue: CaptionCue = {
                        id: `cue_${Date.now()}`,
                        startTime: currentTime,
                        endTime: currentTime + 2.5,
                        text: 'Add your punchy caption here...',
                      };
                      commitProjectChange({
                        ...project,
                        captions: [...(project.captions || []), newCue],
                      });
                    }}
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Cue at Playhead</span>
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {(!project.captions || project.captions.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 bg-[#0B0D13] rounded-xl border border-slate-800">
                      No caption cues yet. Click 'Add Cue at Playhead' or use the Captions tab.
                    </div>
                  ) : (
                    project.captions.map((cue, idx) => (
                      <div
                        key={cue.id}
                        className="p-2.5 rounded-xl bg-[#0B0D13] border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono text-cyan-400">
                            {VideoProcessor.formatTime(cue.startTime)} - {VideoProcessor.formatTime(cue.endTime)}
                          </span>
                          <button
                            onClick={() => {
                              const filtered = project.captions.filter((c) => c.id !== cue.id);
                              commitProjectChange({ ...project, captions: filtered });
                            }}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cue.text}
                          onChange={(e) => {
                            const updatedCues = project.captions.map((c) =>
                              c.id === cue.id ? { ...c, text: e.target.value } : c
                            );
                            commitProjectChange({ ...project, captions: updatedCues });
                          }}
                          className="w-full bg-[#141824] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-violet-500"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Caption Preset Gallery */}
            {activeTab === 'presets' && (
              <div className="space-y-3 text-xs">
                <span className="font-semibold text-slate-300 block">
                  Select Viral Subtitle Preset
                </span>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {STYLE_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => handleApplyPreset(tmpl)}
                      className="p-3 rounded-xl bg-[#0E111A] border border-slate-800 hover:border-violet-500/60 cursor-pointer transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{tmpl.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-800">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{tmpl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Audio Controls */}
            {activeTab === 'audio' && activeClip && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Track Volume</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round((activeClip.volume ?? 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeClip.volume ?? 1.0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateActiveClip({ volume: v });
                    if (videoRef.current) videoRef.current.volume = v;
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="font-semibold text-slate-300">Mute Audio</span>
                  <button
                    onClick={() => updateActiveClip({ isMuted: !activeClip.isMuted })}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      activeClip.isMuted
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {activeClip.isMuted ? 'Muted' : 'Unmuted'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121520] border border-slate-700 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-violet-400" />
                <span>Export Playable Video Clip</span>
              </h3>
              {!isExporting && (
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {!exportedFile ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Export Resolution
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportResolution('1080p')}
                      className={`p-2.5 rounded-xl border text-center font-bold ${
                        exportResolution === '1080p'
                          ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                          : 'border-slate-800 bg-[#0E111A] text-slate-400'
                      }`}
                    >
                      1080p Full HD (High Quality)
                    </button>
                    <button
                      onClick={() => setExportResolution('720p')}
                      className={`p-2.5 rounded-xl border text-center font-bold ${
                        exportResolution === '720p'
                          ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                          : 'border-slate-800 bg-[#0E111A] text-slate-400'
                      }`}
                    >
                      720p HD (Faster Rendering)
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={burnCaptions}
                      onChange={(e) => setBurnCaptions(e.target.checked)}
                      className="accent-violet-500 rounded"
                    />
                    <span>Burn styled captions directly into the video file</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWatermark}
                      onChange={(e) => setIncludeWatermark(e.target.checked)}
                      className="accent-violet-500 rounded"
                    />
                    <span>Include Brand Kit watermark badge</span>
                  </label>
                </div>

                {isExporting ? (
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Rendering Frames...</span>
                      <span className="font-mono text-cyan-400">{exportProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all duration-150"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Live canvas rendering in browser</span>
                      <span>~{exportSecondsRemaining}s left</span>
                    </div>

                    <button
                      onClick={handleCancelExport}
                      className="w-full mt-2 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold"
                    >
                      Cancel Export
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartExport}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 font-bold text-white text-xs uppercase tracking-wider shadow-lg shadow-violet-950 transition active:scale-95"
                  >
                    Start Real Video Render
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Video Render Complete!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Output size: {(exportedFile.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • Duration:{' '}
                    {exportedFile.durationSec.toFixed(1)}s
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={exportedFile.downloadUrl}
                    download={`${activeClip?.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'clip'}_1080p.webm`}
                    className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                  <button
                    onClick={() => {
                      setExportedFile(null);
                      setShowExportModal(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
