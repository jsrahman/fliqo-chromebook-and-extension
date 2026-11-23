// Fliqlo Extension Toolbar Popup Script
// Syncs settings with chrome.storage.sync and communicates with background service worker

const CLOCK_STORAGE_KEY = 'fliqlo_clock_settings_v1';
const EXT_CONFIG_KEY = 'fliqlo_extension_config_v1';

const DEFAULT_CLOCK_SETTINGS = {
  format: '12h',
  fontFamily: 'fliqlo',
  showSeconds: false,
  showAmPm: true,
  showDate: false,
  scale: 1.0,
  scaleX: 1.0,
  scaleY: 1.0,
  fontScaleX: 1.0,
  fontScaleY: 1.0,
  soundEnabled: false,
  soundVolume: 0.5,
  backgroundTheme: 'classic',
  textColorTheme: 'white',
  autoHideControls: true,
};

const DEFAULT_EXT_CONFIG = {
  idleTimeoutMinutes: 5,
  autoLaunchEnabled: true,
  keepAwake: true,
  exitOnActivity: true,
  enableDurationLimit: true, // Selected by default
  durationMode: 'duration', // 'duration' | 'until'
  durationMinutes: 120, // Default 2 hours duration
  untilTime: '', // "HH:MM" e.g. "17:00"
  excludedSites: [
    { domain: 'youtube.com', mode: 'playing' },
    { domain: 'netflix.com', mode: 'playing' },
  ],
};

let currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS };
let currentExtConfig = { ...DEFAULT_EXT_CONFIG };
let screensaverStatus = { isOpen: false, endTime: null };
let countdownStatus = { isActive: false, endTime: null, durationMinutes: 30 };
let selectedCountdownMinutes = 30;
let statusPollTimer = null;

// DOM Elements: Navigation Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// DOM Elements: Header & Quick Actions
const btnLaunch = document.getElementById('btnLaunch');
const btnLaunchLarge = document.getElementById('btnLaunchLarge');
const btnLaunchCountdownLarge = document.getElementById('btnLaunchCountdownLarge');

// DOM Elements: Countdown in Tab (Tab 1)
const activeCountdownBanner = document.getElementById('activeCountdownBanner');
const txtCountdownBannerTitle = document.getElementById('txtCountdownBannerTitle');
const lblCountdownBannerTime = document.getElementById('lblCountdownBannerTime');
const btnReopenCountdownTab = document.getElementById('btnReopenCountdownTab');
const btnStopCountdown = document.getElementById('btnStopCountdown');
const btnQuickAddCountdown15 = document.getElementById('btnQuickAddCountdown15');
const btnQuickAddCountdown30 = document.getElementById('btnQuickAddCountdown30');
const btnQuickAddCountdown60 = document.getElementById('btnQuickAddCountdown60');
const countdownChips = document.querySelectorAll('.countdown-chip');
const chipCustomCountdown = document.getElementById('chipCustomCountdown');
const lblCountdownValue = document.getElementById('lblCountdownValue');
const chkAutoStartScreensaver = document.getElementById('chkAutoStartScreensaver');
const btnLaunchCountdownTab = document.getElementById('btnLaunchCountdownTab');

// DOM Elements: Duration & Keep Awake (Tab 2)
const chkDurationLimit = document.getElementById('chkDurationLimit');
const btnQuickAdd15 = document.getElementById('btnQuickAdd15');
const btnQuickAdd30 = document.getElementById('btnQuickAdd30');
const btnQuickAdd60 = document.getElementById('btnQuickAdd60');
const durChips = document.querySelectorAll('.dur-chip:not(.countdown-chip)');
const chipCustomDuration = document.getElementById('chipCustomDuration');
const lblDurationValue = document.getElementById('lblDurationValue');
const chipUntil = document.getElementById('chipUntil');
const untilTimeRow = document.getElementById('untilTimeRow');
const inpUntilTime = document.getElementById('inpUntilTime');
const btnApplyUntil = document.getElementById('btnApplyUntil');

