import React, { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';

/**
 * A dismissable banner that prompts users to install the app.
 * Only renders when the app is installable (beforeinstallprompt fired).
 */
export function InstallAppBanner() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      id="install-app-banner"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
    >
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            Install IIP App
          </p>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">
            Add to home screen for quick access
          </p>
        </div>
        <button
          id="install-app-button"
          onClick={promptInstall}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Install
        </button>
        <button
          id="dismiss-install-banner"
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
