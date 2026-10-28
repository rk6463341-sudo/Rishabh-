import React from 'react';
import {
  Sparkles,
  FolderOpen,
  Plus,
  Layers,
  Cpu,
  CheckCircle,
  Menu,
} from 'lucide-react';
import { Project } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HeaderProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  aiStatus: { configured: boolean; checking: boolean };
  onToggleMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  aiStatus,
  onToggleMobileNav,
}) => {
  return (
    <header className="h-16 border-b border-[#1E2333] bg-[#0E111A]/90 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
      {/* Left: Mobile hamburger + active project selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand on mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-white tracking-tight">FrameNova</span>
        </div>

        {/* Project Selector dropdown */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800 md:border-l-0 md:pl-0">
          <div className="flex items-center gap-2 bg-[#141824] border border-[#22283D] rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-violet-400" />
            <select
              value={currentProject?.id || ''}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  onNewProject();
                } else if (e.target.value) {
                  onSelectProject(e.target.value);
                }
              }}
              className="bg-transparent text-xs sm:text-sm font-medium text-slate-200 outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
            >
              {projects.length === 0 && <option value="">No Active Project</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#141824] text-slate-200">
                  {p.name}
                </option>
              ))}
              <option value="__new__" className="bg-[#141824] text-violet-400 font-semibold">
                + Create New Project...
              </option>
            </select>
          </div>

          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition"
            title="Start a new project"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">New Project</span>
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        {/* AI Engine Status indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
            aiStatus.configured
              ? 'bg-violet-950/40 text-violet-300 border-violet-800/40'
              : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
          }`}
          title={
            aiStatus.configured
              ? 'Gemini 3.8 Flash AI Model is active on the server.'
              : 'Local Browser Signal Engine is active (Zero API key required).'
          }
        >
          <Cpu className="w-3 h-3 animate-pulse" />
          <span className="hidden sm:inline">
            {aiStatus.configured ? 'Gemini AI Active' : 'Local Signal Engine'}
          </span>
          <span className="sm:hidden">
            {aiStatus.configured ? 'AI' : 'Local'}
          </span>
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton />
      </div>
    </header>
  );
};
