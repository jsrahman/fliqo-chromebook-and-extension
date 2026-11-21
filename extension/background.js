// Fliqlo Chrome Extension - Background Service Worker (Manifest V3)
// Handles Chromebook idle detection, fullscreen screensaver launching, and power management

const STORAGE_KEY = 'fliqlo_clock_settings_v1';
const EXT_CONFIG_KEY = 'fliqlo_extension_config_v1';

let screensaverWindowId = null;
let previousFocusedWindowId = null;

const DEFAULT_EXT_CONFIG = {
  idleTimeoutMinutes: 5,
  autoLaunchEnabled: true,
  keepAwake: true,
  exitOnActivity: true,
  excludedSites: [
    { domain: 'youtube.com', mode: 'playing' },
    { domain: 'netflix.com', mode: 'playing' },
  ],
};

// Check if active tab or audible media matches an excluded site rule
async function shouldBlockScreensaver(config) {
  const excludedSites = config.excludedSites || [];
  if (!Array.isArray(excludedSites) || excludedSites.length === 0) {
    return false;
  }

  try {
    // 1. Get active tab in last focused window
    const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const activeTab = activeTabs && activeTabs[0];

    // 2. Also check all tabs that are playing audio/video
    const audibleTabs = await chrome.tabs.query({ audible: true });

    for (const site of excludedSites) {
      if (!site || !site.domain) continue;
      const targetDomain = site.domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!targetDomain) continue;
      const mode = site.mode || 'always'; // 'always' | 'playing'

      // Check active tab
      if (activeTab && activeTab.url) {
        try {
          const tabHostname = new URL(activeTab.url).hostname.toLowerCase();
          const matches = tabHostname === targetDomain || tabHostname.endsWith('.' + targetDomain);
          if (matches) {
            if (mode === 'always') {
              console.log(`[Fliqlo] Screensaver blocked: active tab on ${tabHostname} is excluded (always)`);
              return true;
            }
            if (mode === 'playing' && activeTab.audible) {
              console.log(`[Fliqlo] Screensaver blocked: active tab on ${tabHostname} is playing media`);
              return true;
            }
          }
        } catch {
          // ignore URL parsing errors on chrome:// pages etc.
        }
      }

      // If mode is 'playing', check if any audible tab belongs to this domain
      if (mode === 'playing' && audibleTabs && audibleTabs.length > 0) {
        for (const audTab of audibleTabs) {
          if (!audTab.url) continue;
          try {
            const audHostname = new URL(audTab.url).hostname.toLowerCase();
            if (audHostname === targetDomain || audHostname.endsWith('.' + targetDomain)) {
              console.log(`[Fliqlo] Screensaver blocked: media is playing on ${audHostname}`);
              return true;
            }
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Fliqlo] Error checking excluded sites:', err);
  }

  return false;
}

// Initialize idle detection on install or startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
    const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
    updateIdleDetection(config);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
    const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
    updateIdleDetection(config);
  });
});

function updateIdleDetection(config) {
  if (!config.autoLaunchEnabled) return;
  const seconds = Math.max(15, (config.idleTimeoutMinutes || 5) * 60);
  chrome.idle.setDetectionInterval(seconds);
}

// Listen to Chromebook system idle state changes
chrome.idle.onStateChanged.addListener(async (newState) => {
  const data = await chrome.storage.sync.get([EXT_CONFIG_KEY]);
  const config = data[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;

  if (newState === 'idle' || newState === 'locked') {
    if (config.autoLaunchEnabled && screensaverWindowId === null) {
      const isBlocked = await shouldBlockScreensaver(config);
      if (isBlocked) {
        console.log('[Fliqlo] Screensaver blocked by excluded website rule');
        return;
      }
      launchScreensaver(config);
    }
  } else if (newState === 'active') {
    if (config.exitOnActivity && screensaverWindowId !== null) {
      closeScreensaver();
    }
  }
});

// Launch fullscreen screensaver
async function launchScreensaver(config) {
  try {
    const currentWin = await chrome.windows.getLastFocused();
    if (currentWin && currentWin.id !== screensaverWindowId) {
      previousFocusedWindowId = currentWin.id;
    }

    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('app/index.html?mode=screensaver'),
      type: 'popup',
      state: 'fullscreen',
      focused: true,
    });

    screensaverWindowId = win.id;

    // Enforce that the window is always in fullscreen mode
    setTimeout(async () => {
      try {
        if (screensaverWindowId) {
          await chrome.windows.update(screensaverWindowId, { state: 'fullscreen', focused: true });
        }
      } catch {
        // ignore
      }
    }, 150);

    if (config.keepAwake) {
      chrome.power.requestKeepAwake('display');
    }
  } catch (err) {
    console.warn('Failed to launch screensaver window:', err);
  }
}

// Close screensaver window
async function closeScreensaver() {
  if (screensaverWindowId === null) return;
  const winId = screensaverWindowId;
  screensaverWindowId = null;
  try {
    await chrome.windows.remove(winId);
  } catch {
    // window might already be closed by user
  } finally {
    chrome.power.releaseKeepAwake();
    if (previousFocusedWindowId !== null) {
      const prevId = previousFocusedWindowId;
      previousFocusedWindowId = null;
      chrome.windows.update(prevId, { focused: true }).catch(() => {});
    }
  }
}

// Handle window close events
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === screensaverWindowId) {
    screensaverWindowId = null;
    chrome.power.releaseKeepAwake();
  }
});

// Ensure screensaver window is ALWAYS fullscreen in the extension
chrome.windows.onBoundsChanged.addListener(async (win) => {
  if (win.id === screensaverWindowId && win.state !== 'fullscreen') {
    try {
      await chrome.windows.update(screensaverWindowId, { state: 'fullscreen', focused: true });
    } catch {
      // ignore
    }
  }
});

// Runtime messages from toolbar popup or screensaver window
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'launch_screensaver_now') {
    chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
      const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
      launchScreensaver(config);
      sendResponse({ status: 'ok' });
    });
    return true;
  } else if (message.action === 'close_screensaver') {
    closeScreensaver();
    sendResponse({ status: 'ok' });
    return true;
  } else if (message.action === 'update_idle_timeout') {
    chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
      const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
      updateIdleDetection(config);
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});
