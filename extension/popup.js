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
};

let currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS };
let currentExtConfig = { ...DEFAULT_EXT_CONFIG };

// DOM Elements
const btnLaunch = document.getElementById('btnLaunch');
const chkAutoLaunch = document.getElementById('chkAutoLaunch');
const selIdleTimeout = document.getElementById('selIdleTimeout');
const chkKeepAwake = document.getElementById('chkKeepAwake');

const btn12h = document.getElementById('btn12h');
const btn24h = document.getElementById('btn24h');
const rowAmPm = document.getElementById('rowAmPm');
const chkAmPm = document.getElementById('chkAmPm');
const chkSeconds = document.getElementById('chkSeconds');
const chkDate = document.getElementById('chkDate');

const btnResetScale = document.getElementById('btnResetScale');
const rngOverallScale = document.getElementById('rngOverallScale');
const lblOverallScale = document.getElementById('lblOverallScale');
const rngScaleX = document.getElementById('rngScaleX');
const lblScaleX = document.getElementById('lblScaleX');
const rngScaleY = document.getElementById('rngScaleY');
const lblScaleY = document.getElementById('lblScaleY');

const fontButtons = document.querySelectorAll('.font-btn');
const chkSound = document.getElementById('chkSound');
const rowVolume = document.getElementById('rowVolume');
const rngVolume = document.getElementById('rngVolume');
const lblVolume = document.getElementById('lblVolume');

const bgThemeButtons = document.querySelectorAll('#bgThemeOptions .color-chip');
const textColorButtons = document.querySelectorAll('#textColorOptions .color-chip');
const btnResetAll = document.getElementById('btnResetAll');

// Load stored values from chrome.storage.sync
chrome.storage.sync.get([CLOCK_STORAGE_KEY, EXT_CONFIG_KEY], (res) => {
  if (res[CLOCK_STORAGE_KEY]) {
    currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS, ...res[CLOCK_STORAGE_KEY] };
  }
  if (res[EXT_CONFIG_KEY]) {
    currentExtConfig = { ...DEFAULT_EXT_CONFIG, ...res[EXT_CONFIG_KEY] };
  }
  renderUI();
});

function renderUI() {
  // Extension config
  chkAutoLaunch.checked = !!currentExtConfig.autoLaunchEnabled;
  selIdleTimeout.value = String(currentExtConfig.idleTimeoutMinutes || 5);
  chkKeepAwake.checked = !!currentExtConfig.keepAwake;

  // Clock format
  if (currentClockSettings.format === '24h') {
    btn24h.classList.add('active');
    btn12h.classList.remove('active');
    rowAmPm.style.display = 'none';
  } else {
    btn12h.classList.add('active');
    btn24h.classList.remove('active');
    rowAmPm.style.display = 'flex';
  }

  // Toggles
  chkAmPm.checked = !!currentClockSettings.showAmPm;
  chkSeconds.checked = !!currentClockSettings.showSeconds;
  chkDate.checked = !!currentClockSettings.showDate;

  // Sliders
  const scale = currentClockSettings.scale ?? 1.0;
  rngOverallScale.value = scale;
  lblOverallScale.textContent = Math.round(scale * 100) + '%';

  const scaleX = currentClockSettings.scaleX ?? 1.0;
  rngScaleX.value = scaleX;
  lblScaleX.textContent = Math.round(scaleX * 100) + '%';

  const scaleY = currentClockSettings.scaleY ?? 1.0;
  rngScaleY.value = scaleY;
  lblScaleY.textContent = Math.round(scaleY * 100) + '%';

  // Fonts
  fontButtons.forEach((btn) => {
    if (btn.dataset.font === currentClockSettings.fontFamily) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sound
  chkSound.checked = !!currentClockSettings.soundEnabled;
  rowVolume.style.display = currentClockSettings.soundEnabled ? 'flex' : 'none';
  const vol = currentClockSettings.soundVolume ?? 0.5;
  rngVolume.value = vol;
  lblVolume.textContent = Math.round(vol * 100) + '%';

  // Atmosphere: Background Themes
  bgThemeButtons.forEach((btn) => {
    if (btn.dataset.bg === currentClockSettings.backgroundTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Atmosphere: Text Colors
  textColorButtons.forEach((btn) => {
    if (btn.dataset.color === currentClockSettings.textColorTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function saveClockSettings(partial) {
  currentClockSettings = { ...currentClockSettings, ...partial };
  chrome.storage.sync.set({ [CLOCK_STORAGE_KEY]: currentClockSettings });
  renderUI();
}

function saveExtConfig(partial) {
  currentExtConfig = { ...currentExtConfig, ...partial };
  chrome.storage.sync.set({ [EXT_CONFIG_KEY]: currentExtConfig });
  chrome.runtime.sendMessage({ action: 'update_idle_timeout' });
  renderUI();
}

// Event Listeners
btnLaunch.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'launch_screensaver_now' });
  window.close();
});

chkAutoLaunch.addEventListener('change', (e) => {
  saveExtConfig({ autoLaunchEnabled: e.target.checked });
});

selIdleTimeout.addEventListener('change', (e) => {
  saveExtConfig({ idleTimeoutMinutes: parseInt(e.target.value, 10) });
});

chkKeepAwake.addEventListener('change', (e) => {
  saveExtConfig({ keepAwake: e.target.checked });
});

btn12h.addEventListener('click', () => saveClockSettings({ format: '12h' }));
btn24h.addEventListener('click', () => saveClockSettings({ format: '24h' }));
chkAmPm.addEventListener('change', (e) => saveClockSettings({ showAmPm: e.target.checked }));
chkSeconds.addEventListener('change', (e) => saveClockSettings({ showSeconds: e.target.checked }));
chkDate.addEventListener('change', (e) => saveClockSettings({ showDate: e.target.checked }));

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
  saveClockSettings({ scale: 1.0, scaleX: 1.0, scaleY: 1.0 });
});

fontButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    saveClockSettings({ fontFamily: btn.dataset.font });
  });
});

chkSound.addEventListener('change', (e) => {
  saveClockSettings({ soundEnabled: e.target.checked });
});

rngVolume.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  lblVolume.textContent = Math.round(val * 100) + '%';
  saveClockSettings({ soundVolume: val });
});

bgThemeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    saveClockSettings({ backgroundTheme: btn.dataset.bg });
  });
});

textColorButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    saveClockSettings({ textColorTheme: btn.dataset.color });
  });
});

btnResetAll.addEventListener('click', () => {
  currentClockSettings = { ...DEFAULT_CLOCK_SETTINGS };
  currentExtConfig = { ...DEFAULT_EXT_CONFIG };
  chrome.storage.sync.set({
    [CLOCK_STORAGE_KEY]: currentClockSettings,
    [EXT_CONFIG_KEY]: currentExtConfig,
  });
  chrome.runtime.sendMessage({ action: 'update_idle_timeout' });
  renderUI();
});
