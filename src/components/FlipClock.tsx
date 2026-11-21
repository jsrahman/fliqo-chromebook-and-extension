import React, { useState, useEffect } from 'react';
import { FlipUnit } from './FlipUnit';
import { ClockSettings } from '../types';

interface FlipClockProps {
  settings: ClockSettings;
}

export const FlipClock: React.FC<FlipClockProps> = ({ settings }) => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    let animFrameId: number | null = null;
    let fallbackInterval: number | null = null;
    let lastSecond = -1;

    // Resilient clock synchronizer - never drifts or gets stuck
    const checkTime = () => {
      const now = new Date();
      const currentSecond = now.getSeconds();
      if (currentSecond !== lastSecond) {
        lastSecond = currentSecond;
        setTime(now);
      }
    };

    // 1. High-precision requestAnimationFrame loop for smooth 60fps/120fps sync
    const loop = () => {
      checkTime();
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    // 2. Safety heartbeat interval (every 300ms) to ensure continuous ticking
    // even if the browser/OS throttles or pauses requestAnimationFrame in background
    fallbackInterval = window.setInterval(checkTime, 300);

    // 3. Instant recovery on tab visibility change, system wake, or window focus
    const handleWake = () => {
      lastSecond = -1;
      setTime(new Date());
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);

    return () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      if (fallbackInterval !== null) window.clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
    };
  }, []);

  const rawHours = time.getHours();
  const rawMinutes = time.getMinutes();
  const rawSeconds = time.getSeconds();

  const is12Hour = settings.format === '12h';
  const hours12 = rawHours % 12 || 12;
  const ampm = rawHours >= 12 ? 'PM' : 'AM';

  // In classic Fliqlo, 12h format hours are not zero-padded (e.g. "8", "9", "12")
  const hourDisplay = is12Hour ? String(hours12) : String(rawHours).padStart(2, '0');
  const minuteDisplay = String(rawMinutes).padStart(2, '0');
  const secondDisplay = String(rawSeconds).padStart(2, '0');

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const overallScale = settings.scale ?? 1.0;
  const scaleX = settings.scaleX ?? 1.0;
  const scaleY = settings.scaleY ?? 1.0;
  const fontScaleX = settings.fontScaleX ?? 1.0;
  const fontScaleY = settings.fontScaleY ?? 1.0;
  const totalScaleX = Number((overallScale * scaleX).toFixed(3));
  const totalScaleY = Number((overallScale * scaleY).toFixed(3));

  return (
    <div
      className="clock-container"
      style={{
        transform: `scale(${totalScaleX}, ${totalScaleY})`,
        ['--font-scale-x' as string]: String(fontScaleX),
        ['--font-scale-y' as string]: String(fontScaleY),
      }}
    >
      <div className="flip-clock">
        {/* Hours Card */}
        <FlipUnit
          value={hourDisplay}
          ampm={ampm}
          showAmPm={is12Hour && settings.showAmPm}
          soundEnabled={settings.soundEnabled}
          soundVolume={settings.soundVolume}
        />

        {/* Minutes Card */}
        <FlipUnit
          value={minuteDisplay}
          soundEnabled={settings.soundEnabled}
          soundVolume={settings.soundVolume}
        />

        {/* Optional Seconds Card */}
        {settings.showSeconds && (
          <FlipUnit
            value={secondDisplay}
            isSeconds={true}
            soundEnabled={settings.soundEnabled}
            soundVolume={settings.soundVolume}
          />
        )}
      </div>

      {settings.showDate && (
        <div className="date-display">{formattedDate}</div>
      )}
    </div>
  );
};
