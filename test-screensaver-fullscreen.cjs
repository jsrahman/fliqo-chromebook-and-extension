const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
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

async function runAll() {
  const rootDir = __dirname;
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');

  // Test 1: Source code analysis
  console.log('1. Static Code Analysis');
  test('src/App.tsx does not call requestFullscreen on component mount or focus', () => {
    // Ensure enforceFullscreen or automatic requestFullscreen on mount is not present
    assert(!appTsx.includes('enforceFullscreen'), 'enforceFullscreen function should not exist');
    assert(!appTsx.includes("addEventListener('focus', enforceFullscreen)"), 'focus listener calling enforceFullscreen must not exist');
    assert(!appTsx.includes('addEventListener("focus", enforceFullscreen)'), 'focus listener calling enforceFullscreen must not exist');
  });

  test('src/App.tsx only invokes requestFullscreen inside user gesture handlers (e.g. keydown)', () => {
    const lines = appTsx.split('\n');
    let insideUserHandler = false;
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('handleKeyDown') || line.includes("e.key === 'f'")) {
        insideUserHandler = true;
      }
      if (line.includes('requestFullscreen')) {
        assert(insideUserHandler, `requestFullscreen at line ${i + 1} must be inside a user gesture handler`);
      }
    }
  });

  test('CSS contains .is-screensaver styling covering 100vw and 100vh fixed inset 0', () => {
    const cssPath = path.join(rootDir, 'src', 'styles', 'flipclock.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    assert(css.includes('.fliqlo-app.is-screensaver'), '.fliqlo-app.is-screensaver class must exist');
    assert(css.includes('width: 100vw'), 'Screensaver must span 100vw');
    assert(css.includes('height: 100vh'), 'Screensaver must span 100vh');
    assert(css.includes('inset: 0'), 'Screensaver must cover inset 0');
  });

  // Test 2: Dynamic Headless Chrome Verification
  console.log('\n2. Dynamic Headless Chrome Browser Verification');
  await asyncTest('app/index.html?mode=screensaver loads cleanly without user gesture errors', async () => {
    const port = 49154;
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

    await new Promise((resolve) => server.listen(port, resolve));

    const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
      '--headless=new',
      '--remote-debugging-port=9225',
      '--user-data-dir=/tmp/cdp-test-screensaver-verify',
      `http://127.0.0.1:${port}/app/index.html?mode=screensaver`,
    ]);

    try {
      await new Promise((r) => setTimeout(r, 2000));
      const listRes = await fetch('http://127.0.0.1:9225/json/list');
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
    }
  });

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
