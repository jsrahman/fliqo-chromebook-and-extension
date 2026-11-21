import React, { useState, useEffect } from 'react';
import { Settings, Maximize, Minimize, Puzzle, Check, HelpCircle, Star } from 'lucide-react';
import { isFullscreenActive, toggleFullscreenSafe } from '../utils/fullscreen';

interface BottomBarProps {
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  isVisible: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onOpenSettings,
  onOpenInfo,
  isVisible,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const CACHE_KEY = 'fliqlo_github_stars_cache';
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 10 * 60 * 1000 && typeof count === 'number') {
          setStars(count);
          return;
        }
      }
    } catch {
      // ignore
    }

    fetch('https://api.github.com/repos/jsrahman/fliqo-chromebook-and-extension')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.stargazers_count === 'number') {
          setStars(data.stargazers_count);
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ count: data.stargazers_count, timestamp: Date.now() })
            );
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    toggleFullscreenSafe();
  };

  const handleDownloadClick = () => {
    setIsDownloaded(true);
    setTimeout(() => {
      setIsDownloaded(false);
    }, 3000);
  };

  const baseUrl = import.meta.env.BASE_URL || './';
  const extensionDownloadUrl = baseUrl.endsWith('/')
    ? `${baseUrl}fliqlo-extension.zip`
    : `${baseUrl}/fliqlo-extension.zip`;

  return (
    <footer className={`bottom-bar ${isVisible ? '' : 'hidden'}`}>
      <div className="bottom-hints">
        <span><kbd>S</kbd> Settings</span>
        <span><kbd>F</kbd> / <kbd>Esc</kbd> Fullscreen</span>
        <span><kbd>Space</kbd> 12/24h</span>
      </div>

      <div className="bottom-buttons-container">
        {/* Button: GitHub Repo & Stars */}
        <a
          href="https://github.com/jsrahman/fliqo-chromebook-and-extension"
          target="_blank"
          rel="noopener noreferrer"
          className="action-button github-button"
          title="Star fliqo-chromebook-and-extension on GitHub"
          aria-label="Star on GitHub"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
          <span className="github-star-badge" title={`${stars ?? 0} stars on GitHub`}>
            <Star size={11} fill="currentColor" />
            <span>{stars ?? 0}</span>
          </span>
        </a>

        {/* Button: Guide / About & Chrome OS Guide */}
        <button
          className="action-button guide-button"
          onClick={onOpenInfo}
          title="Fliqlo Web Guide & Chrome OS Solution"
          aria-label="Fliqlo Web Guide and Chrome OS Solution"
        >
          <HelpCircle size={17} />
          <span>Guide</span>
        </button>

        {/* Button: Extension Download */}
        <a
          href={extensionDownloadUrl}
          download="fliqlo-extension.zip"
          onClick={handleDownloadClick}
          className="action-button extension-button"
          title="Download Chrome Extension Screensaver (.zip)"
          aria-label="Download Chrome Extension Screensaver"
        >
          {isDownloaded ? <Check size={17} /> : <Puzzle size={17} />}
          <span>{isDownloaded ? 'Downloaded!' : 'Extension'}</span>
        </a>

        {/* Button 1: Settings */}
        <button
          className="action-button"
          onClick={onOpenSettings}
          title="Clock Settings (S)"
          aria-label="Clock Settings"
        >
          <Settings size={17} />
          <span>Settings</span>
        </button>

        {/* Button 2: Fullscreen */}
        <button
          className="action-button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>
    </footer>
  );
};
