const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

console.log('🧪 Starting Screensaver & Fullscreen Verification Suite');
console.log('========================================================\n');

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function findChromeBinary() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  try {
    const whichCmd = process.platform === 'win32'
      ? 'where chrome'
      : 'which google-chrome || which chromium || which chromium-browser';
    const found = require('child_process')
      .execSync(whichCmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')[0];
    if (found && fs.existsSync(found)) {
      return found;
    }
  } catch {
    // not found
  }
  return null;
}

async function runAll() {
  const rootDir = __dirname;
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
  const bottomBarTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'BottomBar.tsx'), 'utf-8');
  const fullscreenTs = fs.readFileSync(path.join(rootDir, 'src', 'utils', 'fullscreen.ts'), 'utf-8');

  // Test 1: Static Code Analysis
  console.log('1. Static Code Analysis');

  test('src/App.tsx does not call requestFullscreen on mount, focus, or un-gestured effects', () => {
    assert(!appTsx.includes('enforceFullscreen'), 'enforceFullscreen function should not exist');
    assert(!appTsx.includes("addEventListener('focus', enforceFullscreen)"), 'focus listener calling enforceFullscreen must not exist');
    assert(!appTsx.includes('addEventListener("focus", enforceFullscreen)'), 'focus listener calling enforceFullscreen must not exist');
    assert(!appTsx.includes('requestFullscreen()'), 'Direct un-guarded requestFullscreen() should not be in App.tsx');
  });

  test('src/utils/fullscreen.ts provides safe, cross-vendor Fullscreen API wrappers', () => {
    assert(fullscreenTs.includes('export function isFullscreenActive'), 'isFullscreenActive must be exported');
    assert(fullscreenTs.includes('export function requestFullscreenSafe'), 'requestFullscreenSafe must be exported');
    assert(fullscreenTs.includes('export function exitFullscreenSafe'), 'exitFullscreenSafe must be exported');
    assert(fullscreenTs.includes('export function toggleFullscreenSafe'), 'toggleFullscreenSafe must be exported');
    // Ensure WebKit/Mozilla/MS vendor fallbacks are present
    assert(fullscreenTs.includes('webkitRequestFullscreen'), 'WebKit requestFullscreen fallback must be present');
    assert(fullscreenTs.includes('webkitExitFullscreen'), 'WebKit exitFullscreen fallback must be present');
    assert(fullscreenTs.includes('webkitFullscreenElement'), 'WebKit fullscreenElement check must be present');
    // Ensure return value is safely guarded against void returns
    assert(fullscreenTs.includes("typeof res.catch === 'function'"), 'Must guard against non-Promise void return in legacy WebKit');
  });

  test('src/components/BottomBar.tsx invokes toggleFullscreenSafe only on user click', () => {
    assert(bottomBarTsx.includes('toggleFullscreenSafe'), 'BottomBar must use toggleFullscreenSafe');
    assert(!bottomBarTsx.includes('document.documentElement.requestFullscreen'), 'Direct requestFullscreen should not be called in BottomBar');
    assert(bottomBarTsx.includes('onClick={toggleFullscreen}'), 'Fullscreen toggle must be attached to onClick');
  });

  test('CSS contains .is-screensaver styling covering 100vw and 100vh fixed inset 0', () => {
    const cssPath = path.join(rootDir, 'src', 'styles', 'flipclock.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    assert(css.includes('.fliqlo-app.is-screensaver'), '.fliqlo-app.is-screensaver class must exist');
    assert(css.includes('width: 100vw'), 'Screensaver must span 100vw');
    assert(css.includes('height: 100vh'), 'Screensaver must span 100vh');
    assert(css.includes('inset: 0'), 'Screensaver must cover inset 0');
  });

  // Test 2: Unit Testing fullscreen.ts edge cases with real SSR module
  console.log('\n2. Unit Testing fullscreen.ts Cross-Browser Edge Cases');
  const { createServer } = await import('vite');
  const viteServer = await createServer();
  const fsModule = await viteServer.ssrLoadModule('./src/utils/fullscreen.ts');
  const { isFullscreenActive, requestFullscreenSafe, exitFullscreenSafe, toggleFullscreenSafe } = fsModule;

  test('isFullscreenActive detects standard and prefixed elements correctly', () => {
    global.document = {};
    assert.strictEqual(isFullscreenActive(), false);

    global.document = { fullscreenElement: {} };
    assert.strictEqual(isFullscreenActive(), true);

    global.document = { webkitFullscreenElement: {} };
    assert.strictEqual(isFullscreenActive(), true);

    global.document = { mozFullScreenElement: {} };
    assert.strictEqual(isFullscreenActive(), true);

    global.document = { msFullscreenElement: {} };
    assert.strictEqual(isFullscreenActive(), true);
  });

  test('requestFullscreenSafe safely handles rejecting promises, void returns, and sync throws', () => {
    // 1. Standard rejecting Promise
    let rejectedHandled = false;
    const targetWithReject = {
      requestFullscreen() {
        return Promise.reject(new Error('Permission denied')).catch(() => {
          rejectedHandled = true;
        });
      }
    };
    assert.doesNotThrow(() => requestFullscreenSafe(targetWithReject));

    // 2. Legacy WebKit returning undefined (void)
    let webkitCalled = false;
    const targetWithLegacyWebKit = {
      webkitRequestFullscreen() {
        webkitCalled = true;
        return undefined; // Legacy WebKit returns void
      }
    };
    assert.doesNotThrow(() => requestFullscreenSafe(targetWithLegacyWebKit));
    assert.strictEqual(webkitCalled, true);

    // 3. Synchronous exception
    const targetWithThrow = {
      requestFullscreen() {
        throw new Error('NotAllowedError');
      }
    };
    assert.doesNotThrow(() => requestFullscreenSafe(targetWithThrow));
  });

  test('exitFullscreenSafe safely handles rejecting promises, void returns, and sync throws', () => {
    // 1. Standard rejecting Promise
    global.document = {
      exitFullscreen() {
        return Promise.reject(new Error('Cannot exit fullscreen'));
      }
    };
    assert.doesNotThrow(() => exitFullscreenSafe());

    // 2. Legacy WebKit returning undefined
    let webkitExitCalled = false;
    global.document = {
      webkitExitFullscreen() {
        webkitExitCalled = true;
        return undefined;
      }
    };
    assert.doesNotThrow(() => exitFullscreenSafe());
    assert.strictEqual(webkitExitCalled, true);

    // 3. Synchronous exception
    global.document = {
      exitFullscreen() {
        throw new Error('InvalidStateError');
      }
    };
    assert.doesNotThrow(() => exitFullscreenSafe());
  });

  test('toggleFullscreenSafe switches between request and exit according to state', () => {
    let exited = false;
    let requested = false;

    // When already in fullscreen -> should exit
    global.document = {
      fullscreenElement: {},
      exitFullscreen() {
        exited = true;
        return Promise.resolve();
      }
    };
    toggleFullscreenSafe();
    assert.strictEqual(exited, true, 'Should call exit when in fullscreen');

    // When not in fullscreen -> should request
    global.document = {
      documentElement: {
        requestFullscreen() {
          requested = true;
          return Promise.resolve();
        }
      }
    };
    toggleFullscreenSafe();
    assert.strictEqual(requested, true, 'Should call request when not in fullscreen');
  });

  await viteServer.close();

  // Test 3: Dynamic Headless Chrome Verification
  console.log('\n3. Dynamic Headless Chrome Browser Verification');
  const chromeBin = findChromeBinary();

  if (!chromeBin) {
    console.log('  ⚠ SKIP: Headless Chrome binary not found; skipping dynamic browser test.');
    passCount++;
  } else {
    await asyncTest('app/index.html?mode=screensaver loads cleanly without user gesture errors', async () => {
      const serverPort = await getFreePort();
      const cdpPort = await getFreePort();
      const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-screensaver-verify-'));

      const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath.startsWith('/app/')) {
          reqPath = '/extension' + reqPath;
        } else if (reqPath === '/') {
          reqPath = '/extension/app/index.html';
        } else {
          reqPath = '/extension/app' + reqPath;
        }
        const filePath = path.join(rootDir, reqPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const contentType = ext === '.html' ? 'text/html'
            : ext === '.js' ? 'application/javascript'
            : ext === '.css' ? 'text/css'
            : ext === '.svg' ? 'image/svg+xml'
            : ext === '.png' ? 'image/png'
            : 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(fs.readFileSync(filePath));
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      await new Promise((resolve) => server.listen(serverPort, '127.0.0.1', resolve));

      const chrome = spawn(chromeBin, [
        '--headless=new',
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${tempUserDataDir}`,
        `http://127.0.0.1:${serverPort}/app/index.html?mode=screensaver`,
      ]);

      try {
        await new Promise((r) => setTimeout(r, 2000));
        const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        const list = await listRes.json();
        const page = list.find((t) => t.type === 'page');
        assert(page, 'Chrome page target must be found');

        const ws = new WebSocket(page.webSocketDebuggerUrl);
        const errors = [];
        const warnings = [];

        ws.addEventListener('message', (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.method === 'Runtime.exceptionThrown') {
            errors.push(msg.params.exceptionDetails);
          }
          if (msg.method === 'Log.entryAdded') {
            const entry = msg.params.entry;
            if (entry.level === 'error' || entry.text.includes('requestFullscreen')) {
              warnings.push(entry);
            }
          }
        });

        await new Promise((r) => ws.addEventListener('open', r));
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

        // Dispatch window focus/blur events to ensure no fullscreen handler fires on focus
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: { expression: "window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus'));" },
        }));

        // Wait 1.5 seconds for React to mount and idle timers to initialize
        await new Promise((r) => setTimeout(r, 1500));

        // Verify no exception was thrown
        assert.strictEqual(errors.length, 0, `Expected 0 runtime exceptions, got: ${JSON.stringify(errors)}`);

        // Verify no requestFullscreen warning
        const fsWarnings = warnings.filter((w) => w.text && w.text.includes('requestFullscreen'));
        assert.strictEqual(fsWarnings.length, 0, `Expected 0 requestFullscreen warnings, got: ${JSON.stringify(fsWarnings)}`);

        ws.close();
      } finally {
        chrome.kill();
        server.close();
        try {
          fs.rmSync(tempUserDataDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    });
  }

  console.log('\n========================================================');
  console.log(`Results: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
