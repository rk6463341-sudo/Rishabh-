import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  Flame,
  Zap,
  BookOpen,
  Film,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Project } from '../types';
import { STYLE_TEMPLATES, StyleTemplate } from '../constants/templates';

interface TemplatesViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onNavigateToEditor: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToEditor,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(STYLE_TEMPLATES[0].id);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const activeTemplate = STYLE_TEMPLATES.find((t) => t.id === selectedTemplateId) || STYLE_TEMPLATES[0];

  const handleApplyToProject = (template: StyleTemplate) => {
    if (!project) return;
    onUpdateProject({
      ...project,
      selectedTemplateId: template.id,
    });
    setAppliedMessage(`Applied "${template.name}" template to your active project.`);
    setTimeout(() => setAppliedMessage(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span>Viral Editing Templates</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Proven high-retention caption styles, typography palettes, and layout aesthetics modeled after top creators.
          </p>
        </div>

        {appliedMessage && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{appliedMessage}</span>
          </div>
        )}
      </div>

      {/* Featured Template Spotlight Preview */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#161928] via-[#10131E] to-[#0A0C14] border border-[#23293E] grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xl">
        <div className="md:col-span-7 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/80 border border-violet-800/40 text-xs font-bold text-violet-300">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeTemplate.badge}</span>
          </div>

          <h2 className="text-2xl font-black text-white">{activeTemplate.name}</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
            {activeTemplate.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Font</span>
              <span className="font-semibold text-slate-200">{activeTemplate.style.fontFamily.split(',')[0]}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Highlight</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-black/40"
                  style={{ backgroundColor: activeTemplate.style.highlightColor }}
                />
                <span className="font-mono text-slate-200">{activeTemplate.style.highlightColor}</span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Position</span>
              <span className="font-semibold text-slate-200 capitalize">{activeTemplate.style.position} ({activeTemplate.style.yPercent}%)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleApplyToProject(activeTemplate)}
              disabled={!project}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-violet-950 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Current Project</span>
            </button>

            {project && (
              <button
                onClick={onNavigateToEditor}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300"
              >
                <span>Open in Video Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Visual Canvas Preview Box for Template */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-64 aspect-[9/16] rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-b from-[#181C2E]/60 to-[#0A0D16]/90" />
            <div className="relative z-10 text-center space-y-2 pointer-events-none">
              <span
                style={{
                  fontFamily: activeTemplate.style.fontFamily,
                  fontSize: `${Math.round(activeTemplate.style.fontSize * 0.42)}px`,
                  fontWeight: activeTemplate.style.fontWeight,
                  color: activeTemplate.style.textColor,
                  textTransform: activeTemplate.style.textTransform,
                  WebkitTextStroke:
                    activeTemplate.style.outlineWidth > 0
                      ? `${Math.round(activeTemplate.style.outlineWidth * 0.45)}px ${activeTemplate.style.outlineColor}`
                      : 'none',
                  backgroundColor:
                    activeTemplate.style.bgOpacity > 0
                      ? `rgba(0,0,0,${activeTemplate.style.bgOpacity})`
                      : 'transparent',
                  padding: activeTemplate.style.bgOpacity > 0 ? '6px 12px' : '0',
                  borderRadius: `${activeTemplate.style.borderRadius}px`,
                  textShadow: activeTemplate.style.shadow ? '0 2px 10px rgba(0,0,0,0.9)' : 'none',
                }}
              >
                STOP SCROLLING
                <br />
                <span style={{ color: activeTemplate.style.highlightColor }}>
                  THIS WILL BLOW YOUR MIND
                </span>
              </span>
            </div>
            <div className="absolute bottom-3 text-[10px] text-slate-500 font-mono">
              9:16 Vertical Preview
            </div>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {STYLE_TEMPLATES.map((tmpl) => {
          const isSelected = tmpl.id === selectedTemplateId;
          return (
            <div
              key={tmpl.id}
              onClick={() => setSelectedTemplateId(tmpl.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-[#181C2B] border-violet-500 shadow-xl shadow-violet-950/30 ring-1 ring-violet-500/50'
                  : 'bg-[#121520] border-[#1E2333] hover:border-slate-700 hover:bg-[#141826]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{tmpl.category}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-800">
                  {tmpl.badge}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{tmpl.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tmpl.description}</p>
              </div>

              {/* Sample Subtitle Strip */}
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800 text-center">
                <span
                  style={{
                    fontFamily: tmpl.style.fontFamily,
                    fontSize: '15px',
                    fontWeight: tmpl.style.fontWeight,
                    color: tmpl.style.textColor,
                    textTransform: tmpl.style.textTransform,
                    WebkitTextStroke:
                      tmpl.style.outlineWidth > 0
                        ? `1.5px ${tmpl.style.outlineColor}`
                        : 'none',
                  }}
                >
                  Viral Hook <span style={{ color: tmpl.style.highlightColor }}>Keywords</span>
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 font-mono">
                  {tmpl.style.fontFamily.split(',')[0]}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyToProject(tmpl);
                  }}
                  disabled={!project}
                  className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white text-xs font-semibold border border-violet-500/30 transition disabled:opacity-30"
                >
                  Apply
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
