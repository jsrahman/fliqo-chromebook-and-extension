import React, { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (value !== prevValueRef.current) {
      if (animTimeoutRef.current) {
        window.clearTimeout(animTimeoutRef.current);
      }

      setNextVal(value);
      setNextAmPm(ampm);
      setIsFlipping(true);
      setFlipKey((k) => k + 1);

      if (soundEnabled) {
        soundEffects.playFlip(soundVolume);
      }

      // Animation duration is ~580ms
      animTimeoutRef.current = window.setTimeout(() => {
        setCurrentVal(value);
        setCurrentAmPm(ampm);
        setIsFlipping(false);
        prevValueRef.current = value;
        prevAmPmRef.current = ampm;
      }, 580);
    } else if (ampm !== prevAmPmRef.current) {
      setCurrentAmPm(ampm);
      prevAmPmRef.current = ampm;
    }
  }, [value, ampm, soundEnabled, soundVolume]);

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) {
        window.clearTimeout(animTimeoutRef.current);
      }
    };
  }, []);

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
          <div className="card-half bottom flip-bottom" key={`bottom-${flipKey}`}>
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