const activeScreensaverBanner = document.getElementById('activeScreensaverBanner');
const bannerText = document.getElementById('bannerText');
const bannerCountdown = document.getElementById('bannerCountdown');
const btnBannerClose = document.getElementById('btnBannerClose');

const chkAutoLaunch = document.getElementById('chkAutoLaunch');
const selIdleTimeout = document.getElementById('selIdleTimeout');
const chkKeepAwake = document.getElementById('chkKeepAwake');

// DOM Elements: Excluded Websites (Tab 2)
const btnExcludeCurrentTab = document.getElementById('btnExcludeCurrentTab');
const txtNewDomain = document.getElementById('txtNewDomain');
const btnAddDomain = document.getElementById('btnAddDomain');
const excludedSitesList = document.getElementById('excludedSitesList');

// DOM Elements: Time & Display (Tab 3)
const btn12h = document.getElementById('btn12h');
const btn24h = document.getElementById('btn24h');
const rowAmPm = document.getElementById('rowAmPm');
const chkAmPm = document.getElementById('chkAmPm');
const chkSeconds = document.getElementById('chkSeconds');
const chkDate = document.getElementById('chkDate');

// DOM Elements: Scale & Typography (Tab 4)
const fontButtons = document.querySelectorAll('.font-btn');
const btnResetFontSize = document.getElementById('btnResetFontSize');
const rngFontScaleX = document.getElementById('rngFontScaleX');
const lblFontScaleX = document.getElementById('lblFontScaleX');
const rngFontScaleY = document.getElementById('rngFontScaleY');
const lblFontScaleY = document.getElementById('lblFontScaleY');

const btnResetScale = document.getElementById('btnResetScale');
const rngOverallScale = document.getElementById('rngOverallScale');
const lblOverallScale = document.getElementById('lblOverallScale');
const rngScaleX = document.getElementById('rngScaleX');
const lblScaleX = document.getElementById('lblScaleX');
const rngScaleY = document.getElementById('rngScaleY');
const lblScaleY = document.getElementById('lblScaleY');

// DOM Elements: Atmosphere & Audio (Tab 5)
const bgThemeButtons = document.querySelectorAll('#bgThemeOptions .color-chip');
const textColorButtons = document.querySelectorAll('#textColorOptions .color-chip');
const chkSound = document.getElementById('chkSound');
const rowVolume = document.getElementById('rowVolume');
const rngVolume = document.getElementById('rngVolume');
const lblVolume = document.getElementById('lblVolume');

// DOM Elements: Reset (Tab 6)
const btnResetAll = document.getElementById('btnResetAll');

