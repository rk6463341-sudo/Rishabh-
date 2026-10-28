import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Sparkles,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  Download,
  Film,
  Flame,
  Calendar,
  Layers,
  Wand2,
  Clock,
  Info,
  ChevronRight,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Project, ClipCandidate, ContentType, AspectRatio } from '../types';
import { VideoProcessor, HighlightOptions } from '../services/videoProcessor';
import { MediaExporter } from '../services/mediaExporter';

interface AIClipperViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onOpenEditorWithClip: (clipId: string) => void;
  onScheduleClip: (clip: ClipCandidate) => void;
  onImportNewVideo: () => void;
}

export const AIClipperView: React.FC<AIClipperViewProps> = ({
  project,
  onUpdateProject,
  onOpenEditorWithClip,
  onScheduleClip,
  onImportNewVideo,
}) => {
  // Clipper Settings
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [clipCount, setClipCount] = useState<number>(4);
  const [contentType, setContentType] = useState<ContentType>('general');
  const [customTranscript, setCustomTranscript] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);

  // Active Preview Clip Player State
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Exporting state
  const [exportingClipId, setExportingClipId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedSuccessUrl, setExportedSuccessUrl] = useState<{ clipId: string; url: string } | null>(null);

  const activeClip = project?.clips?.find((c) => c.id === previewClipId) || project?.clips?.[0] || null;

  useEffect(() => {
    if (project?.clips && project.clips.length > 0 && !previewClipId) {
      setPreviewClipId(project.clips[0].id);
    }
  }, [project?.clips]);

  // Video playback loop within clip boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    video.currentTime = activeClip.startTime;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= activeClip.endTime) {
        video.currentTime = activeClip.startTime;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [previewClipId, activeClip?.startTime, activeClip?.endTime]);

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

  // Run Highlight Detection
  const handleRunAnalysis = async () => {
    if (!project || !project.metadata) return;
    setIsAnalyzing(true);
    setAnalysisProgress('Scanning audio track energy & vocal peaks...');

    try {
      let peaks: number[] = [];
      if (project.videoUrl) {
        try {
          const res = await fetch(project.videoUrl);
          const blob = await res.blob();
          peaks = await VideoProcessor.analyzeAudioEnergy(blob);
        } catch {
          // If blob audio cannot be decoded directly, fallback continues gracefully
        }
      }

      setAnalysisProgress('Evaluating hook velocity and narrative retention boundaries...');

      const options: HighlightOptions = {
        duration: project.metadata.duration,
        contentType,
        targetClipDuration: targetDuration,
        clipCount,
        transcript: customTranscript,
      };

      const result = await VideoProcessor.detectHighlights(
        project.id,
        options,
        peaks,
        customTranscript
      );

      setAiEngineUsed(result.source);

      // Update project with new candidate clips
      const updated: Project = {
        ...project,
        clips: result.clips,
        activeClipId: result.clips[0]?.id,
      };
      onUpdateProject(updated);
      setPreviewClipId(result.clips[0]?.id || null);
    } catch (err: any) {
      console.error('Highlight analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Adjust clip boundaries
  const handleUpdateClipBounds = (clipId: string, newStart: number, newEnd: number) => {
    if (!project) return;
    const maxDur = project.metadata?.duration || 1000;
    const clampedStart = Math.max(0, Math.min(newStart, maxDur - 2));
    const clampedEnd = Math.min(maxDur, Math.max(clampedStart + 2, newEnd));

    const updatedClips = project.clips.map((c) => {
      if (c.id === clipId) {
        return {
          ...c,
          startTime: Math.round(clampedStart * 10) / 10,
          endTime: Math.round(clampedEnd * 10) / 10,
          duration: Math.round((clampedEnd - clampedStart) * 10) / 10,
        };
      }
      return c;
    });

    onUpdateProject({ ...project, clips: updatedClips });
  };

  const handleUpdateClipAspect = (clipId: string, aspect: AspectRatio) => {
    if (!project) return;
    const updatedClips = project.clips.map((c) => (c.id === clipId ? { ...c, aspect } : c));
    onUpdateProject({ ...project, clips: updatedClips });
  };

  // Export single clip as actual video file
  const handleExportClip = async (clip: ClipCandidate) => {
    if (!project?.videoUrl) return;
    setExportingClipId(clip.id);
    setExportProgress(0);
    setExportedSuccessUrl(null);

    try {
      const renderResult = await MediaExporter.renderClip({
        videoUrl: project.videoUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        aspect: clip.aspect,
        resolution: '1080p',
        panX: clip.panX || 0.5,
        panY: clip.panY || 0.5,
        zoom: clip.zoom || 1.0,
        volume: clip.volume ?? 1.0,
        isMuted: clip.isMuted ?? false,
        captions: project.captions || [],
        captionStyle: undefined,
        onProgress: (pct) => setExportProgress(pct),
      });

      setExportedSuccessUrl({ clipId: clip.id, url: renderResult.downloadUrl });

      // Trigger actual download of the real video file
      const a = document.createElement('a');
      a.href = renderResult.downloadUrl;
      const cleanTitle = clip.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_${clip.aspect.replace(':', 'x')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert('Video export failed: ' + e.message);
    } finally {
      setExportingClipId(null);
    }
  };

  if (!project) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#121520] border border-[#1E2333] space-y-4">
        <Scissors className="w-12 h-12 text-violet-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Video Selected</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Please select or import a video first to start the AI highlight detection and clipping workflow.
        </p>
        <button
          onClick={onImportNewVideo}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition shadow-lg shadow-violet-900/40"
        >
          Import Video Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800 text-[11px] font-bold uppercase tracking-wider">
              AI Clipper Engine
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Source: {project.name} ({VideoProcessor.formatTime(project.metadata.duration)})
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Automated Highlight Detection & Segmentation
          </h1>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-violet-950 disabled:opacity-50 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-white" />
              <span>{project.clips?.length > 0 ? 'Re-Analyze Video' : 'Detect Highlights'}</span>
            </>
          )}
        </button>
      </div>

      {/* Analysis Configuration Settings Panel */}
      <div className="p-5 rounded-2xl bg-[#111420] border border-[#1E2333] space-y-4">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Clip Detection Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target Duration */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Target Clip Duration
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0B0D13] p-1 rounded-xl border border-slate-800">
              {[15, 30, 60].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setTargetDuration(dur)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    targetDuration === dur
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          {/* Number of Clips */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Number of Clips: <span className="text-violet-400 font-bold">{clipCount}</span>
            </label>
            <input
              type="range"
              min="2"
              max="8"
              value={clipCount}
              onChange={(e) => setClipCount(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer mt-2"
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Content Genre</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="general">General / Mixed</option>
              <option value="podcast">Podcast & Interview</option>
              <option value="educational">Educational & Explainer</option>
              <option value="commentary">Reaction & Commentary</option>
              <option value="storytelling">Storytelling & Vlogs</option>
              <option value="gaming">Gaming & Fast Action</option>
            </select>
          </div>

          {/* Engine indicator */}
          <div className="flex flex-col justify-end">
            <div className="p-2.5 rounded-xl bg-[#0B0D13] border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {aiEngineUsed || 'Uses audio decibel envelope + speech cadence segmentation.'}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Custom Transcript input toggle */}
        <details className="text-xs text-slate-400 pt-1">
          <summary className="cursor-pointer text-violet-400 hover:text-violet-300 font-semibold select-none">
            + Provide optional speech transcript for deeper context analysis
          </summary>
          <div className="mt-2">
            <textarea
              rows={3}
              value={customTranscript}
              onChange={(e) => setCustomTranscript(e.target.value)}
              placeholder="Paste video speech or key dialogue here to help the highlight detector identify the exact punchline or key lesson..."
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500"
            />
          </div>
        </details>
      </div>

      {/* Progress banner during analysis */}
      {isAnalyzing && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/60 to-cyan-950/60 border border-violet-800/60 text-white flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-slate-200">Processing Video Signals</p>
            <p className="text-slate-400">{analysisProgress}</p>
          </div>
        </div>
      )}

      {/* Main Workspace: Active Clip Preview Player (Left) + Candidate Clips Gallery (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Clip Player & Boundary Tuner */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Clip Live Preview</h3>
              </div>
              {activeClip && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-950 text-violet-300 text-xs font-mono font-bold border border-violet-800/40">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{activeClip.editorialScore}/100 Quality</span>
                </div>
              )}
            </div>

            {/* Video Canvas Container with Aspect Mask */}
            <div className="relative aspect-[9/16] max-h-[440px] mx-auto rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl">
              {project.videoUrl && (
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Aspect Ratio Badge */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                {activeClip?.aspect || '9:16'}
              </div>

              {/* Play/Pause Center Trigger */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition group"
              >
                <div className="w-12 h-12 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </div>
              </button>

              {/* Time display pill */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-mono text-slate-200">
                <span>{VideoProcessor.formatTime(currentTime)}</span>
                <span className="text-slate-400">
                  Range: {VideoProcessor.formatTime(activeClip?.startTime || 0)} -{' '}
                  {VideoProcessor.formatTime(activeClip?.endTime || 0)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-1 hover:text-white text-slate-400"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Boundary Fine-Tuning Controls */}
            {activeClip && (
              <div className="p-3.5 rounded-xl bg-[#0E111A] border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Trim Boundaries</span>
                  <span className="text-violet-400 font-mono font-bold">
                    Length: {activeClip.duration.toFixed(1)}s
                  </span>
                </div>

                {/* Start Time Adjuster */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Start: {VideoProcessor.formatTime(activeClip.startTime, true)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleUpdateClipBounds(
                            activeClip.id,
                            activeClip.startTime - 1,
                            activeClip.endTime
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateClipBounds(
                            activeClip.id,
                            activeClip.startTime + 1,
                            activeClip.endTime
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={project.metadata.duration}
                    step="0.2"
                    value={activeClip.startTime}
                    onChange={(e) =>
                      handleUpdateClipBounds(
                        activeClip.id,
                        Number(e.target.value),
                        activeClip.endTime
                      )
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* End Time Adjuster */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>End: {VideoProcessor.formatTime(activeClip.endTime, true)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleUpdateClipBounds(
                            activeClip.id,
                            activeClip.startTime,
                            activeClip.endTime - 1
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateClipBounds(
                            activeClip.id,
                            activeClip.startTime,
                            activeClip.endTime + 1
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={project.metadata.duration}
                    step="0.2"
                    value={activeClip.endTime}
                    onChange={(e) =>
                      handleUpdateClipBounds(
                        activeClip.id,
                        activeClip.startTime,
                        Number(e.target.value)
                      )
                    }
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                {/* Primary Clip Actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => onOpenEditorWithClip(activeClip.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-950 transition"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Open in Editor</span>
                  </button>

                  <button
                    onClick={() => handleExportClip(activeClip)}
                    disabled={exportingClipId === activeClip.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {exportingClipId === activeClip.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Rendering {exportProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Video</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Candidate Clips Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Candidate Clips</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                {project.clips?.length || 0}
              </span>
            </h2>

            {project.clips?.length > 0 && (
              <span className="text-xs text-slate-400">
                Click any clip to preview & adjust
              </span>
            )}
          </div>

          {project.clips?.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#121520] border border-[#1E2333] text-center space-y-3">
              <Scissors className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Candidate Clips Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click the "Detect Highlights" button above to run our multi-signal audio energy and narrative segmentation scanner.
              </p>
              <button
                onClick={handleRunAnalysis}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition"
              >
                Run Highlight Detection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {project.clips.map((clip, index) => {
                const isSelected = clip.id === (previewClipId || activeClip?.id);
                const isExporting = exportingClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    onClick={() => setPreviewClipId(clip.id)}
                    className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#181C2B] border-violet-500/80 shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/50'
                        : 'bg-[#121520] border-[#1E2333] hover:border-slate-700 hover:bg-[#141826]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-lg bg-violet-900/60 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0 border border-violet-700/40">
                            #{index + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {clip.title}
                          </h4>

                          {/* Editorial Quality Score badge */}
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 text-[11px] font-bold text-amber-300">
                            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>{clip.editorialScore}/100</span>
                          </div>

                          {/* Aspect selector */}
                          <select
                            value={clip.aspect}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateClipAspect(clip.id, e.target.value as AspectRatio)
                            }
                            className="bg-[#0B0D13] border border-slate-800 text-[11px] font-medium text-cyan-300 rounded-md px-1.5 py-0.5 outline-none"
                          >
                            <option value="9:16">9:16 Vertical</option>
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="4:5">4:5 Social</option>
                          </select>
                        </div>

                        {/* Hook Reason */}
                        <p className="text-xs text-slate-300 leading-relaxed pl-8">
                          {clip.hookReason}
                        </p>

                        {/* Timestamps & Duration */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 pl-8 pt-1">
                          <span className="font-mono text-cyan-400">
                            {VideoProcessor.formatTime(clip.startTime)} -{' '}
                            {VideoProcessor.formatTime(clip.endTime)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-300">
                            {clip.duration.toFixed(1)}s duration
                          </span>
                        </div>
                      </div>

                      {/* Right quick actions */}
                      <div
                        className="flex items-center sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onOpenEditorWithClip(clip.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleExportClip(clip)}
                          disabled={isExporting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                        >
                          {isExporting ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{isExporting ? `${exportProgress}%` : 'Export'}</span>
                        </button>

                        <button
                          onClick={() => onScheduleClip(clip)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          title="Schedule in Social Media Planner"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
