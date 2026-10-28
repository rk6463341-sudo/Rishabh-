import React, { useState } from 'react';
import {
  FolderKanban,
  Search,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit2,
  Download,
  Upload,
  Clock,
  Film,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { Project } from '../types';
import { VideoProcessor } from '../services/videoProcessor';

interface ProjectsViewProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onImportProjectJson: (jsonString: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onImportProjectJson,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartRename = (project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameProject(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleExportProjectJson = (project: Project) => {
    // Export metadata without raw video blob to keep json file portable
    const exportData = {
      ...project,
      videoUrl: undefined,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportProjectJson(text);
      } catch (err: any) {
        alert('Invalid project JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-400" />
            <span>Projects Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your video projects, clips, and exported metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import JSON button */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-950 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search projects by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#121520] border border-[#1E2333] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500"
        />
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#121520] border border-[#1E2333] space-y-3">
          <Film className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? `No projects match "${searchTerm}".`
              : 'Create your first project or import a video from the dashboard.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="group rounded-2xl bg-[#121520] border border-[#1E2333] hover:border-violet-500/50 p-4 transition-all hover:shadow-xl hover:shadow-violet-950/20 cursor-pointer space-y-3"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-xl bg-[#0B0D13] overflow-hidden border border-slate-800">
                {p.metadata?.thumbnail ? (
                  <img
                    src={p.metadata.thumbnail}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Film className="w-8 h-8" />
                  </div>
                )}

                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-slate-200">
                  {VideoProcessor.formatTime(p.metadata?.duration || 0)}
                </div>

                <div className="absolute inset-0 bg-violet-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div>
                {renamingId === p.id ? (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(p.id)}
                      autoFocus
                      className="flex-1 bg-[#0B0D13] border border-violet-500 rounded px-2 py-1 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => handleSaveRename(p.id)}
                      className="px-2 py-1 bg-violet-600 text-white text-xs rounded font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition truncate">
                      {p.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(p);
                      }}
                      className="p-1 text-slate-500 hover:text-white"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>{p.clips?.length || 0} clips</span>
                  <span>•</span>
                  <span>{p.metadata?.aspectRatio || '16:9'}</span>
                  <span>•</span>
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                className="flex items-center justify-between pt-2 border-t border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleExportProjectJson(p)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-cyan-300 transition"
                  title="Export project configuration as JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>Metadata JSON</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onDuplicateProject(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Duplicate project"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#121520] border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Project?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete this project and all associated clips and captions? This action is permanent.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deletingId);
                  setDeletingId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-950"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
