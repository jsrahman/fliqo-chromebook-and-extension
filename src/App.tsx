import { useState, useEffect, useRef, useCallback } from 'react';
import { FlipClock } from './components/FlipClock';
import { BottomBar } from './components/BottomBar';
import { SettingsModal } from './components/SettingsModal';
import { ClockSettings, DEFAULT_SETTINGS } from './types';
import './styles/flipclock.css';

const STORAGE_KEY = 'fliqlo_clock_settings_v1';

export function App() {
  const [settings, setSettings] = useState<ClockSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isCursorHidden, setIsCursorHidden] = useState(false);

  const idleTimerRef = useRef<number | null>(null);

  // Check if opened with ?mode=screensaver or ?hideControls=true (e.g. from Chrome Extension screensaver)
  const isExtensionScreensaver = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('mode') === 'screensaver' ||
    new URLSearchParams(window.location.search).get('hideControls') === 'true'
  );

  // Sync settings with chrome.storage if running inside Chrome Extension
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeObj = (window as unknown as { chrome?: any }).chrome;
    if (chromeObj?.storage?.sync) {
      chromeObj.storage.sync.get(STORAGE_KEY, (result: Record<string, unknown>) => {
        if (result && result[STORAGE_KEY]) {
          setSettings((prev) => ({
            ...prev,
            ...(result[STORAGE_KEY] as Partial<ClockSettings>),
          }));
        }
      });

      // Listen for runtime updates from the extension popup
      const handleStorageChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
          setSettings((prev) => ({
            ...prev,
            ...(changes[STORAGE_KEY].newValue as Partial<ClockSettings>),
          }));
        }
      };

      chromeObj.storage.onChanged.addListener(handleStorageChange);
      return () => chromeObj.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  const handleUpdateSettings = useCallback((newSettings: Partial<ClockSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // Also save to chrome.storage.sync if extension is active
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chromeObj = (window as unknown as { chrome?: any }).chrome;
        if (chromeObj?.storage?.sync) {
          chromeObj.storage.sync.set({ [STORAGE_KEY]: updated });
        }
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleResetDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeObj = (window as unknown as { chrome?: any }).chrome;
      if (chromeObj?.storage?.sync) {
        chromeObj.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
      }
    } catch {
      // ignore
    }
  }, []);

  // Idle detection for authentic screensaver behavior
  const handleUserActivity = useCallback(() => {
    setIsControlsVisible(true);
    setIsCursorHidden(false);

    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    if (settings.autoHideControls && !isSettingsOpen) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsControlsVisible(false);
        setIsCursorHidden(true);
      }, 3000);
    }
  }, [settings.autoHideControls, isSettingsOpen]);

  useEffect(() => {
    const onMouseMove = () => handleUserActivity();
    const onTouchStart = () => handleUserActivity();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart);

    // Initial timeout trigger
    handleUserActivity();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [handleUserActivity]);

  // Helper to reliably close the extension screensaver window and restore prior workspace
  const closeExtensionScreensaver = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeObj = (window as unknown as { chrome?: any }).chrome;
    if (chromeObj?.runtime?.sendMessage) {
      chromeObj.runtime.sendMessage({ action: 'close_screensaver' });
    }
    try {
      window.close();
    } catch {
      // ignore
    }
  }, []);

  // Extension screensaver: Escape key in ANY state MUST close the screensaver immediately
  useEffect(() => {
    if (!isExtensionScreensaver) return;

    const handleEscPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        closeExtensionScreensaver();
      }
    };

    // Use capture phase on both keydown and keyup so it cannot be intercepted or cancelled
    window.addEventListener('keydown', handleEscPress, true);
    window.addEventListener('keyup', handleEscPress, true);

    // In extension mode, always enforce native full screen
    const enforceFullscreen = () => {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen().catch(() => {});
        }
      }
    };

    enforceFullscreen();
    window.addEventListener('focus', enforceFullscreen);
    document.addEventListener('click', enforceFullscreen);

    return () => {
      window.removeEventListener('keydown', handleEscPress, true);
      window.removeEventListener('keyup', handleEscPress, true);
      window.removeEventListener('focus', enforceFullscreen);
      document.removeEventListener('click', enforceFullscreen);
    };
  }, [isExtensionScreensaver, closeExtensionScreensaver]);

  // Screensaver activity listener: wake Chromebook/Mac and close screensaver on mouse movement or keypress
  useEffect(() => {
    if (!isExtensionScreensaver) return;

    let moveCount = 0;
    const startTime = Date.now();

    const handleScreensaverActivity = (e: Event) => {
      // Escape key always closes immediately with zero delay
      if ((e as KeyboardEvent).key === 'Escape' || (e as KeyboardEvent).code === 'Escape') {
        closeExtensionScreensaver();
        return;
      }

      // Grace period of 800ms for ambient mouse moves
      if (Date.now() - startTime < 800) return;

      if (e.type === 'mousemove') {
        moveCount++;
        if (moveCount < 6) return;
      }

      closeExtensionScreensaver();
    };

    window.addEventListener('mousemove', handleScreensaverActivity);
    window.addEventListener('keydown', handleScreensaverActivity);
    window.addEventListener('mousedown', handleScreensaverActivity);
    window.addEventListener('touchstart', handleScreensaverActivity);

    return () => {
      window.removeEventListener('mousemove', handleScreensaverActivity);
      window.removeEventListener('keydown', handleScreensaverActivity);
      window.removeEventListener('mousedown', handleScreensaverActivity);
      window.removeEventListener('touchstart', handleScreensaverActivity);
    };
  }, [isExtensionScreensaver, closeExtensionScreensaver]);

  // Keyboard shortcuts (for web app mode)
  useEffect(() => {
    if (isExtensionScreensaver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input, don't trigger shortcuts
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      // Escape button: leave fullscreen in web version, or close settings modal
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        if (document.fullscreenElement) {
          e.preventDefault();
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
            (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
          }
          return;
        }

        if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
          return;
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        // Toggle fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleUpdateSettings({
          format: settings.format === '12h' ? '24h' : '12h',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExtensionScreensaver, isSettingsOpen, settings.format, handleUpdateSettings]);

  return (
    <div
      className={`fliqlo-app theme-${settings.backgroundTheme} text-${settings.textColorTheme} font-${settings.fontFamily} ${
        isExtensionScreensaver ? 'is-screensaver' : ''
      } ${
        isCursorHidden ? 'hide-cursor' : ''
      }`}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
    >
      {/* Flip Clock Display */}
      <FlipClock settings={settings} />

      {/* Bottom Bar: hidden if extension screensaver mode requested without controls, or when idle */}
      {!isExtensionScreensaver && (
        <BottomBar
          onOpenSettings={() => setIsSettingsOpen(true)}
          isVisible={isControlsVisible || isSettingsOpen}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetDefaults}
      />
    </div>
  );
}

export default App;
