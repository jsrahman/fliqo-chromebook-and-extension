import React, { useState, useEffect } from 'react';
import { Settings, Maximize, Minimize, Puzzle, Check, HelpCircle } from 'lucide-react';

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
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