// =============================================================================
// TAB SWITCHING
// =============================================================================
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    tabButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanes.forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const targetPane = document.getElementById(`tabContent-${tabName}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }
  });
});

// =============================================================================
// LOAD STORED PREFERENCES
// =============================================================================
chrome.storage.sync.get([CLOCK_STORAGE_KEY, EXT_CONFIG_KEY], (res) => {
  if (res[CLOCK_STORAGE_KEY]) {
    currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS, ...res[CLOCK_STORAGE_KEY] };
    if (
      currentClockSettings.fontFamily === 'flip-white' ||
      currentClockSettings.fontFamily === 'fliqlo-mac'
    ) {
      currentClockSettings.fontFamily = 'fliqlo';
    }
  }
  if (res[EXT_CONFIG_KEY]) {
    currentExtConfig = { ...DEFAULT_EXT_CONFIG, ...res[EXT_CONFIG_KEY] };
    // Migration: If user previously had 30m default with duration disabled, update to 2h default
    if (currentExtConfig.durationMinutes === 30 && !currentExtConfig.enableDurationLimit) {
      currentExtConfig.durationMinutes = 120;
      currentExtConfig.enableDurationLimit = true;
      chrome.storage.sync.set({ [EXT_CONFIG_KEY]: currentExtConfig });
    }
  } else {
    chrome.storage.sync.set({ [EXT_CONFIG_KEY]: DEFAULT_EXT_CONFIG });
  }
  renderUI();
  pollScreensaverStatus();
});

// Polling screensaver & countdown active status
function pollScreensaverStatus() {
  const checkStatus = () => {
    chrome.runtime.sendMessage({ action: 'get_screensaver_status' }, (res) => {
      if (!chrome.runtime.lastError && res) {
        screensaverStatus = res;
        updateBannerUI();
      }
    });

    chrome.runtime.sendMessage({ action: 'get_countdown_status' }, (res) => {
      if (!chrome.runtime.lastError && res) {
        countdownStatus = res;
        updateCountdownTabUI();
      }
    });
  };

  checkStatus();

  if (!statusPollTimer) {
    statusPollTimer = setInterval(checkStatus, 1000);
  }
}

function updateCountdownTabUI() {
  if (!activeCountdownBanner) return;

  // Update live countdown readout in duration box
  if (lblCountdownValue) {
    const mins = selectedCountdownMinutes || 30;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const readable = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    lblCountdownValue.textContent = `${hStr}:${mStr}:00 (${readable})`;
  }

  // Update chip states, dynamically highlighting custom duration if added via +15m/etc.
  let matchedCountdownPreset = false;
  countdownChips.forEach((chip) => {
    if (chip.id === 'chipCustomCountdown') return;
    const chipMin = parseInt(chip.dataset.min, 10);
    if (chipMin === selectedCountdownMinutes) {
      chip.classList.add('active');
      matchedCountdownPreset = true;
    } else {
      chip.classList.remove('active');
    }
  });

  if (chipCustomCountdown) {
    if (!matchedCountdownPreset && selectedCountdownMinutes > 0) {
      chipCustomCountdown.style.display = 'block';
      chipCustomCountdown.classList.add('active');
      chipCustomCountdown.dataset.min = String(selectedCountdownMinutes);
      const h = Math.floor(selectedCountdownMinutes / 60);
      const m = selectedCountdownMinutes % 60;
      chipCustomCountdown.textContent = h > 0 ? (m > 0 ? `${h}h${m}m` : `${h}h`) : `${m}m`;
    } else {
      chipCustomCountdown.style.display = 'none';
      chipCustomCountdown.classList.remove('active');
    }
  }

  if (countdownStatus.isActive && countdownStatus.endTime) {
    activeCountdownBanner.style.display = 'flex';
    const remainingMs = Math.max(0, countdownStatus.endTime - Date.now());
    if (remainingMs > 0) {
      const totalSec = Math.ceil(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const endDate = new Date(countdownStatus.endTime);
      const endStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (txtCountdownBannerTitle) {
        txtCountdownBannerTitle.textContent = `Countdown Active • Ends at ${endStr}`;
      }
      if (lblCountdownBannerTime) {
        lblCountdownBannerTime.textContent = timeStr;
      }
    } else {
      if (txtCountdownBannerTitle) txtCountdownBannerTitle.textContent = `Starting Screensaver...`;
      if (lblCountdownBannerTime) lblCountdownBannerTime.textContent = '00:00:00';
    }

    if (btnLaunchCountdownTab) {
      btnLaunchCountdownTab.textContent = '⏳ Reopen Fullscreen Countdown';
    }
  } else {
    activeCountdownBanner.style.display = 'none';
    if (btnLaunchCountdownTab) {
      const h = Math.floor(selectedCountdownMinutes / 60);
      const m = selectedCountdownMinutes % 60;
      const readable = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      btnLaunchCountdownTab.textContent = `⏳ Launch Fullscreen Countdown (${readable})`;
    }
  }
}

function updateBannerUI() {
  if (screensaverStatus.isOpen) {
    activeScreensaverBanner.style.display = 'flex';
    if (screensaverStatus.endTime) {
      const remainingMs = Math.max(0, screensaverStatus.endTime - Date.now());
      if (remainingMs > 0) {
        const totalSec = Math.ceil(remainingMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const endDate = new Date(screensaverStatus.endTime);
        const endStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bannerText.textContent = `Screensaver Active • Ends at ${endStr}`;
        if (bannerCountdown) {
          bannerCountdown.textContent = timeStr;
          bannerCountdown.style.display = 'block';
        }
      } else {
        bannerText.textContent = `Screensaver closing...`;
        if (bannerCountdown) bannerCountdown.textContent = '00:00:00';
      }
    } else {
      bannerText.textContent = `Screensaver active (Unlimited)`;
      if (bannerCountdown) bannerCountdown.style.display = 'none';
    }
  } else {
    activeScreensaverBanner.style.display = 'none';
  }
}

// =============================================================================
// RENDER UI STATE
// =============================================================================
function renderUI() {
  // 1. Duration & Auto-Run (Tab 1)
  chkDurationLimit.checked = !!currentExtConfig.enableDurationLimit;
  renderDurationChips();

  chkAutoLaunch.checked = !!currentExtConfig.autoLaunchEnabled;
  selIdleTimeout.value = String(currentExtConfig.idleTimeoutMinutes || 5);
  chkKeepAwake.checked = !!currentExtConfig.keepAwake;

  // 2. Excluded Sites List (Tab 2)
  renderExcludedSites();

  // 3. Time & Display (Tab 3)
  if (currentClockSettings.format === '24h') {
    btn24h.classList.add('active');
    btn12h.classList.remove('active');
    rowAmPm.style.display = 'none';
  } else {
    btn12h.classList.add('active');
    btn24h.classList.remove('active');
    rowAmPm.style.display = 'flex';
  }
  chkAmPm.checked = !!currentClockSettings.showAmPm;
  chkSeconds.checked = !!currentClockSettings.showSeconds;
  chkDate.checked = !!currentClockSettings.showDate;

  // 4. Scaling & Typography (Tab 4)
  fontButtons.forEach((btn) => {
    if (btn.dataset.font === currentClockSettings.fontFamily) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const fScaleX = currentClockSettings.fontScaleX ?? 1.0;
  rngFontScaleX.value = fScaleX;
  lblFontScaleX.textContent = Math.round(fScaleX * 100) + '%';

  const fScaleY = currentClockSettings.fontScaleY ?? 1.0;
  rngFontScaleY.value = fScaleY;
  lblFontScaleY.textContent = Math.round(fScaleY * 100) + '%';

  const scale = currentClockSettings.scale ?? 1.0;
  rngOverallScale.value = scale;
  lblOverallScale.textContent = Math.round(scale * 100) + '%';

  const scaleX = currentClockSettings.scaleX ?? 1.0;
  rngScaleX.value = scaleX;
  lblScaleX.textContent = Math.round(scaleX * 100) + '%';

  const scaleY = currentClockSettings.scaleY ?? 1.0;
  rngScaleY.value = scaleY;
  lblScaleY.textContent = Math.round(scaleY * 100) + '%';

  // 5. Atmosphere & Audio (Tab 5)
  bgThemeButtons.forEach((btn) => {
    if (btn.dataset.bg === currentClockSettings.backgroundTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  textColorButtons.forEach((btn) => {
    if (btn.dataset.color === currentClockSettings.textColorTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  chkSound.checked = !!currentClockSettings.soundEnabled;
  rowVolume.style.display = currentClockSettings.soundEnabled ? 'flex' : 'none';
  const vol = currentClockSettings.soundVolume ?? 0.5;
  rngVolume.value = vol;
  lblVolume.textContent = Math.round(vol * 100) + '%';
}

// Render Duration Chips
function renderDurationChips() {
  const isLimitEnabled = !!currentExtConfig.enableDurationLimit;
  const mode = currentExtConfig.durationMode || 'duration';
  const mins = currentExtConfig.durationMinutes || 0;
  const until = currentExtConfig.untilTime || '';

  let matchedPreset = false;
  durChips.forEach((chip) => {
    if (chip.id === 'chipCustomDuration') return;
    chip.classList.remove('active');

    if (!isLimitEnabled) {
      if (chip.id === 'chipInfinite') chip.classList.add('active');
      return;
    }

    if (mode === 'until') {
      if (chip.id === 'chipUntil') {
        chip.classList.add('active');
        chip.textContent = until ? until : 'Until...';
      }
    } else {
      const chipMin = parseInt(chip.dataset.min, 10);
      if (chipMin === mins) {
        chip.classList.add('active');
        matchedPreset = true;
      }
    }
  });

  // Dynamically display custom chip if duration was adjusted with +15m/+30m/+1h
  if (chipCustomDuration) {
    if (isLimitEnabled && mode === 'duration' && !matchedPreset && mins > 0) {
      chipCustomDuration.style.display = 'block';
      chipCustomDuration.classList.add('active');
      chipCustomDuration.dataset.min = String(mins);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      chipCustomDuration.textContent = h > 0 ? (m > 0 ? `${h}h${m}m` : `${h}h`) : `${m}m`;
    } else {
      chipCustomDuration.style.display = 'none';
      chipCustomDuration.classList.remove('active');
    }
  }

  // Live timer readout in duration box
  if (lblDurationValue) {
    if (!isLimitEnabled) {
      lblDurationValue.textContent = '∞ (Until activity)';
    } else if (mode === 'until') {
      lblDurationValue.textContent = until ? `Until ${until}` : 'Until...';
    } else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const hStr = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const readable = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      lblDurationValue.textContent = `${hStr}:${mStr}:00 (${readable})`;
    }
  }

  if (isLimitEnabled && mode === 'until') {
    untilTimeRow.style.display = 'flex';
    if (until) inpUntilTime.value = until;
  } else {
    untilTimeRow.style.display = 'none';
  }
}

// Render Excluded Sites List
function renderExcludedSites() {
  excludedSitesList.innerHTML = '';
  const sites = currentExtConfig.excludedSites || [];

  if (sites.length === 0) {
    const emptyHint = document.createElement('div');
    emptyHint.className = 'empty-sites-hint';
    emptyHint.textContent = 'No excluded websites yet. Add one above.';
    excludedSitesList.appendChild(emptyHint);
    return;
  }

  sites.forEach((site, index) => {
    const item = document.createElement('div');
    item.className = 'excluded-site-item';

    const domainSpan = document.createElement('span');
    domainSpan.className = 'site-domain-text';
    domainSpan.textContent = site.domain;
    domainSpan.title = site.domain;

    const controls = document.createElement('div');
    controls.className = 'site-controls';

    const select = document.createElement('select');
    select.className = 'site-rule-select';
    select.innerHTML = `
      <option value="always" ${site.mode === 'always' ? 'selected' : ''}>All Time</option>
      <option value="playing" ${site.mode === 'playing' ? 'selected' : ''}>While Playing</option>
    `;
    select.addEventListener('change', (e) => {
      sites[index].mode = e.target.value;
      saveExtConfig({ excludedSites: sites });
    });

    const btnRemove = document.createElement('button');
    btnRemove.className = 'btn-remove-site';
    btnRemove.innerHTML = '✕';
    btnRemove.title = 'Remove site';
    btnRemove.addEventListener('click', () => {
      sites.splice(index, 1);
      saveExtConfig({ excludedSites: sites });
      renderExcludedSites();
    });

    controls.appendChild(select);
    controls.appendChild(btnRemove);

    item.appendChild(domainSpan);
    item.appendChild(controls);
    excludedSitesList.appendChild(item);
  });
}

// =============================================================================
// STORAGE SYNC HELPERS
// =============================================================================
function saveClockSettings(delta) {
  currentClockSettings = { ...currentClockSettings, ...delta };
  chrome.storage.sync.set({ [CLOCK_STORAGE_KEY]: currentClockSettings });
}

function saveExtConfig(delta) {
  currentExtConfig = { ...currentExtConfig, ...delta };
  chrome.storage.sync.set({ [EXT_CONFIG_KEY]: currentExtConfig });
  chrome.runtime.sendMessage({ action: 'update_duration_config' });
}

// =============================================================================
// EVENT LISTENERS: DURATION & AUTO-RUN (TAB 1)
// =============================================================================
chkDurationLimit.addEventListener('change', (e) => {
  const enabled = e.target.checked;
  saveExtConfig({
    enableDurationLimit: enabled,
    durationMinutes: enabled ? (currentExtConfig.durationMinutes || 30) : 0,
  });
  renderDurationChips();
});

// Quick add buttons: +15m, +30m, +1h
function handleQuickAdd(mins) {
  const currentMins = currentExtConfig.enableDurationLimit
    ? (currentExtConfig.durationMinutes || 0)
    : 0;
  const newMins = currentMins + mins;

  saveExtConfig({
    enableDurationLimit: true,
    durationMode: 'duration',
    durationMinutes: newMins,
  });

  // If screensaver is running, notify background to extend runtime directly
  if (screensaverStatus.isOpen) {
    chrome.runtime.sendMessage({ action: 'extend_duration', additionalMinutes: mins }, (res) => {
      if (res && res.currentEndTime) {
        screensaverStatus.endTime = res.currentEndTime;
        updateBannerUI();
      }
    });
  }

  renderDurationChips();
}

btnQuickAdd15.addEventListener('click', () => handleQuickAdd(15));
btnQuickAdd30.addEventListener('click', () => handleQuickAdd(30));
btnQuickAdd60.addEventListener('click', () => handleQuickAdd(60));

// Duration Chips click handler
durChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    if (chip.id === 'chipInfinite') {
      saveExtConfig({
        enableDurationLimit: false,
        durationMode: 'duration',
        durationMinutes: 0,
      });
      renderDurationChips();
      return;
    }

    if (chip.id === 'chipUntil') {
      const isAlreadyActive = chip.classList.contains('active');
      if (isAlreadyActive && untilTimeRow.style.display !== 'none') {
        untilTimeRow.style.display = 'none';
      } else {
        untilTimeRow.style.display = 'flex';
        inpUntilTime.focus();
      }
      return;
    }

    const mins = parseInt(chip.dataset.min, 10);
    // If clicking the currently active chip, toggle back to infinite
    if (chip.classList.contains('active') && currentExtConfig.enableDurationLimit) {
      saveExtConfig({
        enableDurationLimit: false,
        durationMinutes: 0,
      });
    } else {
      saveExtConfig({
        enableDurationLimit: true,
        durationMode: 'duration',
        durationMinutes: mins,
      });
    }
    renderDurationChips();
  });
});

// Apply "Until..." time
btnApplyUntil.addEventListener('click', () => {
  const val = inpUntilTime.value;
  if (!val) return;
  saveExtConfig({
    enableDurationLimit: true,
    durationMode: 'until',
    untilTime: val,
  });
  renderDurationChips();
});

inpUntilTime.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnApplyUntil.click();
  }
});

// Close active screensaver from banner
btnBannerClose.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'close_screensaver' }, () => {
    screensaverStatus.isOpen = false;
    updateBannerUI();
  });
});

// Auto-Launch & Idle Timeout
chkAutoLaunch.addEventListener('change', (e) => {
  saveExtConfig({ autoLaunchEnabled: e.target.checked });
  chrome.runtime.sendMessage({ action: 'update_idle_timeout' });
});

selIdleTimeout.addEventListener('change', (e) => {
  saveExtConfig({ idleTimeoutMinutes: parseInt(e.target.value, 10) });
  chrome.runtime.sendMessage({ action: 'update_idle_timeout' });
});

chkKeepAwake.addEventListener('change', (e) => {
  saveExtConfig({ keepAwake: e.target.checked });
});

// Launch Screensaver Now
const triggerLaunch = () => {
  chrome.runtime.sendMessage({ action: 'launch_screensaver_now' }, () => {
    screensaverStatus.isOpen = true;
    updateBannerUI();
  });
};
btnLaunch.addEventListener('click', triggerLaunch);
btnLaunchLarge.addEventListener('click', triggerLaunch);

// Countdown Tab Duration Chips
countdownChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    countdownChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    selectedCountdownMinutes = parseInt(chip.dataset.min, 10) || 30;
    updateCountdownTabUI();
  });
});

// Quick add in Countdown Tab
function handleQuickAddCountdown(mins) {
  selectedCountdownMinutes = (selectedCountdownMinutes || 30) + mins;
  if (countdownStatus.isActive) {
    chrome.runtime.sendMessage({ action: 'extend_countdown', additionalMinutes: mins }, (res) => {
      if (res && res.currentEndTime) {
        countdownStatus.endTime = res.currentEndTime;
        updateCountdownTabUI();
      }
    });
  }
  updateCountdownTabUI();
}

if (btnQuickAddCountdown15) btnQuickAddCountdown15.addEventListener('click', () => handleQuickAddCountdown(15));
if (btnQuickAddCountdown30) btnQuickAddCountdown30.addEventListener('click', () => handleQuickAddCountdown(30));
if (btnQuickAddCountdown60) btnQuickAddCountdown60.addEventListener('click', () => handleQuickAddCountdown(60));

// Launch Countdown in Tab
const triggerLaunchCountdownInTab = () => {
  if (countdownStatus.isActive) {
    chrome.runtime.sendMessage({ action: 'reopen_countdown_tab' }, () => {
      window.close();
    });
  } else {
    const autoStart = chkAutoStartScreensaver ? chkAutoStartScreensaver.checked : true;
    chrome.runtime.sendMessage({
      action: 'launch_countdown',
      durationMinutes: selectedCountdownMinutes,
      autoStartScreensaver: autoStart,
    }, (res) => {
      if (res && res.endTime) {
        countdownStatus = { isActive: true, endTime: res.endTime, durationMinutes: selectedCountdownMinutes };
      }
      window.close();
    });
  }
};

if (btnLaunchCountdownTab) btnLaunchCountdownTab.addEventListener('click', triggerLaunchCountdownInTab);
if (btnLaunchCountdownLarge) btnLaunchCountdownLarge.addEventListener('click', triggerLaunchCountdownInTab);

if (btnReopenCountdownTab) {
  btnReopenCountdownTab.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'reopen_countdown_tab' }, () => {
      window.close();
    });
  });
}

if (btnStopCountdown) {
  btnStopCountdown.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop_countdown' }, () => {
      countdownStatus = { isActive: false, endTime: null, durationMinutes: selectedCountdownMinutes };
      updateCountdownTabUI();
    });
  });
}

// =============================================================================
// EVENT LISTENERS: EXCLUDED WEBSITES (TAB 2)
// =============================================================================
function addExcludedSite(domain, mode = 'always') {
  if (!domain) return;
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!cleanDomain) return;

  const sites = currentExtConfig.excludedSites || [];
  if (!sites.some((s) => s.domain === cleanDomain)) {
    sites.push({ domain: cleanDomain, mode });
    saveExtConfig({ excludedSites: sites });
    renderExcludedSites();
  }
}

btnAddDomain.addEventListener('click', () => {
  const val = txtNewDomain.value.trim();
  if (val) {
    addExcludedSite(val, 'always');
    txtNewDomain.value = '';
  }
});

txtNewDomain.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnAddDomain.click();
  }
});

btnExcludeCurrentTab.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      if (url.hostname && !url.hostname.startsWith('chrome')) {
        addExcludedSite(url.hostname, 'playing');
      }
    }
  } catch (err) {
    console.warn('Could not read current tab URL:', err);
  }
});

// =============================================================================
// EVENT LISTENERS: TIME & DISPLAY (TAB 3)
// =============================================================================
btn12h.addEventListener('click', () => {
  btn12h.classList.add('active');
  btn24h.classList.remove('active');
  rowAmPm.style.display = 'flex';
  saveClockSettings({ format: '12h' });
});

btn24h.addEventListener('click', () => {
  btn24h.classList.add('active');
  btn12h.classList.remove('active');
  rowAmPm.style.display = 'none';
  saveClockSettings({ format: '24h' });
});

chkAmPm.addEventListener('change', (e) => saveClockSettings({ showAmPm: e.target.checked }));
chkSeconds.addEventListener('change', (e) => saveClockSettings({ showSeconds: e.target.checked }));
chkDate.addEventListener('change', (e) => saveClockSettings({ showDate: e.target.checked }));

// =============================================================================
// EVENT LISTENERS: SCALING & TYPOGRAPHY (TAB 4)
// =============================================================================
fontButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    fontButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    saveClockSettings({ fontFamily: btn.dataset.font });
  });
});

rngFontScaleX.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblFontScaleX.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ fontScaleX: val });
});

rngFontScaleY.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblFontScaleY.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ fontScaleY: val });
});

btnResetFontSize.addEventListener('click', () => {
  rngFontScaleX.value = 1.0;
  rngFontScaleY.value = 1.0;
  lblFontScaleX.textContent = '100%';
  lblFontScaleY.textContent = '100%';
  saveClockSettings({ fontScaleX: 1.0, fontScaleY: 1.0 });
});

rngOverallScale.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblOverallScale.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ scale: val });
});

rngScaleX.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblScaleX.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ scaleX: val });
});

rngScaleY.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblScaleY.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ scaleY: val });
});

btnResetScale.addEventListener('click', () => {
  rngOverallScale.value = 1.0;
  rngScaleX.value = 1.0;
  rngScaleY.value = 1.0;
  lblOverallScale.textContent = '100%';
  lblScaleX.textContent = '100%';
  lblScaleY.textContent = '100%';
  saveClockSettings({ scale: 1.0, scaleX: 1.0, scaleY: 1.0 });
});

// =============================================================================
// EVENT LISTENERS: ATMOSPHERE & AUDIO (TAB 5)
// =============================================================================
bgThemeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    bgThemeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    saveClockSettings({ backgroundTheme: btn.dataset.bg });
  });
});

textColorButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    textColorButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    saveClockSettings({ textColorTheme: btn.dataset.color });
  });
});

chkSound.addEventListener('change', (e) => {
  rowVolume.style.display = e.target.checked ? 'flex' : 'none';
  saveClockSettings({ soundEnabled: e.target.checked });
});

rngVolume.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblVolume.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ soundVolume: val });
});

// =============================================================================
// EVENT LISTENERS: RESET (TAB 6)
// =============================================================================
btnResetAll.addEventListener('click', () => {
  currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS };
  currentExtConfig = { ...DEFAULT_EXT_CONFIG };
  chrome.storage.sync.set({
    [CLOCK_STORAGE_KEY]: currentClockSettings,
    [EXT_CONFIG_KEY]: currentExtConfig,
  });
  chrome.runtime.sendMessage({ action: 'update_idle_timeout' });
  chrome.runtime.sendMessage({ action: 'update_duration_config' });
  renderUI();
});

// =============================================================================
// GITHUB STARS LOADER
// =============================================================================
const txtHeaderStars = document.getElementById('txtHeaderStars');
const txtTabStars = document.getElementById('txtTabStars');

function loadGitHubStars() {
  const GITHUB_REPO = 'jsrahman/fliqo-chromebook-and-extension';
  const CACHE_KEY = 'fliqlo_github_stars_cache';

  const updateDisplay = (stars) => {
    if (txtHeaderStars) txtHeaderStars.textContent = String(stars);
    if (txtTabStars) txtTabStars.textContent = String(stars);
  };

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { count, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 10 * 60 * 1000 && typeof count === 'number') {
        updateDisplay(count);
        return;
      }
    }
  } catch {
    // ignore
  }

  fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data.stargazers_count === 'number') {
        updateDisplay(data.stargazers_count);
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
}

loadGitHubStars();

