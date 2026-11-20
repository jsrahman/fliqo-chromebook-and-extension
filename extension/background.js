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
};

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
  try {
    await chrome.windows.remove(screensaverWindowId);
  } catch {
    // window might already be closed by user
  } finally {
    screensaverWindowId = null;
    chrome.power.releaseKeepAwake();
    if (previousFocusedWindowId !== null) {
      chrome.windows.update(previousFocusedWindowId, { focused: true }).catch(() => {});
      previousFocusedWindowId = null;
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
