import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Cpu,
  Shield,
  Download,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  Wifi,
} from 'lucide-react';
import { AppSettings } from '../types';
import { storage } from '../services/storage';
import { PWAInstallButton } from '../components/common/PWAInstallButton';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updated: AppSettings) => void;
  storageStats: { usedBytes: number; quotaBytes: number; percentage: number };
  onRefreshStorage: () => void;
  aiStatus: { configured: boolean; checking: boolean };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  storageStats,
  onRefreshStorage,
  aiStatus,
}) => {
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setCurrent(settings);
  }, [settings]);

  const handleSave = async () => {
    await storage.saveSettings(current);
    onUpdateSettings(current);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearAllData = async () => {
    await storage.clearAllData();
    setShowClearConfirm(false);
    onRefreshStorage();
    window.location.reload();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-400" />
            <span>Studio Settings & Storage</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure default export quality, verify AI engine connectivity, and manage browser IndexedDB storage.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-violet-950 transition cursor-pointer"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : null}
          <span>{isSaved ? 'Settings Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* AI Processing Engine Status */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>AI Engine & Signal Processing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0B0D13] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Server Gemini AI Model</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  aiStatus.configured
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {aiStatus.configured ? 'Configured (Active)' : 'Standby / Fallback'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When GEMINI_API_KEY is configured in the environment, FrameNova calls Gemini 3.8 Flash via secure server-side proxy routes for deep multimodal narrative analysis.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0D13] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Local Browser Signal Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-950 text-violet-300 border border-violet-800">
                100% Free & Always Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              High-precision Web Audio decibel RMS energy tracking, speech pause cadence detection, and algorithmic hook scoring run completely client-side with zero external API requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Export & Render Preferences */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Default Video Export Configuration</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">
              Default Aspect Ratio Preset
            </label>
            <select
              value={current.defaultAspect}
              onChange={(e) =>
                setCurrent({ ...current, defaultAspect: e.target.value as AppSettings['defaultAspect'] })
              }
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="9:16">9:16 Vertical (Shorts, Reels, TikTok)</option>
              <option value="1:1">1:1 Square (Instagram Posts)</option>
              <option value="16:9">16:9 Landscape (YouTube Widescreen)</option>
              <option value="4:5">4:5 Feed (Facebook / Social)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">
              Default Render Resolution
            </label>
            <select
              value={current.exportResolution}
              onChange={(e) =>
                setCurrent({ ...current, exportResolution: e.target.value as '1080p' | '720p' })
              }
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="1080p">1080p (Full HD Studio Grade)</option>
              <option value="720p">720p (High Definition - Fast Export)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">
              Target Framerate
            </label>
            <select
              value={current.exportFps}
              onChange={(e) =>
                setCurrent({ ...current, exportFps: Number(e.target.value) as 30 | 60 })
              }
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value={30}>30 FPS (Standard Social Smoothness)</option>
              <option value={60}>60 FPS (Ultra Fluid Motion)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer p-2 bg-[#0B0D13] rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={current.burnSubtitlesByDefault}
                onChange={(e) =>
                  setCurrent({ ...current, burnSubtitlesByDefault: e.target.checked })
                }
                className="accent-violet-500 rounded"
              />
              <span className="text-xs">Burn subtitles into video files by default</span>
            </label>
          </div>
        </div>
      </div>

      {/* IndexedDB Storage Management */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Local Browser Storage (IndexedDB)</span>
          </h3>
          <button
            onClick={onRefreshStorage}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>Used Storage</span>
            <span className="font-mono text-cyan-400">
              {formatBytes(storageStats.usedBytes)} / {formatBytes(storageStats.quotaBytes)} (
              {storageStats.percentage.toFixed(1)}%)
            </span>
          </div>

          <div className="w-full h-3 bg-[#0B0D13] rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-cyan-400"
              style={{ width: `${Math.max(2, storageStats.percentage)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            Projects, candidate clip timestamps, subtitle cues, and brand kits are safely stored in your browser's private IndexedDB database.
          </p>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Need to free up browser cache?
            </span>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 border border-rose-800/60 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Local Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* PWA & Privacy Guarantee */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <span>Progressive Web App & Privacy Architecture</span>
        </h3>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Local-First Guarantee:</strong> Your raw video files are not sent to any third-party server without explicit user intent. Video trimming, aspect crop rendering, subtitle overlay generation, and file encoding execute directly within your web browser using HTML5 Canvas and MediaRecorder APIs.
          </p>
          <p>
            <strong>Progressive Web App:</strong> FrameNova AI is fully installable as an offline-capable standalone application on Chromium, macOS Safari, iOS, and Android.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <PWAInstallButton />
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#121520] border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Reset All Studio Data?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This will delete all saved projects, clips, and custom settings from IndexedDB. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
