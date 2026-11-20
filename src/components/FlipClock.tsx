import React, { useState, useEffect } from 'react';
import { FlipUnit } from './FlipUnit';
import { ClockSettings } from '../types';

interface FlipClockProps {
  settings: ClockSettings;
}

export const FlipClock: React.FC<FlipClockProps> = ({ settings }) => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    // Keep exact synchronization with real system clock
    const updateTime = () => setTime(new Date());

    // Compute delay until the start of the next exact second
    const now = Date.now();
    const delay = 1000 - (now % 1000);

    const initialTimeout = window.setTimeout(() => {
      updateTime();
      const interval = window.setInterval(updateTime, 1000);
      return () => window.clearInterval(interval);
    }, delay);

    return () => window.clearTimeout(initialTimeout);
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

  return (
    <div
      className="clock-container"
      style={{ transform: `scale(${settings.scale})` }}
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
