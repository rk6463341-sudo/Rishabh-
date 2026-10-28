import React from 'react';
import {
  LayoutDashboard,
  Scissors,
  Film,
  Subtitles,
  FolderKanban,
} from 'lucide-react';
import { NavItem } from './Sidebar';

interface MobileTabBarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  clipCount?: number;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  currentTab,
  onSelectTab,
  clipCount = 0,
}) => {
  const items: { id: NavItem; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'clipper',
      label: 'Clipper',
      icon: <Scissors className="w-5 h-5" />,
      badge: clipCount > 0 ? clipCount : undefined,
    },
    { id: 'editor', label: 'Editor', icon: <Film className="w-5 h-5" /> },
    { id: 'captions', label: 'Captions', icon: <Subtitles className="w-5 h-5" /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E111A]/95 backdrop-blur-lg border-t border-[#1E2333] px-2 py-1.5 pb-safe flex items-center justify-around">
      {items.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              isActive
                ? 'text-violet-400 font-semibold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-violet-600 text-[10px] font-bold text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
