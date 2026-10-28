import React from 'react';
import {
  LayoutDashboard,
  Scissors,
  Film,
  FolderKanban,
  Subtitles,
  Palette,
  Sparkles,
  CalendarDays,
  Settings,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'clipper'
  | 'editor'
  | 'projects'
  | 'captions'
  | 'templates'
  | 'brand-kit'
  | 'social'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  clipCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  clipCount = 0,
}) => {
  const navItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    {
      id: 'clipper',
      label: 'AI Clipper',
      icon: <Scissors className="w-5 h-5 shrink-0 text-violet-400" />,
      badge: clipCount > 0 ? clipCount : undefined,
    },
    { id: 'editor', label: 'Video Editor', icon: <Film className="w-5 h-5 shrink-0 text-cyan-400" /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5 shrink-0" /> },
    { id: 'captions', label: 'Captions', icon: <Subtitles className="w-5 h-5 shrink-0" /> },
    { id: 'templates', label: 'Templates', icon: <Sparkles className="w-5 h-5 shrink-0" /> },
    { id: 'brand-kit', label: 'Brand Kit', icon: <Palette className="w-5 h-5 shrink-0" /> },
    { id: 'social', label: 'Social Planner', icon: <CalendarDays className="w-5 h-5 shrink-0" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 shrink-0" /> },
  ];

  const handleSelect = (tab: NavItem) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-[#0E111A] border-r border-[#1E2333] transition-all duration-300 flex flex-col justify-between ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Top Logo and Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#1E2333]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/30 shrink-0">
                <Video className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    FrameNova <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30">AI</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                    One Video. Endless Clips.
                  </span>
                </div>
              )}
            </div>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1F2E] transition"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/25 to-cyan-500/10 text-white border border-violet-500/40 shadow-sm shadow-violet-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#151926]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <span className={`${isActive ? 'text-violet-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'} transition-transform`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge !== undefined && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom footer badge */}
        <div className="p-3 border-t border-[#1E2333]">
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-[#141824] border border-[#22283D] flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50 animate-pulse" />
              <div className="text-xs text-slate-300 flex-1 truncate">
                <p className="font-semibold text-slate-200">Local-First Studio</p>
                <p className="text-[11px] text-slate-400 truncate">100% Free Core Pipeline</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2" title="Local-First Studio">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
