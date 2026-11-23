// Fliqlo Chrome Extension - Background Service Worker (Manifest V3)
// Handles Chromebook idle detection, fullscreen screensaver launching, and power management

const STORAGE_KEY = 'fliqlo_clock_settings_v1';
const EXT_CONFIG_KEY = 'fliqlo_extension_config_v1';

let screensaverWindowId = null;
let previousFocusedWindowId = null;
let screensaverTimer = null;
let currentEndTime = null;
let countdownWindowId = null;
let countdownTabId = null;
let countdownEndTime = null;

const DEFAULT_EXT_CONFIG = {
  idleTimeoutMinutes: 5,
  autoLaunchEnabled: true,
  keepAwake: true,
  exitOnActivity: true,
  enableDurationLimit: true, // Enabled by default
  durationMode: 'duration', // 'duration' | 'until'
  durationMinutes: 120, // Default 2 hours (120 min)
  untilTime: '', // "HH:MM" e.g. "17:00"
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

// Update the extension badge on the browser toolbar with live countdown
async function updateExtensionBadge() {
  const data = await chrome.storage.local.get(['countdownEndTime', 'screensaverEndTime']);
  const targetEndTime = data.countdownEndTime || data.screensaverEndTime;
  if (!targetEndTime) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const remainingMs = targetEndTime - Date.now();
  if (remainingMs <= 0) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  let badgeStr = '';
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    badgeStr = m > 0 ? `${h}h${m}` : `${h}h`;
    if (badgeStr.length > 4) {
      badgeStr = `${h}h`;
    }
  } else {
    badgeStr = `${totalMinutes}m`;
  }
  chrome.action.setBadgeText({ text: badgeStr });
  chrome.action.setBadgeBackgroundColor({ color: data.countdownEndTime ? '#ff6b35' : '#2563eb' });
}
const updateCountdownBadge = updateExtensionBadge;

// Schedule screensaver auto-close based on duration setting
function scheduleAutoClose(config) {
  clearAutoCloseTimer();

  if (!config.enableDurationLimit) {
    return;
  }

  let ms = 0;
  if (config.durationMode === 'until' && config.untilTime) {
    const parts = config.untilTime.split(':');
    if (parts.length === 2) {
      const now = new Date();
      const target = new Date();
      target.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      ms = target.getTime() - now.getTime();
    }
  } else if (config.durationMinutes && config.durationMinutes > 0) {
    ms = config.durationMinutes * 60 * 1000;
  }

  if (ms > 0) {
    currentEndTime = Date.now() + ms;
    chrome.storage.local.set({ screensaverEndTime: currentEndTime });
    updateExtensionBadge();

    screensaverTimer = setTimeout(() => {
      console.log('[Fliqlo] Screensaver display duration reached. Auto-closing.');
      closeScreensaver();
    }, ms);

    chrome.alarms.create('screensaver_close_alarm', { when: currentEndTime });
    chrome.alarms.create('screensaver_badge_alarm', { periodInMinutes: 1 });
  }
}

