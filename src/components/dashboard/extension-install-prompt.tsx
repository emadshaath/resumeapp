"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Puzzle, X } from "lucide-react";

const STORE_URL =
  process.env.NEXT_PUBLIC_EXTENSION_STORE_URL ||
  "https://chromewebstore.google.com/";

const DISMISS_KEY = "extension-install-dismissed";
const EXTENSION_DETECT_ATTR = "rezmaiExtension";
const DETECTION_TIMEOUT_MS = 5000;

function isChromiumBrowser() {
  if (typeof navigator === "undefined") return false;
  // userAgentData is present on Chromium-based browsers (Chrome, Edge,
  // Brave, Opera). Fallback to UA string for older Chromium versions.
  const brands = (navigator as Navigator & {
    userAgentData?: { brands?: { brand: string }[] };
  }).userAgentData?.brands;
  if (brands && Array.isArray(brands)) {
    return brands.some((b) => /chromium|google chrome|microsoft edge/i.test(b.brand));
  }
  const ua = navigator.userAgent;
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\//.test(ua);
}

export function ExtensionInstallPrompt() {
  const [dismissed, setDismissed] = useState(true); // start hidden until checks pass
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  useEffect(() => {
    // Register service worker (kept here so the existing PWA capabilities
    // — manifest, share_target, offline cache — keep working for users
    // who manually install. The visible prompt now pushes the extension.)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return; // user opted out

    if (!isChromiumBrowser()) return; // only Chromium can run the extension

    const root = document.documentElement;
    const isInstalled = () => root.dataset[EXTENSION_DETECT_ATTR] === "1";

    if (isInstalled()) {
      setExtensionInstalled(true);
      return;
    }

    setDismissed(false);

    // Watch for the content script to set its data-attribute on the
    // <html> element. If the user already has the extension we hide
    // the prompt automatically; otherwise after the detection window
    // expires we leave the prompt visible.
    const observer = new MutationObserver(() => {
      if (isInstalled()) {
        setExtensionInstalled(true);
        observer.disconnect();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-rezmai-extension"] });
    const timeout = window.setTimeout(() => observer.disconnect(), DETECTION_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  if (dismissed || extensionInstalled) return null;

  function handleInstall() {
    window.open(STORE_URL, "_blank", "noopener,noreferrer");
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
          <Puzzle className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install the rezm.ai extension</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Auto-fill job applications and track every job you apply to from any tab.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall}>
              Add to Chrome
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-zinc-400 hover:text-zinc-600 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
