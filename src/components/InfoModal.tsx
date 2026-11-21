import React, { useState } from 'react';
import {
  X,
  Laptop,
  Sliders,
  Keyboard,
  HelpCircle,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ClockSettings } from '../types';
import { buildShareableUrl } from '../utils/urlSettings';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClockSettings;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'chromeos' | 'options' | 'shortcuts' | 'faq'>('chromeos');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareableUrl = buildShareableUrl(settings);

  const handleCopyLink = async () => {
    // 1. Try modern Async Clipboard API if available and in secure context
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareableUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch {
      // Fallback to legacy method
    }

    // 2. Fallback via temporary textarea execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareableUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch {
      // Fallback
    }

    // 3. Fallback: prompt user to copy manually
    window.prompt('Copy your custom clock URL:', shareableUrl);
  };

  const baseUrl = import.meta.env.BASE_URL || './';
  const extensionDownloadUrl = baseUrl.endsWith('/')
    ? `${baseUrl}fliqlo-extension.zip`
    : `${baseUrl}/fliqlo-extension.zip`;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div className="settings-modal info-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-badge-card" aria-hidden="true">
              <span className="modal-badge-top">i</span>
              <span className="modal-badge-bottom">Q</span>
            </div>
            <div className="modal-title-group">
              <h2 id="info-modal-title" className="modal-title">Fliqlo Web Guide</h2>
              <span className="modal-subtitle">Chrome OS Solution &amp; Custom Options</span>
            </div>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="info-tab-nav" role="tablist">
          <button
            className={`info-tab-btn ${activeTab === 'chromeos' ? 'active' : ''}`}
            onClick={() => setActiveTab('chromeos')}
            role="tab"
            aria-selected={activeTab === 'chromeos'}
          >
            <Laptop size={14} />
            <span>Chrome OS</span>
          </button>
          <button
            className={`info-tab-btn ${activeTab === 'options' ? 'active' : ''}`}
            onClick={() => setActiveTab('options')}
            role="tab"
            aria-selected={activeTab === 'options'}
          >
            <Sliders size={14} />
            <span>Custom Options</span>
          </button>
          <button
            className={`info-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
            role="tab"
            aria-selected={activeTab === 'shortcuts'}
          >
            <Keyboard size={14} />
            <span>Shortcuts</span>
          </button>
          <button
            className={`info-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
            role="tab"
            aria-selected={activeTab === 'faq'}
          >
            <HelpCircle size={14} />
            <span>FAQ</span>
          </button>
        </div>

        {/* Tab 1: Chrome OS & Chromebook Screensaver Solution */}
        {activeTab === 'chromeos' && (
          <div className="info-tab-content">
            <div className="info-callout">
              <Sparkles size={18} className="info-callout-icon" />
              <div>
                <strong className="info-callout-title">The Chrome OS Problem Solved</strong>
                <p className="info-callout-text">
                  Chrome OS / Chromebooks cannot execute traditional <code>.saver</code> (Mac) or <code>.scr</code> (Windows) screensaver binaries.
                  Fliqlo Web provides full native screensaver functionality directly in Chrome OS.
                </p>
              </div>
            </div>

            <div className="solution-card">
              <div className="solution-header">
                <span className="solution-badge">Method 1</span>
                <h3 className="solution-title">Fullscreen Web Screensaver</h3>
              </div>
              <p className="solution-desc">
                Simply press <kbd>F</kbd> (or click Fullscreen) in Chrome. After 3 seconds of inactivity,
                the mouse cursor and controls automatically fade to 0% opacity. Any mouse movement instantly wakes the interface.
              </p>
            </div>

            <div className="solution-card">
              <div className="solution-header">
                <span className="solution-badge">Method 2</span>
                <h3 className="solution-title">Chrome Extension (Automatic Idle Screensaver)</h3>
              </div>
              <p className="solution-desc">
                For true automated screensaver protection when stepping away from your Chromebook:
              </p>
              <ol className="solution-steps">
                <li>Download the ready-to-use extension ZIP:
                  <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                    <a
                      href={extensionDownloadUrl}
                      download="fliqlo-extension.zip"
                      className="btn-download-ext"
                    >
                      <Download size={14} />
                      <span>Download fliqlo-extension.zip</span>
                    </a>
                  </div>
                </li>
                <li>Extract the ZIP file in your ChromeOS Files app.</li>
                <li>Navigate to <code>chrome://extensions</code> in Chrome.</li>
                <li>Enable <strong>Developer mode</strong> in the top right.</li>
                <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
              </ol>
            </div>

            <div className="solution-card">
              <div className="solution-header">
                <span className="solution-badge">Method 3</span>
                <h3 className="solution-title">Chromebook PWA / Shelf Pinning</h3>
              </div>
              <p className="solution-desc">
                Click the <strong>Install</strong> icon in the Chrome omnibox (address bar) to add Fliqlo directly to your Chromebook shelf.
                Launches in dedicated standalone window and works completely offline!
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Web Options & URL Parameters */}
        {activeTab === 'options' && (
          <div className="info-tab-content">
            <p className="info-text">
              Fliqlo Web is a full, highly customizable Solari flip clock edition. Configure in Settings (<kbd>S</kbd>) or via URL parameters:
            </p>

            <div className="features-grid">
              <div className="feature-pill">
                <strong>12h / 24h Display</strong>
                <span>Switch between 12h (with AM/PM badge) and 24h format.</span>
              </div>
              <div className="feature-pill">
                <strong>Seconds Flip Card</strong>
                <span>Optional 3rd flap unit showing live ticking seconds.</span>
              </div>
              <div className="feature-pill">
                <strong>OLED Pitch Black</strong>
                <span>Pure #000000 background for infinite contrast &amp; battery savings.</span>
              </div>
              <div className="feature-pill">
                <strong>Retro Amber &amp; Cyan</strong>
                <span>Vintage warm amber glow or modern cyber cyan numerals.</span>
              </div>
              <div className="feature-pill">
                <strong>Mechanical Sound FX</strong>
                <span>Synthesized plastic flap clicks synthesized via Web Audio API.</span>
              </div>
              <div className="feature-pill">
                <strong>Scale &amp; Aspect Ratio</strong>
                <span>Scale from 60% up to 140% or adjust horizontal/vertical stretch.</span>
              </div>
            </div>

            {/* Share Custom Configuration */}
            <div className="share-section">
              <div className="share-header">
                <Share2 size={16} />
                <span className="share-title">Share Your Custom Clock Setup</span>
              </div>
              <div className="share-input-row">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="share-url-input"
                  aria-label="Shareable clock link"
                />
                <button
                  onClick={handleCopyLink}
                  className="btn-copy-url"
                  title="Copy shareable URL"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <span className="share-hint">
                Bookmark or send this link to launch Fliqlo with your exact customized settings!
              </span>
            </div>

            {/* URL Parameter Table */}
            <div className="param-table-wrapper">
              <h4 className="param-table-title">URL Parameters Quick Reference</h4>
              <table className="param-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Values</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>preset</code></td>
                    <td><code>oled</code>, <code>retro</code>, <code>cyber</code>, <code>neon</code>, <code>minimal</code>, <code>solari</code></td>
                    <td><code>?preset=oled</code></td>
                  </tr>
                  <tr>
                    <td><code>format</code></td>
                    <td><code>12h</code>, <code>24h</code> (or <code>12</code>, <code>24</code>)</td>
                    <td><code>?format=24h</code></td>
                  </tr>
                  <tr>
                    <td><code>theme</code></td>
                    <td><code>oled</code> (black), <code>classic</code>, <code>charcoal</code>, <code>navy</code></td>
                    <td><code>?theme=oled</code></td>
                  </tr>
                  <tr>
                    <td><code>color</code></td>
                    <td><code>amber</code>, <code>white</code>, <code>cream</code>, <code>cyan</code></td>
                    <td><code>?color=amber</code></td>
                  </tr>
                  <tr>
                    <td><code>seconds</code></td>
                    <td><code>true</code>, <code>1</code>, <code>on</code>, <code>false</code>, <code>0</code>, <code>off</code></td>
                    <td><code>?seconds=true</code></td>
                  </tr>
                  <tr>
                    <td><code>sound</code></td>
                    <td><code>true</code>, <code>1</code>, <code>on</code>, <code>false</code>, <code>0</code>, <code>off</code></td>
                    <td><code>?sound=true</code></td>
                  </tr>
                  <tr>
                    <td><code>scale</code></td>
                    <td><code>0.4</code> to <code>4.0</code> (or <code>80%</code> to <code>140%</code>)</td>
                    <td><code>?scale=1.2</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Keyboard Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="info-tab-content">
            <div className="shortcuts-list">
              <div className="shortcut-row">
                <div className="shortcut-key"><kbd>F</kbd></div>
                <div className="shortcut-info">
                  <strong>Toggle Fullscreen</strong>
                  <span>Expands clock to full screen or returns to windowed view.</span>
                </div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-key"><kbd>S</kbd></div>
                <div className="shortcut-info">
                  <strong>Open Settings Modal</strong>
                  <span>Opens the complete customization panel with themes and audio.</span>
                </div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-key"><kbd>Space</kbd></div>
                <div className="shortcut-info">
                  <strong>Toggle 12h / 24h</strong>
                  <span>Instant switch between 12-hour AM/PM and 24-hour time format.</span>
                </div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-key"><kbd>Esc</kbd></div>
                <div className="shortcut-info">
                  <strong>Close Modal / Exit Fullscreen</strong>
                  <span>Closes open dialogs, exits fullscreen, or closes screensaver.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: FAQ */}
        {activeTab === 'faq' && (
          <div className="info-tab-content">
            <div className="faq-list">
              <div className="faq-item">
                <h4 className="faq-q">Can I use Fliqlo on a Chromebook or Chrome OS device?</h4>
                <p className="faq-a">
                  Yes! While traditional desktop <code>.saver</code> or <code>.scr</code> files do not run on Chrome OS,
                  this full web version runs directly in the browser in fullscreen (<kbd>F</kbd>).
                  You can also install the companion Chrome Extension for automatic idle detection screensavers.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-q">Does Fliqlo Web work without an internet connection?</h4>
                <p className="faq-a">
                  Yes! All fonts, CSS animations, and procedural flap click audio run 100% locally on your machine.
                  Once loaded, it works entirely offline.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-q">Is this online flip clock free and privacy-friendly?</h4>
                <p className="faq-a">
                  100% free and open source with zero advertisements, zero tracking scripts, and zero telemetry.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-q">How does the flip animation work?</h4>
                <p className="faq-a">
                  It uses hardware-accelerated CSS 3D perspective transforms with cubic-bezier easing, progressive drop shadows,
                  and authentic split-flap card geometry replicating Solari flip clocks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="info-modal-footer">
          <a
            href="https://github.com/jsrahman/fliqo-chromebook-and-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="info-footer-link"
          >
            <ExternalLink size={12} />
            <span>GitHub Repository</span>
          </a>
          <span className="info-footer-version">Fliqlo Web v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
