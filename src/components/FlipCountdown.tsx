import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FlipUnit } from './FlipUnit';
import { ClockSettings } from '../types';
import { soundEffects } from './SoundEffects';

export interface FlipCountdownProps {
  settings: ClockSettings;
  onComplete?: () => void;
  isVisible?: boolean;
}

interface PresetOption {
  label: string;
  seconds: number;
}

const PRESET_OPTIONS: PresetOption[] = [
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '2h', seconds: 120 * 60 }, // 2 hours default
  { label: '4h', seconds: 240 * 60 },
  { label: '25m Pomodoro', seconds: 25 * 60 },
];

export const FlipCountdown: React.FC<FlipCountdownProps> = ({
  settings,
  onComplete,
  isVisible = true,
}) => {
  // By default: 30 minutes (30 * 60 = 1800 seconds)
  const DEFAULT_DURATION = 30 * 60;

  // Check URL parameters for custom initial duration or end time (e.g. ?duration=120 or ?endTime=123456789)
  const initialConfig = (() => {
    let dur = DEFAULT_DURATION;
    let rem = DEFAULT_DURATION;
    let running = false;
    let endTs: number | null = null;

    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const endTimeParam = p.get('endTime');
      const durationParam = p.get('duration');
      const modeParam = p.get('mode');

      if (endTimeParam) {
        const parsedEnd = parseInt(endTimeParam, 10);
        if (!isNaN(parsedEnd) && parsedEnd > Date.now()) {
          rem = Math.max(0, Math.ceil((parsedEnd - Date.now()) / 1000));
          dur = rem;
          running = true;
          endTs = parsedEnd;
        }
      } else if (durationParam) {
        const parsedMins = parseInt(durationParam, 10);
        if (!isNaN(parsedMins) && parsedMins > 0) {
          dur = parsedMins * 60;
          rem = dur;
        }
      }

      if (modeParam === 'countdown') {
        running = true;
        if (!endTs) {
          endTs = Date.now() + rem * 1000;
        }
      }
    }

    return { dur, rem, running, endTs };
  })();

  const [duration, setDuration] = useState<number>(initialConfig.dur);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialConfig.rem);
  const [isRunning, setIsRunning] = useState<boolean>(initialConfig.running);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const [autoStartScreensaver, setAutoStartScreensaver] = useState<boolean>(true);

  const endTimeRef = useRef<number | null>(initialConfig.endTs);

  // Toggle Start / Pause
  const handleToggleStart = useCallback(() => {
    if (isRunning) {
      // Pause
      setIsRunning(false);
      setIsPaused(true);
      endTimeRef.current = null;
    } else {
      // Start or Resume
      let targetSeconds = remainingSeconds;
      if (remainingSeconds <= 0 || hasFinished) {
        targetSeconds = duration;
        setRemainingSeconds(duration);
      }
      endTimeRef.current = Date.now() + targetSeconds * 1000;
      setIsRunning(true);
      setIsPaused(false);
      setHasFinished(false);
    }
  }, [isRunning, remainingSeconds, hasFinished, duration]);

  // Reset to current set duration
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setHasFinished(false);
    endTimeRef.current = null;
    setRemainingSeconds(duration);
  }, [duration]);

  // Select a preset duration
  const handleSelectPreset = useCallback((seconds: number) => {
    setIsRunning(false);
    setIsPaused(false);
    setHasFinished(false);
    endTimeRef.current = null;
    setDuration(seconds);
    setRemainingSeconds(seconds);
  }, []);

  // Quick adjust duration by +/- delta seconds
  const handleAdjust = useCallback((deltaSeconds: number) => {
    const newSec = Math.max(60, (isRunning ? remainingSeconds : duration) + deltaSeconds);
    if (isRunning) {
      endTimeRef.current = Date.now() + newSec * 1000;
      setRemainingSeconds(newSec);
    } else {
      setDuration(newSec);
      setRemainingSeconds(newSec);
    }
  }, [isRunning, remainingSeconds, duration]);

  // High-precision ticker loop
  useEffect(() => {
    if (!isRunning) return;

    let animFrameId: number | null = null;
    let fallbackInterval: number | null = null;

    const tick = () => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const diffMs = endTimeRef.current - now;
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));

      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        setIsRunning(false);
        setIsPaused(false);
        setHasFinished(true);
        endTimeRef.current = null;

        // Completion sound sequence
        if (settings.soundEnabled) {
          soundEffects.playFlip(settings.soundVolume);
          window.setTimeout(() => soundEffects.playFlip(settings.soundVolume), 120);
          window.setTimeout(() => soundEffects.playFlip(settings.soundVolume), 240);
        }

        // When countdown is complete, start screensaver
        if (autoStartScreensaver && onComplete) {
          window.setTimeout(() => {
            onComplete();
          }, 800);
        }
      }
    };

    fallbackInterval = window.setInterval(tick, 250);

    const loop = () => {
      tick();
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    return () => {
      if (fallbackInterval !== null) clearInterval(fallbackInterval);
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    };
  }, [isRunning, settings.soundEnabled, settings.soundVolume, autoStartScreensaver, onComplete]);

  // Keyboard shortcuts inside Countdown view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleStart();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleAdjust(15 * 60);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleAdjust(-15 * 60);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleStart, handleReset, handleAdjust]);

  // Split-flap values
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const hourDisplay = String(hours).padStart(2, '0');
  const minuteDisplay = String(minutes).padStart(2, '0');
  const secondDisplay = String(seconds).padStart(2, '0');

  // Scaling matching FlipClock screensaver
  const overallScale = settings.scale ?? 1.0;
  const scaleX = settings.scaleX ?? 1.0;
  const scaleY = settings.scaleY ?? 1.0;
  const fontScaleX = settings.fontScaleX ?? 1.0;
  const fontScaleY = settings.fontScaleY ?? 1.0;
  const totalScaleX = Number((overallScale * scaleX).toFixed(3));
  const totalScaleY = Number((overallScale * scaleY).toFixed(3));

  return (
    <div
      className="clock-container countdown-container"
      style={{
        transform: `scale(${totalScaleX}, ${totalScaleY})`,
        ['--font-scale-x' as string]: String(fontScaleX),
        ['--font-scale-y' as string]: String(fontScaleY),
      }}
    >
      {/* Exact same split-flap card styling as the screensaver */}
      <div className={`flip-clock flip-countdown ${hours > 0 ? 'has-hours' : 'minutes-only'}`}>
        {/* Hours Card: displayed only when hours > 0 (showing 2 flip clocks for MM:SS, 3 flip clocks when hours come) */}
        {hours > 0 && (
          <FlipUnit
            value={hourDisplay}
            soundEnabled={isRunning && settings.soundEnabled}
            soundVolume={settings.soundVolume}
          />
        )}

        {/* Minutes Card */}
        <FlipUnit
          value={minuteDisplay}
          soundEnabled={isRunning && settings.soundEnabled}
          soundVolume={settings.soundVolume}
        />

        {/* Seconds Card */}
        <FlipUnit
          value={secondDisplay}
          isSeconds={true}
          soundEnabled={isRunning && settings.soundEnabled}
          soundVolume={settings.soundVolume}
        />
      </div>

      {/* Countdown status badge (matches Fliqlo date-badge aesthetic) */}
      <div className="date-badge countdown-badge">
        <span className={`countdown-status-dot ${isRunning ? 'running' : isPaused ? 'paused' : 'ready'}`} />
        <span>
          {hasFinished
            ? 'COUNTDOWN COMPLETED • STARTING SCREENSAVER'
            : isRunning
            ? 'COUNTDOWN ACTIVE'
            : isPaused
            ? 'COUNTDOWN PAUSED'
            : 'COUNTDOWN READY'}
        </span>
        <span className="badge-sep">•</span>
        <span>{hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`}</span>
      </div>

      {/* Countdown Interactive Controls (fades out during idle just like bottom bar) */}
      <div className={`countdown-controls-panel ${isVisible ? '' : 'hidden'}`}>
        {/* Presets Row */}
        <div className="countdown-presets-row">
          {PRESET_OPTIONS.map((preset) => {
            const isActive = duration === preset.seconds;
            return (
              <button
                key={preset.label}
                type="button"
                className={`countdown-preset-chip ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset.seconds)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Quick Adjustment Buttons */}
        <div className="countdown-adjust-row">
          <button
            type="button"
            className="countdown-adjust-btn"
            onClick={() => handleAdjust(-15 * 60)}
            title="Subtract 15 minutes"
          >
            -15m
          </button>
          <button
            type="button"
            className="countdown-adjust-btn"
            onClick={() => handleAdjust(15 * 60)}
            title="Add 15 minutes"
          >
            +15m
          </button>
          <button
            type="button"
            className="countdown-adjust-btn"
            onClick={() => handleAdjust(30 * 60)}
            title="Add 30 minutes"
          >
            +30m
          </button>
          <button
            type="button"
            className="countdown-adjust-btn"
            onClick={() => handleAdjust(60 * 60)}
            title="Add 1 hour"
          >
            +1h
          </button>
        </div>

        {/* Main Action Bar */}
        <div className="countdown-actions-row">
          <button
            type="button"
            className={`countdown-btn-main ${isRunning ? 'btn-pause' : 'btn-start'}`}
            onClick={handleToggleStart}
          >
            {isRunning ? '⏸ Pause' : isPaused ? '▶ Resume' : '▶ Start Countdown'}
          </button>

          <button
            type="button"
            className="countdown-btn-reset"
            onClick={handleReset}
            title="Reset countdown"
          >
            ↺ Reset
          </button>

          <label
            className="countdown-auto-screensaver"
            title="Automatically start fullscreen screensaver when countdown reaches 00:00:00"
          >
            <input
              type="checkbox"
              checked={autoStartScreensaver}
              onChange={(e) => setAutoStartScreensaver(e.target.checked)}
            />
            <span className="checkbox-text">Start screensaver when finished</span>
          </label>
        </div>
      </div>
    </div>
  );
};
