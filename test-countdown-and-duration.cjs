const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Countdown & Extension Duration Verification Suite');
console.log('===============================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

const rootDir = __dirname;
const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
const flipCountdownTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'FlipCountdown.tsx'), 'utf-8');
const typesTs = fs.readFileSync(path.join(rootDir, 'src', 'types.ts'), 'utf-8');
const flipclockCss = fs.readFileSync(path.join(rootDir, 'src', 'styles', 'flipclock.css'), 'utf-8');
const bgJs = fs.readFileSync(path.join(rootDir, 'extension', 'background.js'), 'utf-8');
const popupHtml = fs.readFileSync(path.join(rootDir, 'extension', 'popup.html'), 'utf-8');
const popupJs = fs.readFileSync(path.join(rootDir, 'extension', 'popup.js'), 'utf-8');
const popupCss = fs.readFileSync(path.join(rootDir, 'extension', 'popup.css'), 'utf-8');

// 1. Web App: Countdown in a tab
console.log('1. Web App: Tabbed Countdown & Screensaver UI');

test('App.tsx defines AppMode with screensaver and countdown tabs', () => {
  assert(typesTs.includes("'screensaver' | 'countdown'"), 'types.ts must define AppMode');
  assert(appTsx.includes('activeMode'), 'App.tsx must track activeMode');
  assert(appTsx.includes('mode-tabs-bar'), 'App.tsx must render mode-tabs-bar');
  assert(appTsx.includes('Screensaver'), 'App.tsx tab bar must have Screensaver tab');
  assert(appTsx.includes('Countdown'), 'App.tsx tab bar must have Countdown tab');
});

test('App.tsx parses tab and mode query parameter from URL', () => {
  assert(appTsx.includes("p.get('tab')") || appTsx.includes("p.get('mode')"), 'Must parse tab or mode param');
  assert(appTsx.includes("'countdown'"), 'Must support countdown mode initialization');
});

test('App.tsx provides keyboard toggle shortcut C', () => {
  assert(appTsx.includes("e.key === 'c'") || appTsx.includes("e.key === 'C'"), 'Must support C key shortcut');
});

test('FlipCountdown renders matching split-flap UI (hours, minutes, seconds)', () => {
  assert(flipCountdownTsx.includes('flip-clock flip-countdown'), 'Must use flip-clock container');
  assert(flipCountdownTsx.includes('FlipUnit'), 'Must use FlipUnit split-flap cards');
  assert(flipCountdownTsx.includes('hourDisplay'), 'Must display hours');
  assert(flipCountdownTsx.includes('minuteDisplay'), 'Must display minutes');
  assert(flipCountdownTsx.includes('secondDisplay'), 'Must display seconds');
});

test('FlipCountdown defaults to 2 hours (120 minutes = 7200 seconds)', () => {
  assert(flipCountdownTsx.includes('120 * 60'), 'Default countdown duration must be 2 hours (120 * 60 = 7200s)');
});

test('FlipCountdown triggers onComplete to start screensaver when countdown reaches zero', () => {
  assert(flipCountdownTsx.includes('onComplete()'), 'Must call onComplete callback');
  assert(appTsx.includes('handleCountdownComplete'), 'App.tsx must handle countdown completion');
  assert(appTsx.includes("setActiveMode('screensaver')"), 'Must switch to screensaver when countdown completes');
});

test('flipclock.css contains styles for mode tabs and countdown controls', () => {
  assert(flipclockCss.includes('.mode-tabs-bar'), 'Must style .mode-tabs-bar');
  assert(flipclockCss.includes('.mode-tab-btn'), 'Must style .mode-tab-btn');
  assert(flipclockCss.includes('.countdown-container'), 'Must style .countdown-container');
  assert(flipclockCss.includes('.countdown-presets-row'), 'Must style .countdown-presets-row');
  assert(flipclockCss.includes('.countdown-controls-panel'), 'Must style .countdown-controls-panel');
});

// 2. Extension: Default 2 hours & Countdown display & Auto-close
console.log('\n2. Extension: 2 Hours Default, Auto-close, and Countdown Display');

test('extension JS files background.js and popup.js have zero syntax errors', () => {
  const { execSync } = require('child_process');
  execSync('node -c extension/background.js', { stdio: 'pipe' });
  execSync('node -c extension/popup.js', { stdio: 'pipe' });
});

test('extension/popup.html has dedicated Countdown tab', () => {
  assert(popupHtml.includes('data-tab="countdown"'), 'popup.html must have data-tab="countdown"');
  assert(popupHtml.includes('id="tabContent-countdown"'), 'popup.html must have id="tabContent-countdown"');
  assert(popupHtml.includes('btnLaunchCountdownTab'), 'popup.html must have btnLaunchCountdownTab');
});

test('extension/background.js defaults duration limit to enabled and 120 minutes (2h)', () => {
  assert(bgJs.includes('enableDurationLimit: true'), 'Background config must enable duration limit by default');
  assert(bgJs.includes('durationMinutes: 120'), 'Background config must default to 120 minutes (2h)');
});

test('extension/popup.js defaults duration limit to enabled and 120 minutes (2h)', () => {
  assert(popupJs.includes('enableDurationLimit: true'), 'Popup config must enable duration limit by default');
  assert(popupJs.includes('durationMinutes: 120'), 'Popup config must default to 120 minutes (2h)');
});

test('extension/popup.html has 2h duration chip active and duration limit switch checked by default', () => {
  assert(popupHtml.includes('id="chkDurationLimit" checked'), 'chkDurationLimit must be checked by default');
  assert(popupHtml.includes('data-min="120"'), '2h chip must exist');
  assert(popupHtml.includes('class="dur-chip active" data-min="120"'), '2h chip must have active class by default');
});

test('extension/background.js persists screensaverWindowId and closes window on alarm or end time', () => {
  assert(bgJs.includes("chrome.storage.local.set({ screensaverWindowId: win.id })"), 'Must store screensaverWindowId');
  assert(bgJs.includes("screensaver_close_alarm"), 'Must create screensaver_close_alarm');
  assert(bgJs.includes("closeScreensaver()"), 'Must invoke closeScreensaver() on alarm');
});

test('extension/background.js updates extension action badge with live countdown', () => {
  assert(bgJs.includes('updateCountdownBadge'), 'Must have updateCountdownBadge function');
  assert(bgJs.includes('chrome.action.setBadgeText'), 'Must update toolbar badge text');
  assert(bgJs.includes('chrome.action.setBadgeBackgroundColor'), 'Must set badge background color');
});

test('extension/popup.html and popup.js provide live countdown display when screensaver is running', () => {
  assert(popupHtml.includes('id="bannerCountdown"'), 'popup.html must have bannerCountdown element');
  assert(popupJs.includes('bannerCountdown.textContent = timeStr'), 'popup.js must update live countdown ticker');
  assert(popupCss.includes('.banner-countdown'), 'popup.css must style banner countdown');
});

test('App.tsx monitors screensaverEndTime and auto-closes when duration expires', () => {
  assert(appTsx.includes('screensaverEndTime'), 'App.tsx must read screensaverEndTime');
  assert(appTsx.includes('closeExtensionScreensaver()'), 'App.tsx must auto-close when time is reached');
});

console.log('\n===============================================================');
console.log(`Results: ${passCount} Passed, ${failCount} Failed.`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Countdown & Extension Duration tests PASSED successfully!\n');
}