async function clearAutoCloseTimer() {
  if (screensaverTimer) {
    clearTimeout(screensaverTimer);
    screensaverTimer = null;
  }
  currentEndTime = null;
  chrome.alarms.clear('screensaver_close_alarm');
  chrome.alarms.clear('screensaver_badge_alarm');
  await chrome.storage.local.remove(['screensaverEndTime', 'screensaverWindowId']);
  await updateExtensionBadge();
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'screensaver_close_alarm') {
    closeScreensaver();
  } else if (alarm.name === 'screensaver_badge_alarm' || alarm.name === 'countdown_badge_alarm') {
    await updateExtensionBadge();
  } else if (alarm.name === 'countdown_finish_alarm') {
    const data = await chrome.storage.local.get(['autoStartScreensaverOnCountdown', 'countdownWindowId', 'countdownTabId']);
    if (data.countdownWindowId) {
      chrome.windows.remove(data.countdownWindowId).catch(() => {});
    }
    if (data.countdownTabId) {
      chrome.tabs.remove(data.countdownTabId).catch(() => {});
    }
    countdownEndTime = null;
    countdownWindowId = null;
    countdownTabId = null;
    chrome.alarms.clear('countdown_finish_alarm');
    chrome.alarms.clear('countdown_badge_alarm');
    await chrome.storage.local.remove(['countdownEndTime', 'countdownDurationMinutes', 'countdownWindowId', 'countdownTabId']);
    await updateExtensionBadge();

    // When countdown completes, automatically launch screensaver
    if (data.autoStartScreensaverOnCountdown !== false) {
      chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
        const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
        launchScreensaver(config);
      });
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
    chrome.storage.local.set({ screensaverWindowId: win.id });

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

    // Schedule auto-close duration timer
    scheduleAutoClose(config);
  } catch (err) {
    console.warn('Failed to launch screensaver window:', err);
  }
}

// Close screensaver window
async function closeScreensaver() {
  clearAutoCloseTimer();
  let winId = screensaverWindowId;
  if (winId === null) {
    const data = await chrome.storage.local.get(['screensaverWindowId']);
    winId = data.screensaverWindowId || null;
  }
  screensaverWindowId = null;
  await chrome.storage.local.remove(['screensaverWindowId']);

  if (winId !== null) {
    try {
      await chrome.windows.remove(winId);
    } catch {
      // window might already be closed by user
    }
  }

  chrome.power.releaseKeepAwake();
  chrome.action.setBadgeText({ text: '' });

  if (previousFocusedWindowId !== null) {
    const prevId = previousFocusedWindowId;
    previousFocusedWindowId = null;
    chrome.windows.update(prevId, { focused: true }).catch(() => {});
  }
}

// Handle window close events
chrome.windows.onRemoved.addListener(async (windowId) => {
  const data = await chrome.storage.local.get(['screensaverWindowId', 'countdownWindowId']);
  if (windowId === screensaverWindowId || windowId === data.screensaverWindowId) {
    screensaverWindowId = null;
    clearAutoCloseTimer();
    chrome.power.releaseKeepAwake();
  }
  if (windowId === countdownWindowId || windowId === data.countdownWindowId) {
    countdownWindowId = null;
    await chrome.storage.local.remove(['countdownWindowId', 'countdownTabId']);
    await updateExtensionBadge();
  }
});

// Ensure screensaver and countdown windows are ALWAYS fullscreen in the extension
chrome.windows.onBoundsChanged.addListener(async (win) => {
  if (win.id === screensaverWindowId && win.state !== 'fullscreen') {
    try {
      await chrome.windows.update(screensaverWindowId, { state: 'fullscreen', focused: true });
    } catch {
      // ignore
    }
  }
  if (win.id === countdownWindowId && win.state !== 'fullscreen') {
    try {
      await chrome.windows.update(countdownWindowId, { state: 'fullscreen', focused: true });
    } catch {
      // ignore
    }
  }
});

