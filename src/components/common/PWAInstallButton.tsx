import React, { useState } from 'react';
import { Download, Share2, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, show subtle installed status or null
  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>PWA Installed</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-lg font-medium transition-all shadow-md active:scale-95 ${
          compact
            ? 'p-2 text-violet-400 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/50'
            : 'px-3 py-1.5 text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/30 shadow-violet-900/30'
        }`}
        title="Install FrameNova AI as Desktop/Mobile PWA"
      >
        <Download className="w-3.5 h-3.5" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:bg-slate-700 transition ${
            compact ? 'p-2' : 'px-3 py-1.5'
          }`}
          title="Install on iOS"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          {!compact && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#121520] border border-slate-700 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Install FrameNova AI</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-violet-900/80 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <p>
                    Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-cyan-900/80 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <p>
                    Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-900/80 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <p>Tap <strong>Add</strong> in the top right to launch full-screen with offline support.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-900/40"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Provide manual desktop shortcut button if browser has not yet fired beforeinstallprompt
  return (
    <button
      onClick={() => {
        alert(
          'To install FrameNova AI, click the Install icon (computer screen with down-arrow) in your browser address bar.'
        );
      }}
      className={`flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/50 hover:bg-slate-800 text-xs font-medium text-slate-300 transition ${
        compact ? 'p-2' : 'px-3 py-1.5'
      }`}
      title="Install App"
    >
      <Download className="w-3.5 h-3.5 text-slate-400" />
      {!compact && <span>Install App</span>}
    </button>
  );
};
