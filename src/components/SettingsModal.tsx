import React, { useEffect } from 'react';
import { X, Volume2, Sparkles, Type } from 'lucide-react';
import { ClockSettings, BackgroundTheme, TextColorTheme, FontFamilyId, AVAILABLE_FONTS } from '../types';
import { soundEffects } from './SoundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClockSettings;
  onUpdateSettings: (newSettings: Partial<ClockSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Clock Settings"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#e0e0e0" />
            <h2 className="modal-title">Fliqlo Settings</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          {/* Font Selection */}
          <div className="setting-row vertical">
            <div className="setting-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={15} color="#93c5fd" />
                <span className="setting-title">Clock Font</span>
              </div>
              <span className="setting-desc">Choose typography for flip numerals</span>
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
                    {font.id === 'fliqlo' && <span className="font-badge">Original</span>}
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
          </div>

          {/* Time Format */}
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-title">Time Format</span>
              <span className="setting-desc">Switch between 12-hour or 24-hour display</span>
            </div>
            <div className="segmented-control">
              <button
                className={`segment-btn ${settings.format === '12h' ? 'active' : ''}`}
                onClick={() => onUpdateSettings({ format: '12h' })}
              >
                12-Hour
              </button>
              <button
                className={`segment-btn ${settings.format === '24h' ? 'active' : ''}`}
                onClick={() => onUpdateSettings({ format: '24h' })}
              >
                24-Hour
              </button>
            </div>
          </div>

          {/* Show AM/PM indicator (only active for 12h) */}
          {settings.format === '12h' && (
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">AM / PM Indicator</span>
                <span className="setting-desc">Display badge on hour card</span>
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
              <span className="setting-desc">Add a flipping seconds flap</span>
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
              <span className="setting-desc">Show current date under clock</span>
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

          {/* Scale Slider */}
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-title">Clock Scale</span>
              <span className="setting-desc">Adjust size on screen</span>
            </div>
            <div className="range-slider-wrapper">
              <input
                type="range"
                className="range-slider"
                min="0.6"
                max="1.4"
                step="0.05"
                value={settings.scale}
                onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })}
              />
              <span className="range-value">{Math.round(settings.scale * 100)}%</span>
            </div>
          </div>

          {/* Mechanical Sound Effect */}
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-title">Mechanical Flip Sound</span>
              <span className="setting-desc">Retro split-flap click audio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {settings.soundEnabled && (
                <button
                  type="button"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ddd',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={() => soundEffects.playFlip(settings.soundVolume)}
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

          {/* Sound Volume (if enabled) */}
          {settings.soundEnabled && (
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Sound Volume</span>
                <span className="setting-desc">Flip sound loudness</span>
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

          {/* Background Theme */}
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-title">Background Style</span>
              <span className="setting-desc">Select backdrop atmosphere</span>
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

          {/* Text Color Theme */}
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-title">Digit Color</span>
              <span className="setting-desc">Font color style</span>
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
      </div>
    </div>
  );
};