// Handle tab close events (fallback)
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.local.get(['countdownTabId']);
  if (tabId === countdownTabId || tabId === data.countdownTabId) {
    countdownTabId = null;
    await chrome.storage.local.remove(['countdownTabId']);
    await updateExtensionBadge();
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
  } else if (message.action === 'extend_duration') {
    const addMinutes = message.additionalMinutes || 15;
    chrome.storage.local.get(['screensaverEndTime'], (data) => {
      let endTime = currentEndTime || data.screensaverEndTime;
      if (endTime && endTime > Date.now()) {
        endTime += addMinutes * 60 * 1000;
        currentEndTime = endTime;
        clearTimeout(screensaverTimer);
        const remainingMs = currentEndTime - Date.now();
        if (remainingMs > 0) {
          screensaverTimer = setTimeout(() => {
            closeScreensaver();
          }, remainingMs);
          chrome.alarms.create('screensaver_close_alarm', { when: currentEndTime });
          chrome.storage.local.set({ screensaverEndTime: currentEndTime });
          updateExtensionBadge();
        }
        sendResponse({ status: 'ok', currentEndTime: endTime });
      } else {
        sendResponse({ status: 'not_running' });
      }
    });
    return true;
  } else if (message.action === 'extend_countdown') {
    const addMinutes = message.additionalMinutes || 15;
    chrome.storage.local.get(['countdownEndTime', 'countdownDurationMinutes'], (data) => {
      let endTime = countdownEndTime || data.countdownEndTime;
      if (endTime && endTime > Date.now()) {
        endTime += addMinutes * 60 * 1000;
        countdownEndTime = endTime;
        const newMins = (data.countdownDurationMinutes || 30) + addMinutes;
        chrome.storage.local.set({ countdownEndTime: endTime, countdownDurationMinutes: newMins });
        chrome.alarms.create('countdown_finish_alarm', { when: countdownEndTime });
        updateExtensionBadge();
        sendResponse({ status: 'ok', currentEndTime: endTime });
      } else {
        sendResponse({ status: 'not_running' });
      }
    });
    return true;
  } else if (message.action === 'get_screensaver_status') {
    chrome.storage.local.get(['screensaverWindowId', 'screensaverEndTime'], (data) => {
      const activeWinId = screensaverWindowId || data.screensaverWindowId;
      const endTime = currentEndTime || data.screensaverEndTime;
      if (activeWinId) {
        chrome.windows.get(activeWinId, (win) => {
          if (chrome.runtime.lastError || !win) {
            screensaverWindowId = null;
            chrome.storage.local.remove(['screensaverWindowId', 'screensaverEndTime']);
            chrome.action.setBadgeText({ text: '' });
            sendResponse({ isOpen: false, endTime: null });
          } else {
            screensaverWindowId = win.id;
            sendResponse({ isOpen: true, endTime: endTime || null });
          }
        });
      } else {
        sendResponse({ isOpen: false, endTime: null });
      }
    });
    return true;
  } else if (message.action === 'launch_countdown') {
    const mins = message.durationMinutes || 30; // default 30 min
    const autoScreensaver = message.autoStartScreensaver !== false;
    const durationMs = mins * 60 * 1000;
    countdownEndTime = Date.now() + durationMs;

    chrome.storage.local.set({
      countdownEndTime,
      countdownDurationMinutes: mins,
      autoStartScreensaverOnCountdown: autoScreensaver,
    });

    updateExtensionBadge();
    chrome.alarms.create('countdown_finish_alarm', { when: countdownEndTime });
    chrome.alarms.create('countdown_badge_alarm', { periodInMinutes: 1 });

    chrome.windows.create({
      url: chrome.runtime.getURL(`app/index.html?mode=countdown&duration=${mins}&endTime=${countdownEndTime}`),
      type: 'popup',
      state: 'fullscreen',
      focused: true,
    }, (win) => {
      countdownWindowId = win.id;
      if (win.tabs && win.tabs.length > 0) {
        countdownTabId = win.tabs[0].id;
      }
      chrome.storage.local.set({
        countdownWindowId: win.id,
        countdownTabId: countdownTabId || null,
      });

      // Enforce fullscreen display
      setTimeout(() => {
        try {
          if (countdownWindowId) {
            chrome.windows.update(countdownWindowId, { state: 'fullscreen', focused: true });
          }
        } catch {}
      }, 150);
    });

    sendResponse({ status: 'ok', endTime: countdownEndTime });
    return true;
  } else if (message.action === 'close_countdown_tab') {
    chrome.storage.local.get(['countdownWindowId', 'countdownTabId'], (data) => {
      const winId = countdownWindowId || data.countdownWindowId;
      const tabId = (sender && sender.tab && sender.tab.id) || countdownTabId || data.countdownTabId;
      if (winId) {
        chrome.windows.remove(winId).catch(() => {});
      }
      if (tabId && (!winId || tabId !== winId)) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
      countdownWindowId = null;
      countdownTabId = null;
      chrome.storage.local.remove(['countdownWindowId', 'countdownTabId']);
      updateExtensionBadge();
      sendResponse({ status: 'ok' });
    });
    return true;
  } else if (message.action === 'reopen_countdown_tab') {
    chrome.storage.local.get(['countdownEndTime', 'countdownDurationMinutes'], (data) => {
      const endTime = data.countdownEndTime || countdownEndTime;
      const mins = data.countdownDurationMinutes || 30;
      if (endTime && endTime > Date.now()) {
        chrome.windows.create({
          url: chrome.runtime.getURL(`app/index.html?mode=countdown&duration=${mins}&endTime=${endTime}`),
          type: 'popup',
          state: 'fullscreen',
          focused: true,
        }, (win) => {
          countdownWindowId = win.id;
          if (win.tabs && win.tabs.length > 0) {
            countdownTabId = win.tabs[0].id;
          }
          chrome.storage.local.set({
            countdownWindowId: win.id,
            countdownTabId: countdownTabId || null,
          });

          setTimeout(() => {
            try {
              if (countdownWindowId) {
                chrome.windows.update(countdownWindowId, { state: 'fullscreen', focused: true });
              }
            } catch {}
          }, 150);
        });
        sendResponse({ status: 'ok' });
      } else {
        sendResponse({ status: 'not_running' });
      }
    });
    return true;
  } else if (message.action === 'stop_countdown') {
    chrome.storage.local.get(['countdownWindowId', 'countdownTabId'], (data) => {
      const winId = countdownWindowId || data.countdownWindowId;
      const tabId = data.countdownTabId || countdownTabId;
      if (winId) {
        chrome.windows.remove(winId).catch(() => {});
      }
      if (tabId && (!winId || tabId !== winId)) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
      countdownEndTime = null;
      countdownWindowId = null;
      countdownTabId = null;
      chrome.alarms.clear('countdown_finish_alarm');
      chrome.alarms.clear('countdown_badge_alarm');
      chrome.storage.local.remove(
        ['countdownEndTime', 'countdownDurationMinutes', 'countdownWindowId', 'countdownTabId', 'autoStartScreensaverOnCountdown'],
        () => {
          updateExtensionBadge();
          sendResponse({ status: 'ok' });
        }
      );
    });
    return true;
  } else if (message.action === 'get_countdown_status') {
    chrome.storage.local.get(['countdownEndTime', 'countdownDurationMinutes', 'countdownWindowId', 'countdownTabId'], (data) => {
      const endTime = data.countdownEndTime || countdownEndTime;
      const active = !!(endTime && endTime > Date.now());
      sendResponse({
        isActive: active,
        endTime: active ? endTime : null,
        durationMinutes: data.countdownDurationMinutes || 30,
        hasOpenTab: !!(data.countdownWindowId || countdownWindowId || data.countdownTabId || countdownTabId),
      });
    });
    return true;
  } else if (message.action === 'launch_countdown_tab') {
    chrome.tabs.create({ url: chrome.runtime.getURL('app/index.html?tab=countdown') });
    sendResponse({ status: 'ok' });
    return true;
  } else if (message.action === 'update_idle_timeout') {
    chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
      const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
      updateIdleDetection(config);
      sendResponse({ status: 'ok' });
    });
    return true;
  } else if (message.action === 'update_duration_config') {
    chrome.storage.sync.get([EXT_CONFIG_KEY], (res) => {
      const config = res[EXT_CONFIG_KEY] || DEFAULT_EXT_CONFIG;
      if (screensaverWindowId !== null) {
        scheduleAutoClose(config);
      }
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});
