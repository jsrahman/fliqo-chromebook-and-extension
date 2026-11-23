import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Hourglass } from 'lucide-react';
import { FlipClock } from './components/FlipClock';
import { FlipCountdown } from './components/FlipCountdown';
import { BottomBar } from './components/BottomBar';
import { SettingsModal } from './components/SettingsModal';
import { InfoModal } from './components/InfoModal';
import { ClockSettings, DEFAULT_SETTINGS, AppMode } from './types';
import { parseUrlSettings } from './utils/urlSettings';
import { isFullscreenActive, exitFullscreenSafe, toggleFullscreenSafe } from './utils/fullscreen';
import './styles/flipclock.css';

const STORAGE_KEY = 'fliqlo_clock_settings_v1';

function normalizeSettings(raw: Partial<ClockSettings> | null | undefined): ClockSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (
    (merged.fontFamily as string) === 'flip-white' ||
    (merged.fontFamily as string) === 'fliqlo-mac'
  ) {
    merged.fontFamily = 'fliqlo';
  }
  return merged;
}

export function App() {
  const [settings, setSettings] = useState<ClockSettings>(() => {
    let initial = DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        initial = normalizeSettings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    // Apply URL parameter overrides (for instant custom options sharing / embedding)
    if (typeof window !== 'undefined') {
      const urlOverrides = parseUrlSettings(window.location.search);
      initial = normalizeSettings({ ...initial, ...urlOverrides });
    }

    return initial;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('guide') === '1' || p.get('info') === '1' || p.get('help') === '1';
    }
    return false;
  });
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isCursorHidden, setIsCursorHidden] = useState(false);

  // Tab mode state: 'countdown' (Split-flap Timer) or 'screensaver' (Clock)
  const [activeMode, setActiveMode] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab') || p.get('mode');
      if (tabParam === 'screensaver' || tabParam === 'clock') {
        return 'screensaver';
      }
      if (tabParam === 'countdown' || tabParam === 'timer') {
        return 'countdown';
      }
    }
    return 'countdown';
  });

  const idleTimerRef = useRef<number | null>(null);

  // Check if opened with ?mode=screensaver or ?hideControls=true (e.g. from Chrome Extension screensaver)
  const [isExtensionScreensaver, setIsExtensionScreensaver] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return p.get('mode') === 'screensaver' || p.get('hideControls') === 'true';
  });

  // Check if opened with ?mode=countdown (e.g. from Chrome Extension countdown in a tab)
  const [isExtensionCountdown, setIsExtensionCountdown] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return p.get('mode') === 'countdown';
  });

  // Sync settings with chrome.storage if running inside Chrome Extension
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeObj = (window as unknown as { chrome?: any }).chrome;
    if (chromeObj?.storage?.sync) {
      chromeObj.storage.sync.get(STORAGE_KEY, (result: Record<string, unknown>) => {
        if (result && result[STORAGE_KEY]) {
          setSettings((prev) => normalizeSettings({
            ...prev,
            ...(result[STORAGE_KEY] as Partial<ClockSettings>),
          }));
        }
      });

      // Listen for runtime updates from the extension popup
      const handleStorageChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
          setSettings((prev) => normalizeSettings({
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

    if (settings.autoHideControls && !isSettingsOpen && !isInfoOpen) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsControlsVisible(false);
        setIsCursorHidden(true);
      }, 3000);
    }
  }, [settings.autoHideControls, isSettingsOpen, isInfoOpen]);

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
    // If running in a regular web browser tab where window.close() is blocked,
    // gracefully exit screensaver mode so the user is not permanently trapped.
    if (!chromeObj?.runtime?.id) {
      setIsExtensionScreensaver(false);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        url.searchParams.delete('hideControls');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch {
        // ignore
      }
    }
  }, []);

  // Helper to reliably close the extension countdown tab and keep countdown tracking on icon badge
  const closeCountdownTab = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeObj = (window as unknown as { chrome?: any }).chrome;
    if (chromeObj?.runtime?.sendMessage) {
      chromeObj.runtime.sendMessage({ action: 'close_countdown_tab' });
    }
    try {
      window.close();
    } catch {
      // ignore
    }
    if (!chromeObj?.runtime?.id) {
      setIsExtensionCountdown(false);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch {
        // ignore
      }
    }
  }, []);

  // When countdown completes, transition to screensaver
  const handleCountdownComplete = useCallback(() => {
    setActiveMode('screensaver');
  }, []);

  // In countdown tab mode: mouse movement or keypress closes the tab,
  // and countdown continues running on the extension icon badge!
  useEffect(() => {
    if (!isExtensionCountdown) return;

    let moveCount = 0;
    const startTime = Date.now();

    const handleCountdownActivity = (e: Event) => {
      // Escape key closes immediately
      if ((e as KeyboardEvent).key === 'Escape' || (e as KeyboardEvent).code === 'Escape') {
        closeCountdownTab();
        return;
      }

      // Grace period of 800ms
      if (Date.now() - startTime < 800) return;

      if (e.type === 'mousemove') {
        moveCount++;
        if (moveCount < 6) return;
      }

      closeCountdownTab();
    };

    window.addEventListener('mousemove', handleCountdownActivity);
    window.addEventListener('keydown', handleCountdownActivity);
    window.addEventListener('mousedown', handleCountdownActivity);
    window.addEventListener('touchstart', handleCountdownActivity);

    return () => {
      window.removeEventListener('mousemove', handleCountdownActivity);
      window.removeEventListener('keydown', handleCountdownActivity);
      window.removeEventListener('mousedown', handleCountdownActivity);
      window.removeEventListener('touchstart', handleCountdownActivity);
    };
  }, [isExtensionCountdown, closeCountdownTab]);

  // Extension screensaver: auto-close when configured duration expires
  useEffect(() => {
    if (!isExtensionScreensaver) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeObj = (window as unknown as { chrome?: any }).chrome;
    if (!chromeObj?.storage?.local) return;

    const checkAutoClose = () => {
      chromeObj.storage.local.get(['screensaverEndTime'], (res: { screensaverEndTime?: number }) => {
        if (res?.screensaverEndTime && Date.now() >= res.screensaverEndTime) {
          closeExtensionScreensaver();
        }
      });
    };

    const intervalId = window.setInterval(checkAutoClose, 1000);
    checkAutoClose();

    return () => window.clearInterval(intervalId);
  }, [isExtensionScreensaver, closeExtensionScreensaver]);

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

    return () => {
      window.removeEventListener('keydown', handleEscPress, true);
      window.removeEventListener('keyup', handleEscPress, true);
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
        if (isFullscreenActive()) {
          e.preventDefault();
          exitFullscreenSafe();
          return;
        }

        if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
          return;
        }

        if (isInfoOpen) {
          e.preventDefault();
          setIsInfoOpen(false);
          return;
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        // Toggle fullscreen
        toggleFullscreenSafe();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (e.key === 'i' || e.key === 'I' || e.key === '?') {
        e.preventDefault();
        setIsInfoOpen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setActiveMode((prev) => (prev === 'screensaver' ? 'countdown' : 'screensaver'));
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleUpdateSettings({
          format: settings.format === '12h' ? '24h' : '12h',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExtensionScreensaver, isSettingsOpen, isInfoOpen, settings.format, handleUpdateSettings]);

  const isFullScreenScreensaverMode = isExtensionScreensaver || isExtensionCountdown;

  return (
    <div
      className={`fliqlo-app theme-${settings.backgroundTheme} text-${settings.textColorTheme} font-${settings.fontFamily} ${
        isFullScreenScreensaverMode ? 'is-screensaver' : ''
      } ${
        isCursorHidden ? 'hide-cursor' : ''
      }`}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
    >
      {/* Mode Navigation Tabs (Countdown vs Screensaver) */}
      {!isFullScreenScreensaverMode && (
        <nav
          className={`mode-tabs-bar ${isControlsVisible || isSettingsOpen || isInfoOpen ? '' : 'hidden'}`}
          role="tablist"
          aria-label="Countdown and screensaver modes"
        >
          <button
            type="button"
            className={`mode-tab-btn ${activeMode === 'countdown' ? 'active' : ''}`}
            onClick={() => setActiveMode('countdown')}
            role="tab"
            aria-selected={activeMode === 'countdown'}
            title="Split-Flap Countdown Timer (Press C to switch)"
          >
            <Hourglass size={15} aria-hidden="true" />
            <span>Countdown</span>
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${activeMode === 'screensaver' ? 'active' : ''}`}
            onClick={() => setActiveMode('screensaver')}
            role="tab"
            aria-selected={activeMode === 'screensaver'}
            title="Screensaver Clock (Press C to switch)"
          >
            <Clock size={15} aria-hidden="true" />
            <span>Screensaver</span>
          </button>
        </nav>
      )}

      {/* Flip Countdown Display or Flip Clock Display */}
      {activeMode === 'countdown' ? (
        <FlipCountdown
          settings={settings}
          onComplete={handleCountdownComplete}
          isVisible={!isFullScreenScreensaverMode && (isControlsVisible || isSettingsOpen || isInfoOpen)}
        />
      ) : (
        <FlipClock settings={settings} />
      )}

      {/* Bottom Bar: hidden if extension screensaver mode requested without controls, or when idle */}
      {!isFullScreenScreensaverMode && (
        <BottomBar
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenInfo={() => setIsInfoOpen(true)}
          isVisible={isControlsVisible || isSettingsOpen || isInfoOpen}
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

      {/* About & Chrome OS Guide Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        settings={settings}
      />
    </div>
  );
}

export default App;
