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

  const handleUpdateSettings = useCallback((newSettings: Partial<ClockSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input, don't trigger shortcuts
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'f' || e.key === 'F') {
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
  }, [settings.format, handleUpdateSettings]);

  return (
    <div
      className={`fliqlo-app theme-${settings.backgroundTheme} text-${settings.textColorTheme} font-${settings.fontFamily} ${
        isCursorHidden ? 'hide-cursor' : ''
      }`}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
    >
      {/* Flip Clock Display */}
      <FlipClock settings={settings} />

      {/* 2 Buttons at Bottom: 1 Settings, 2 Fullscreen */}
      <BottomBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        isVisible={isControlsVisible || isSettingsOpen}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

export default App;
