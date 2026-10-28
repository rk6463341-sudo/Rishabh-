import React, { useState } from 'react';
import {
  Palette,
  Save,
  Check,
  Type,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { BrandKit } from '../types';
import { storage } from '../services/storage';

interface BrandKitViewProps {
  brandKit: BrandKit;
  onUpdateBrandKit: (updated: BrandKit) => void;
}

export const BrandKitView: React.FC<BrandKitViewProps> = ({
  brandKit,
  onUpdateBrandKit,
}) => {
  const [kit, setKit] = useState<BrandKit>(brandKit);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    await storage.saveBrandKit(kit);
    onUpdateBrandKit(kit);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            <span>Brand Kit Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardize brand colors, typography, watermarks, and subtitle aesthetics across all exported short videos.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-violet-950 transition cursor-pointer"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Saved to Browser!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Brand Kit</span>
            </>
          )}
        </button>
      </div>

      {/* Brand Color Palettes */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-400" />
          <span>Brand Color Palette</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-3 bg-[#0B0D13] border border-slate-800 rounded-xl p-2">
              <input
                type="color"
                value={kit.primaryColor}
                onChange={(e) => setKit({ ...kit, primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-xs text-white">{kit.primaryColor}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Electric Accent Color
            </label>
            <div className="flex items-center gap-3 bg-[#0B0D13] border border-slate-800 rounded-xl p-2">
              <input
                type="color"
                value={kit.accentColor}
                onChange={(e) => setKit({ ...kit, accentColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-xs text-white">{kit.accentColor}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Studio Background Canvas
            </label>
            <div className="flex items-center gap-3 bg-[#0B0D13] border border-slate-800 rounded-xl p-2">
              <input
                type="color"
                value={kit.backgroundColor}
                onChange={(e) => setKit({ ...kit, backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-xs text-white">{kit.backgroundColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Typography */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Type className="w-4 h-4 text-cyan-400" />
          <span>Brand Typography</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Headline Font
            </label>
            <select
              value={kit.fontTitle}
              onChange={(e) => setKit({ ...kit, fontTitle: e.target.value })}
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Sleek Modern)</option>
              <option value="Montserrat">Montserrat (Impactful Viral)</option>
              <option value="JetBrains Mono">JetBrains Mono (Tech/Coding)</option>
              <option value="Georgia">Georgia (Editorial)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Body & Caption Font
            </label>
            <select
              value={kit.fontBody}
              onChange={(e) => setKit({ ...kit, fontBody: e.target.value })}
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Montserrat">Montserrat</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>
        </div>
      </div>

      {/* Watermark / Logo Overlay */}
      <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Watermark Badge & Channel Attribution</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Watermark / Channel Handle Text
            </label>
            <input
              type="text"
              value={kit.watermarkText}
              onChange={(e) => setKit({ ...kit, watermarkText: e.target.value })}
              placeholder="@YourBrand or Channel Name"
              className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Corner Placement
              </label>
              <select
                value={kit.watermarkPosition}
                onChange={(e) =>
                  setKit({
                    ...kit,
                    watermarkPosition: e.target.value as BrandKit['watermarkPosition'],
                  })
                }
                className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="top-right">Top Right Corner</option>
                <option value="top-left">Top Left Corner</option>
                <option value="bottom-right">Bottom Right Corner</option>
                <option value="bottom-left">Bottom Left Corner</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Opacity</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(kit.watermarkOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={kit.watermarkOpacity}
                onChange={(e) => setKit({ ...kit, watermarkOpacity: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
