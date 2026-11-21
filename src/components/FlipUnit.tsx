import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundEffects } from './SoundEffects';

interface FlipUnitProps {
  value: string;
  ampm?: string;
  showAmPm?: boolean;
  isSeconds?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
}

export const FlipUnit: React.FC<FlipUnitProps> = ({
  value,
  ampm,
  showAmPm = false,
  isSeconds = false,
  soundEnabled = false,
  soundVolume = 0.5,
}) => {
  const [currentVal, setCurrentVal] = useState(value);
  const [nextVal, setNextVal] = useState(value);
  const [currentAmPm, setCurrentAmPm] = useState(ampm);
  const [nextAmPm, setNextAmPm] = useState(ampm);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipKey, setFlipKey] = useState(0);

  const prevValueRef = useRef(value);
  const prevAmPmRef = useRef(ampm);
  const animTimeoutRef = useRef<number | null>(null);

  // Complete and commit any ongoing animation cleanly
  const finishFlip = useCallback((targetVal: string, targetAmPm?: string) => {
    if (animTimeoutRef.current) {
      window.clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    setCurrentVal(targetVal);
    setNextVal(targetVal);
    setCurrentAmPm(targetAmPm);
    setNextAmPm(targetAmPm);
    setIsFlipping(false);
  }, []);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const oldVal = prevValueRef.current;
      prevValueRef.current = value;
      prevAmPmRef.current = ampm;

      // If document is hidden/backgrounded, skip CSS animation to prevent getting stuck
      if (typeof document !== 'undefined' && document.hidden) {
        finishFlip(value, ampm);
        return;
      }

      // If an existing flip was in progress, ensure base card matches prior target
      if (animTimeoutRef.current) {
        window.clearTimeout(animTimeoutRef.current);
      }

      setCurrentVal(oldVal);
      setNextVal(value);
      setCurrentAmPm(currentAmPm);
      setNextAmPm(ampm);
      setIsFlipping(true);
      setFlipKey((k) => k + 1);

      if (soundEnabled) {
        soundEffects.playFlip(soundVolume);
      }

      // Fallback timer: guarantees transition finishes even if animation event is interrupted
      animTimeoutRef.current = window.setTimeout(() => {
        finishFlip(value, ampm);
      }, 580);
    } else if (ampm !== prevAmPmRef.current) {
      setCurrentAmPm(ampm);
      setNextAmPm(ampm);
      prevAmPmRef.current = ampm;
    }
  }, [value, ampm, soundEnabled, soundVolume, currentAmPm, finishFlip]);

  // Clean recovery on tab visibility change or window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        finishFlip(value, ampm);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (animTimeoutRef.current) {
        window.clearTimeout(animTimeoutRef.current);
      }
    };
  }, [value, ampm, finishFlip]);

  return (
    <div className={`flip-unit ${isSeconds ? 'seconds-unit' : ''}`}>
      {/* 1. Static Top Flap (shows next digit while flipping, or current digit when idle) */}
      <div className="card-half top">
        <span className="card-number">{isFlipping ? nextVal : currentVal}</span>
        <div className="shadow-overlay" />
      </div>

      {/* 2. Static Bottom Flap (shows current digit until covered by flipping bottom) */}
      <div className="card-half bottom">
        <span className="card-number">{currentVal}</span>
        {showAmPm && currentAmPm && (
          <span className="ampm-badge">{currentAmPm}</span>
        )}
        <div className={`cast-shadow ${isFlipping ? 'active' : ''}`} key={`cast-${flipKey}`} />
        <div className="shadow-overlay" />
      </div>

      {/* 3. Flipping Cards (only rendered while flipping) */}
      {isFlipping && (
        <>
          {/* Top Flap rotating downwards from 0deg to -90deg */}
          <div className="card-half top flip-top" key={`top-${flipKey}`}>
            <span className="card-number">{currentVal}</span>
            <div className="shadow-overlay" />
          </div>

          {/* Bottom Flap rotating downwards from 90deg to 0deg */}
          <div
            className="card-half bottom flip-bottom"
            key={`bottom-${flipKey}`}
            onAnimationEnd={() => finishFlip(value, ampm)}
          >
            <span className="card-number">{nextVal}</span>
            {showAmPm && nextAmPm && (
              <span className="ampm-badge">{nextAmPm}</span>
            )}
            <div className="shadow-overlay" />
          </div>
        </>
      )}

      {/* Center Dividing Line */}
      <div className="divider-line" />

      {/* Mechanical Solari-style Hinge Notches on Left and Right */}
      <div className="hinge left" />
      <div className="hinge right" />
    </div>
  );
};
