/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { OfflineIndicator } from './components/common/OfflineIndicator';

import { DashboardView } from './views/DashboardView';
import { AIClipperView } from './views/AIClipperView';
import { VideoEditorView } from './views/VideoEditorView';
import { ProjectsView } from './views/ProjectsView';
import { CaptionsView } from './views/CaptionsView';
import { TemplatesView } from './views/TemplatesView';
import { BrandKitView } from './views/BrandKitView';
import { SocialPlannerView } from './views/SocialPlannerView';
import { SettingsView } from './views/SettingsView';

import { Project, BrandKit, AppSettings, ClipCandidate } from './types';
import { storage, DEFAULT_SETTINGS, DEFAULT_BRAND_KIT } from './services/storage';
import { VideoProcessor } from './services/videoProcessor';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [storageStats, setStorageStats] = useState({ usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percentage: 0 });

  const [aiStatus, setAiStatus] = useState<{ configured: boolean; checking: boolean }>({
    configured: false,
    checking: true,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [scheduledClip, setScheduledClip] = useState<ClipCandidate | null>(null);

  const filePickerRef = useRef<HTMLInputElement>(null);

  // Initialize storage, projects, brand kit, and check AI health
  useEffect(() => {
    async function initApp() {
      try {
        const [loadedProjects, loadedBrandKits, loadedSettings, estimate] = await Promise.all([
          storage.getProjects(),
          storage.getBrandKits(),
          storage.getSettings(),
          storage.getStorageEstimate(),
        ]);

        setProjects(loadedProjects);
        if (loadedProjects.length > 0) {
          setCurrentProjectId(loadedProjects[0].id);
        }

        if (loadedBrandKits && loadedBrandKits.length > 0) {
          setBrandKit(loadedBrandKits[0]);
        }
        setSettings(loadedSettings);
        setStorageStats(estimate);
      } catch (err) {
        console.error('Failed to load initial data from IndexedDB:', err);
      }

      // Check Server-Side AI Health
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setAiStatus({ configured: !!data.geminiConfigured, checking: false });
        } else {
          setAiStatus({ configured: false, checking: false });
        }
      } catch {
        setAiStatus({ configured: false, checking: false });
      }
    }

    initApp();
  }, []);

  const refreshStorage = useCallback(async () => {
    const est = await storage.getStorageEstimate();
    setStorageStats(est);
  }, []);

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0] || null;

  // Restore video object URL if project has cached blob in IndexedDB
  useEffect(() => {
    if (currentProject && !currentProject.videoUrl) {
      storage.getVideoBlob(currentProject.id).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const updated = { ...currentProject, videoUrl: url };
          setProjects((prev) => prev.map((p) => (p.id === currentProject.id ? updated : p)));
        }
      });
    }
  }, [currentProjectId]);

  // Import video file handler
  const handleImportVideo = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage('Reading video stream and extracting metadata...');

    try {
      const { metadata, thumbnail } = await VideoProcessor.extractMetadata(file);
      const videoUrl = URL.createObjectURL(file);
      const projectId = `proj_${Date.now()}`;

      setStatusMessage('Scanning audio energy peaks and analyzing speech cadence...');
      const peaks = await VideoProcessor.analyzeAudioEnergy(file);

      setStatusMessage('Generating candidate short clips...');
      const highlightResult = await VideoProcessor.detectHighlights(
        projectId,
        {
          duration: metadata.duration,
          contentType: settings.defaultContentType,
          targetClipDuration: settings.defaultClipDuration,
          clipCount: 4,
        },
        peaks
      );

      // Cache video blob in IndexedDB if reasonable size
      await storage.saveVideoBlob(projectId, file);

      // Create initial caption cues if audio duration permits
      const initialCues = [
        {
          id: `cue_init_1`,
          startTime: 0,
          endTime: Math.min(3.5, metadata.duration),
          text: 'Welcome to this video!',
        },
        {
          id: `cue_init_2`,
          startTime: Math.min(3.5, metadata.duration),
          endTime: Math.min(7.0, metadata.duration),
          text: 'Here is the key takeaway you need to know.',
        },
      ];

      const newProject: Project = {
        id: projectId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          ...metadata,
          fileName: file.name,
          thumbnail,
        },
        videoUrl,
        clips: highlightResult.clips,
        captions: initialCues,
        activeClipId: highlightResult.clips[0]?.id,
        brandKitId: brandKit.id,
      };

      await storage.saveProject(newProject);
      setProjects((prev) => [newProject, ...prev]);
      setCurrentProjectId(projectId);
      await refreshStorage();

      // Jump directly to AI Clipper module
      setCurrentTab('clipper');
    } catch (err: any) {
      console.error('Import video failed:', err);
      throw err;
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleUpdateProject = async (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await storage.saveProject(updated);
    refreshStorage();
  };

  const handleDeleteProject = async (id: string) => {
    await storage.deleteProject(id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (currentProjectId === id) {
      setCurrentProjectId(remaining[0]?.id || null);
    }
    refreshStorage();
  };

  const handleDuplicateProject = async (id: string) => {
    const original = projects.find((p) => p.id === id);
    if (!original) return;

    const duplicated: Project = {
      ...original,
      id: `proj_${Date.now()}`,
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clips: original.clips.map((c, i) => ({ ...c, id: `clip_${Date.now()}_${i}` })),
    };

    await storage.saveProject(duplicated);
    setProjects((prev) => [duplicated, ...prev]);
    setCurrentProjectId(duplicated.id);
    refreshStorage();
  };

  const handleRenameProject = async (id: string, newName: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    const updated = { ...proj, name: newName, updatedAt: Date.now() };
    await handleUpdateProject(updated);
  };

  const handleImportProjectJson = async (jsonString: string) => {
    const parsed = JSON.parse(jsonString) as Project;
    const imported: Project = {
      ...parsed,
      id: `proj_${Date.now()}`,
      name: `${parsed.name || 'Imported'} (Restored)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.saveProject(imported);
    setProjects((prev) => [imported, ...prev]);
    setCurrentProjectId(imported.id);
    refreshStorage();
  };

  const handleOpenEditorWithClip = (clipId: string) => {
    if (currentProject) {
      handleUpdateProject({ ...currentProject, activeClipId: clipId });
    }
    setCurrentTab('editor');
  };

  const handleScheduleClip = (clip: ClipCandidate) => {
    setScheduledClip(clip);
    setCurrentTab('social');
  };

  return (
    <div className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col md:flex-row">
      {/* Hidden file input for header/actions */}
      <input
        ref={filePickerRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportVideo(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        clipCount={currentProject?.clips?.length || 0}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentProject={currentProject}
          projects={projects}
          onSelectProject={(id) => setCurrentProjectId(id)}
          onNewProject={() => filePickerRef.current?.click()}
          aiStatus={aiStatus}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              onOpenProject={(id) => {
                setCurrentProjectId(id);
                setCurrentTab('clipper');
              }}
              onImportVideo={handleImportVideo}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
              storageStats={storageStats}
              onNavigate={setCurrentTab}
              isProcessing={isProcessing}
              statusMessage={statusMessage}
            />
          )}

          {currentTab === 'clipper' && (
            <AIClipperView
              project={currentProject}
              onUpdateProject={handleUpdateProject}
              onOpenEditorWithClip={handleOpenEditorWithClip}
              onScheduleClip={handleScheduleClip}
              onImportNewVideo={() => filePickerRef.current?.click()}
            />
          )}

          {currentTab === 'editor' && (
            <VideoEditorView
              project={currentProject}
              onUpdateProject={handleUpdateProject}
              brandKit={brandKit}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              onOpenProject={(id) => {
                setCurrentProjectId(id);
                setCurrentTab('clipper');
              }}
              onNewProject={() => filePickerRef.current?.click()}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onImportProjectJson={handleImportProjectJson}
            />
          )}

          {currentTab === 'captions' && (
            <CaptionsView
              project={currentProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesView
              project={currentProject}
              onUpdateProject={handleUpdateProject}
              onNavigateToEditor={() => setCurrentTab('editor')}
            />
          )}

          {currentTab === 'brand-kit' && (
            <BrandKitView
              brandKit={brandKit}
              onUpdateBrandKit={setBrandKit}
            />
          )}

          {currentTab === 'social' && (
            <SocialPlannerView
              project={currentProject}
              scheduledClip={scheduledClip}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
              storageStats={storageStats}
              onRefreshStorage={refreshStorage}
              aiStatus={aiStatus}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        clipCount={currentProject?.clips?.length || 0}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
