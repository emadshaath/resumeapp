"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install rezm.ai</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Add to home screen for quick apply on the go
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-zinc-400 hover:text-zinc-600 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
