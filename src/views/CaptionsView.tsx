import React, { useState } from 'react';
import {
  Subtitles,
  Download,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  FileText,
  Sliders,
  Type,
  Check,
  Play,
  Volume2,
} from 'lucide-react';
import { Project, CaptionCue, CaptionStyle } from '../types';
import { VideoProcessor } from '../services/videoProcessor';
import { DEFAULT_CAPTION_STYLE, STYLE_TEMPLATES } from '../constants/templates';

interface CaptionsViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
}

export const CaptionsView: React.FC<CaptionsViewProps> = ({ project, onUpdateProject }) => {
  if (!project) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h2 className="text-xl font-bold text-white">No Project Selected</h2>
        <p className="text-sm text-slate-400">Please select a project to manage captions and transcripts.</p>
      </div>
    );
  }

  const cues = project.captions || [];
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(cues[0]?.id || null);
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const updateCues = (newCues: CaptionCue[]) => {
    // Sort by startTime
    newCues.sort((a, b) => a.startTime - b.startTime);
    onUpdateProject({ ...project, captions: newCues });
  };

  const handleAddCue = () => {
    const lastCue = cues[cues.length - 1];
    const newStart = lastCue ? lastCue.endTime + 0.2 : 0;
    const newCue: CaptionCue = {
      id: `cue_${Date.now()}`,
      startTime: Math.round(newStart * 10) / 10,
      endTime: Math.round((newStart + 2.5) * 10) / 10,
      text: 'New subtitle cue text...',
    };
    updateCues([...cues, newCue]);
    setSelectedCueId(newCue.id);
  };

  const handleDeleteCue = (id: string) => {
    updateCues(cues.filter((c) => c.id !== id));
  };

  const handleUpdateCue = (id: string, updates: Partial<CaptionCue>) => {
    updateCues(cues.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Export to SRT
  const handleExportSRT = () => {
    const srt = VideoProcessor.exportToSRT(cues);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to WebVTT
  const handleExportVTT = () => {
    const vtt = VideoProcessor.exportToVTT(cues);
    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_subtitles.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick auto-segmenter for pasting full transcript text
  const handleGenerateCuesFromText = () => {
    if (!bulkTextInput.trim()) return;
    const sentences = bulkTextInput
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const totalDur = project.metadata.duration || 60;
    const durPerSentence = totalDur / Math.max(1, sentences.length);

    const generated: CaptionCue[] = sentences.map((text, idx) => {
      const start = idx * durPerSentence;
      const end = Math.min(totalDur, (idx + 1) * durPerSentence);
      return {
        id: `cue_gen_${Date.now()}_${idx}`,
        startTime: Math.round(start * 10) / 10,
        endTime: Math.round(end * 10) / 10,
        text,
      };
    });

    updateCues(generated);
    setShowBulkModal(false);
    setBulkTextInput('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-violet-400" />
            <span>Captions & Subtitle Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Word-level timing adjustments, Alex Hormozi animated typography, and SRT/VTT file downloads.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paste Full Transcript</span>
          </button>

          <button
            onClick={handleExportSRT}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1F30] hover:bg-[#222A42] text-violet-300 border border-violet-500/30 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .SRT</span>
          </button>

          <button
            onClick={handleExportVTT}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1F30] hover:bg-[#222A42] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .VTT</span>
          </button>

          <button
            onClick={handleAddCue}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-950 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subtitle Cue</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Cues List on Left, Live Typography Styler on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cues Editor List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Transcript Cues ({cues.length})</span>
            <span>Click any cue to preview styling</span>
          </div>

          {cues.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#121520] border border-[#1E2333] space-y-3">
              <Subtitles className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Subtitle Cues Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add cues manually or click "Paste Full Transcript" to automatically generate sentence-aligned timings.
              </p>
              <button
                onClick={handleAddCue}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition"
              >
                Add First Subtitle Cue
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {cues.map((cue, index) => {
                const isSelected = cue.id === selectedCueId;
                return (
                  <div
                    key={cue.id}
                    onClick={() => setSelectedCueId(cue.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#181C2B] border-violet-500 shadow-lg shadow-violet-950/30 ring-1 ring-violet-500/40'
                        : 'bg-[#121520] border-[#1E2333] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono">
                          #{index + 1}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                          <input
                            type="number"
                            step="0.1"
                            value={cue.startTime}
                            onChange={(e) =>
                              handleUpdateCue(cue.id, { startTime: Number(e.target.value) })
                            }
                            className="w-16 bg-[#0B0D13] border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs text-white"
                          />
                          <span>→</span>
                          <input
                            type="number"
                            step="0.1"
                            value={cue.endTime}
                            onChange={(e) =>
                              handleUpdateCue(cue.id, { endTime: Number(e.target.value) })
                            }
                            className="w-16 bg-[#0B0D13] border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs text-white"
                          />
                          <span className="text-slate-500 text-[10px]">
                            ({(cue.endTime - cue.startTime).toFixed(1)}s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteCue(cue.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Delete cue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={cue.text}
                      onChange={(e) => handleUpdateCue(cue.id, { text: e.target.value })}
                      className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-violet-500 transition resize-none"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live Subtitle Typography & Style Customizer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4 sticky top-20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Type className="w-4 h-4 text-violet-400" />
              <span>Subtitle Typography & Styling</span>
            </h3>

            {/* Live Visual Canvas Preview Box */}
            <div className="relative aspect-video rounded-xl bg-[#090B10] border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
              <div
                style={{
                  fontFamily: style.fontFamily,
                  fontSize: `${Math.round(style.fontSize * 0.45)}px`,
                  fontWeight: style.fontWeight,
                  color: style.textColor,
                  textTransform: style.textTransform,
                  WebkitTextStroke:
                    style.outlineWidth > 0
                      ? `${Math.round(style.outlineWidth * 0.45)}px ${style.outlineColor}`
                      : 'none',
                  backgroundColor:
                    style.bgOpacity > 0 ? `rgba(0,0,0,${style.bgOpacity})` : 'transparent',
                  padding: style.bgOpacity > 0 ? '6px 12px' : '0',
                  borderRadius: `${style.borderRadius}px`,
                  textShadow: style.shadow ? '0 2px 10px rgba(0,0,0,0.9)' : 'none',
                  textAlign: 'center',
                }}
              >
                {cues.find((c) => c.id === selectedCueId)?.text ||
                  'THIS IS HOW YOUR CAPTIONS WILL LOOK'}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 text-xs">
              {/* Font Family */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Font Family</label>
                <select
                  value={style.fontFamily}
                  onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                  className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="Montserrat, sans-serif">Montserrat (Ultra Bold Viral)</option>
                  <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans (Modern Clean)</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono (Tech / Cyber)</option>
                  <option value="Georgia, serif">Georgia (Documentary Serif)</option>
                </select>
              </div>

              {/* Text Color & Highlight Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Base Text Color</label>
                  <div className="flex items-center gap-2 bg-[#0B0D13] border border-slate-800 rounded-xl p-1.5">
                    <input
                      type="color"
                      value={style.textColor}
                      onChange={(e) => setStyle({ ...style, textColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-slate-300">{style.textColor}</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Active Keyword Color</label>
                  <div className="flex items-center gap-2 bg-[#0B0D13] border border-slate-800 rounded-xl p-1.5">
                    <input
                      type="color"
                      value={style.highlightColor}
                      onChange={(e) => setStyle({ ...style, highlightColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-slate-300">{style.highlightColor}</span>
                  </div>
                </div>
              </div>

              {/* Size Slider */}
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Font Size</span>
                  <span className="font-mono text-cyan-400">{style.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="64"
                  value={style.fontSize}
                  onChange={(e) => setStyle({ ...style, fontSize: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Y Position */}
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Vertical Position (Y%)</span>
                  <span className="font-mono text-violet-400">{style.yPercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={style.yPercent}
                  onChange={(e) => setStyle({ ...style, yPercent: Number(e.target.value) })}
                  className="w-full accent-violet-500 cursor-pointer"
                />
              </div>

              {/* Uppercase toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300">Force Uppercase</span>
                <button
                  onClick={() =>
                    setStyle({
                      ...style,
                      textTransform: style.textTransform === 'uppercase' ? 'none' : 'uppercase',
                    })
                  }
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    style.textTransform === 'uppercase'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {style.textTransform === 'uppercase' ? 'UPPERCASE ON' : 'Normal Case'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Transcript Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121520] border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Paste Full Speech Transcript</span>
            </h3>
            <p className="text-xs text-slate-400">
              Paste full paragraphs of spoken audio. FrameNova will split sentences and interpolate accurate timestamps across the video's {project.metadata.duration.toFixed(1)}s duration.
            </p>
            <textarea
              rows={6}
              value={bulkTextInput}
              onChange={(e) => setBulkTextInput(e.target.value)}
              placeholder="Paste transcript or speech text here..."
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-violet-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCuesFromText}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-950"
              >
                Generate Subtitle Cues
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
