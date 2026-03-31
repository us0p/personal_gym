"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstallEvent(null);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!installEvent) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-sm text-zinc-300">Install Personal Gym for quick access</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setInstallEvent(null)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Dismiss
        </button>
        <button
          onClick={handleInstall}
          className="text-xs font-semibold bg-white text-black rounded-full px-4 py-1.5 hover:bg-zinc-200 active:scale-95 transition-transform"
        >
          Install
        </button>
      </div>
    </div>
  );
}
