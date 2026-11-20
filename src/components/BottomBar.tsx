import React, { useState, useEffect } from 'react';
import { Settings, Maximize, Minimize } from 'lucide-react';

interface BottomBarProps {
  onOpenSettings: () => void;
  isVisible: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onOpenSettings,
  isVisible,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <footer className={`bottom-bar ${isVisible ? '' : 'hidden'}`}>
      <div className="bottom-hints">
        <span><kbd>S</kbd> Settings</span>
        <span><kbd>F</kbd> Fullscreen</span>
        <span><kbd>Space</kbd> 12/24h</span>
      </div>

      <div className="bottom-buttons-container">
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
