import React, { useEffect } from 'react';
import { X, Volume2, RotateCcw, Download } from 'lucide-react';
import {
  ClockSettings,
  BackgroundTheme,
  TextColorTheme,
  FontFamilyId,
  AVAILABLE_FONTS,
  DEFAULT_SETTINGS,
} from '../types';
import { soundEffects } from './SoundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClockSettings;
  onUpdateSettings: (newSettings: Partial<ClockSettings>) => void;
  onResetDefaults?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentScale = settings.scale ?? 1.0;
  const currentScaleX = settings.scaleX ?? 1.0;
  const currentScaleY = settings.scaleY ?? 1.0;
  const currentFontScaleX = settings.fontScaleX ?? 1.0;
  const currentFontScaleY = settings.fontScaleY ?? 1.0;

  const handleResetScale = () => {
    onUpdateSettings({
      scale: 1.0,
      scaleX: 1.0,
      scaleY: 1.0,
    });
  };

  const handleResetFontSize = () => {
    onUpdateSettings({
      fontScaleX: 1.0,
      fontScaleY: 1.0,
    });
  };

  const handleResetAll = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      onUpdateSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Fliqlo Preferences"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="fliqlo-logo-badge" title="Fliqlo">
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff', transform: 'translateY(1px)' }}>FL</span>
            </div>
            <div className="modal-title-group">
              <h2 className="modal-title">Fliqlo</h2>
              <span className="modal-subtitle">Screen Saver Preferences</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close preferences">
            <X size={15} />
          </button>
        </div>

        <div className="settings-section">
          {/* Section 1: Time & Display */}
          <div className="section-group">
            <span className="section-heading">Time & Display</span>

            {/* Time Format */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Time Format</span>
                <span className="setting-desc">12-hour or 24-hour split flaps</span>
              </div>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${settings.format === '12h' ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ format: '12h' })}
                >
                  12-Hour
                </button>
                <button
                  type="button"
                  className={`segment-btn ${settings.format === '24h' ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ format: '24h' })}
                >
                  24-Hour
                </button>
              </div>
            </div>

            {/* AM/PM indicator */}
            {settings.format === '12h' && (
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">AM / PM Indicator</span>
                  <span className="setting-desc">Corner badge on hour flap</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.showAmPm}
                    onChange={(e) => onUpdateSettings({ showAmPm: e.target.checked })}
                  />
                  <span className="slider-switch" />
                </label>
              </div>
            )}

            {/* Show Seconds */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Display Seconds</span>
                <span className="setting-desc">Add a third flipping seconds card</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showSeconds}
                  onChange={(e) => onUpdateSettings({ showSeconds: e.target.checked })}
                />
                <span className="slider-switch" />
              </label>
            </div>

            {/* Show Date */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Display Date</span>
                <span className="setting-desc">Show calendar date indicator below</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showDate}
                  onChange={(e) => onUpdateSettings({ showDate: e.target.checked })}
                />
                <span className="slider-switch" />
              </label>
            </div>
          </div>

          {/* Section 2: Scale & Geometry */}
          <div className="section-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-heading">Card Size & Custom Scaling</span>
              <button
                type="button"
                className="btn-subtle"
                onClick={handleResetScale}
                title="Reset scale to 100%"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw size={11} /> Reset Scale
              </button>
            </div>

            {/* Overall Scale */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Overall Scale</span>
                <span className="setting-desc">Resize entire clock (40% – 400%)</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  className="range-slider"
                  min="0.4"
                  max="4.0"
                  step="0.05"
                  value={currentScale}
                  onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })}
                />
                <span className="range-value">{Math.round(currentScale * 100)}%</span>
              </div>
            </div>

            {/* Horizontal Scale (Width) */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Horizontal Scale (Width)</span>
                <span className="setting-desc">Card horizontal aspect ratio (40% – 250%)</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  className="range-slider"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={currentScaleX}
                  onChange={(e) => onUpdateSettings({ scaleX: parseFloat(e.target.value) })}
                />
                <span className="range-value">{Math.round(currentScaleX * 100)}%</span>
              </div>
            </div>

            {/* Vertical Scale (Height) */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Vertical Scale (Height)</span>
                <span className="setting-desc">Card vertical aspect ratio (40% – 250%)</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  className="range-slider"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={currentScaleY}
                  onChange={(e) => onUpdateSettings({ scaleY: parseFloat(e.target.value) })}
                />
                <span className="range-value">{Math.round(currentScaleY * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Section 3: Typography & Font Size */}
          <div className="section-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-heading">Typography & Font Size</span>
              {(currentFontScaleX !== 1.0 || currentFontScaleY !== 1.0) && (
                <button
                  type="button"
                  className="btn-subtle"
                  onClick={handleResetFontSize}
                  title="Reset font dimensions to 100%"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={11} /> Reset Font Size
                </button>
              )}
            </div>

            <div className="font-grid">
              {AVAILABLE_FONTS.map((font) => {
                const isSelected = settings.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    className={`font-card ${isSelected ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ fontFamily: font.id as FontFamilyId })}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    {font.badge && <span className="font-badge">{font.badge}</span>}
                    <div
                      className="font-preview"
                      style={{ fontFamily: font.fontFamily }}
                    >
                      12:45
                    </div>
                    <span className="font-name">{font.name}</span>
                    <span className="font-desc">{font.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Font Height (Vertical Size) */}
            <div className="setting-row" style={{ marginTop: '12px' }}>
              <div className="setting-label">
                <span className="setting-title">Font Height (Vertical Size)</span>
                <span className="setting-desc">Taller or more compact numerals (40% – 250%)</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  className="range-slider"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={currentFontScaleY}
                  onChange={(e) => onUpdateSettings({ fontScaleY: parseFloat(e.target.value) })}
                />
                <span className="range-value">{Math.round(currentFontScaleY * 100)}%</span>
              </div>
            </div>

            {/* Font Width (Horizontal Size) */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Font Width (Horizontal Size)</span>
                <span className="setting-desc">Wider or more condensed numerals (40% – 250%)</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  className="range-slider"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={currentFontScaleX}
                  onChange={(e) => onUpdateSettings({ fontScaleX: parseFloat(e.target.value) })}
                />
                <span className="range-value">{Math.round(currentFontScaleX * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Section 4: Mechanical Sound */}
          <div className="section-group">
            <span className="section-heading">Mechanical Audio</span>

            {/* Audio Toggle */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Split-Flap Click Audio</span>
                <span className="setting-desc">Solari flip card mechanical sound</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {settings.soundEnabled && (
                  <button
                    type="button"
                    className="btn-subtle"
                    onClick={() => soundEffects.playFlip(settings.soundVolume)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Volume2 size={12} /> Test
                  </button>
                )}
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => {
                      onUpdateSettings({ soundEnabled: e.target.checked });
                      if (e.target.checked) {
                        soundEffects.playFlip(settings.soundVolume);
                      }
                    }}
                  />
                  <span className="slider-switch" />
                </label>
              </div>
            </div>

            {/* Volume slider */}
            {settings.soundEnabled && (
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Click Volume</span>
                  <span className="setting-desc">Loudness of flap sound</span>
                </div>
                <div className="range-slider-wrapper">
                  <input
                    type="range"
                    className="range-slider"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.soundVolume}
                    onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                  />
                  <span className="range-value">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Atmosphere & Theme */}
          <div className="section-group">
            <span className="section-heading">Atmosphere</span>

            {/* Background Style */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Background Style</span>
                <span className="setting-desc">Classic dark screensaver backdrop</span>
              </div>
              <div className="color-options">
                {(
                  [
                    { id: 'classic', color: '#0e0e0e', title: 'Classic Dark' },
                    { id: 'oled', color: '#000000', title: 'OLED Pure Black' },
                    { id: 'charcoal', color: '#17181a', title: 'Charcoal Slate' },
                    { id: 'navy', color: '#0a0d14', title: 'Deep Midnight' },
                  ] as const
                ).map((th) => (
                  <button
                    key={th.id}
                    className={`color-chip ${settings.backgroundTheme === th.id ? 'active' : ''}`}
                    style={{ backgroundColor: th.color, border: '1px solid rgba(255,255,255,0.2)' }}
                    onClick={() => onUpdateSettings({ backgroundTheme: th.id as BackgroundTheme })}
                    title={th.title}
                    aria-label={th.title}
                  />
                ))}
              </div>
            </div>

            {/* Digit Color */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Digit Color</span>
                <span className="setting-desc">Flap numeral ink color</span>
              </div>
              <div className="color-options">
                {(
                  [
                    { id: 'white', color: '#f2f2f2', title: 'Pure White' },
                    { id: 'vintage-cream', color: '#f7eed8', title: 'Vintage Cream' },
                    { id: 'retro-amber', color: '#ffb347', title: 'Retro Amber' },
                    { id: 'cyan', color: '#64dfdf', title: 'Cyber Cyan' },
                  ] as const
                ).map((tc) => (
                  <button
                    key={tc.id}
                    className={`color-chip ${settings.textColorTheme === tc.id ? 'active' : ''}`}
                    style={{ backgroundColor: tc.color }}
                    onClick={() => onUpdateSettings({ textColorTheme: tc.id as TextColorTheme })}
                    title={tc.title}
                    aria-label={tc.title}
                  />
                ))}
              </div>
            </div>

            {/* Auto Hide Controls */}
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Auto-Hide Controls</span>
                <span className="setting-desc">Hide cursor and buttons when idle</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.autoHideControls}
                  onChange={(e) => onUpdateSettings({ autoHideControls: e.target.checked })}
                />
                <span className="slider-switch" />
              </label>
            </div>
          </div>

          {/* Section 6: Screensaver Extension */}
          <div className="section-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-heading">Screensaver Extension</span>
              <a
                href={`${(import.meta.env.BASE_URL || './').endsWith('/') ? (import.meta.env.BASE_URL || './') : `${import.meta.env.BASE_URL || './'}/`}fliqlo-extension.zip`}
                download="fliqlo-extension.zip"
                className="btn-subtle"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                title="Download Extension ZIP"
              >
                <Download size={11} /> Download .zip
              </a>
            </div>
            <div className="setting-desc" style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Authentic split-flap screensaver for Chrome & Chromebook with system idle auto-launch.
            </div>
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              lineHeight: '1.4'
            }}>
              <div><strong>1.</strong> Click <strong>Download .zip</strong> to get <code>fliqlo-extension.zip</code> and extract it.</div>
              <div><strong>2.</strong> Navigate to <code>chrome://extensions</code> in Chrome and enable <strong>Developer mode</strong> (top right).</div>
              <div><strong>3.</strong> Click <strong>Load unpacked</strong> and select the unzipped <code>extension</code> folder.</div>
            </div>
          </div>

          {/* Reset All */}
          <button
            type="button"
            className="btn-reset-all"
            onClick={handleResetAll}
          >
            Restore Fliqlo Default Settings
          </button>
        </div>
      </div>
    </div>
  );
};