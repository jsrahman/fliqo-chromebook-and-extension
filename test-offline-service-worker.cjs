const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

console.log('🧪 Starting Offline PWA & Service Worker Verification Suite');
console.log('==========================================================');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const distSwPath = path.join(distDir, 'sw.js');
const publicSwPath = path.join(rootDir, 'public', 'sw.js');
const indexHtmlPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');

// 1. Syntax check
console.log('\n1. Service Worker Syntax & Integrity Checks');
execSync(`node -c "${publicSwPath}"`);
console.log('  ✓ PASS: public/sw.js has zero syntax errors');

execSync(`node -c "${distSwPath}"`);
console.log('  ✓ PASS: dist/sw.js has zero syntax errors');

// 2. Precached assets verification
console.log('\n2. Offline Precached Assets Verification');
const distSwContent = fs.readFileSync(distSwPath, 'utf8');
assert(distSwContent.includes('CACHE_VERSION') || distSwContent.includes('CACHE_NAME'), 'Must define cache name');
assert(distSwContent.includes("addEventListener('install'"), 'Must handle install event');
assert(distSwContent.includes("addEventListener('activate'"), 'Must handle activate event');
assert(distSwContent.includes("addEventListener('fetch'"), 'Must handle fetch event');
console.log('  ✓ PASS: sw.js contains install, activate, and fetch lifecycle handlers');

// Extract PRECACHE_ASSETS items from dist/sw.js
const match = distSwContent.match(/const PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
assert(match, 'PRECACHE_ASSETS array must be present');
const assetLines = match[1]
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith("'./") || line.startsWith('"./'))
  .map((line) => line.replace(/['",]/g, ''));

assert(assetLines.length >= 10, 'Must have at least 10 core assets precached');

let checkedAssets = 0;
for (const rel of assetLines) {
  if (rel === './') continue;
  const filePath = path.join(distDir, rel.replace('./', ''));
  assert(fs.existsSync(filePath), `Precached asset file must exist on disk in dist: ${rel}`);
  checkedAssets++;
}
console.log(`  ✓ PASS: All ${checkedAssets} precached asset files exist on disk in dist/`);

// 3. Navigation fallback & offline handling
console.log('\n3. Navigation Fallback & Offline Routing');
assert(distSwContent.includes("request.mode === 'navigate'"), 'Must intercept navigation requests');
assert(distSwContent.includes('caches.match'), 'Must match cached responses for offline support');
assert(distSwContent.includes('clients.claim'), 'Must claim clients on activate for instant offline control');
assert(distSwContent.includes('skipWaiting'), 'Must skip waiting for immediate activation');
console.log('  ✓ PASS: sw.js implements navigation fallback, clients.claim(), and skipWaiting()');

// 4. Registration in index.html
console.log('\n4. Service Worker Registration in index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('navigator.serviceWorker') && indexHtml.includes('.register'), 'index.html must register service worker');
assert(indexHtml.includes("protocol.startsWith('http')"), 'index.html must check http protocol to avoid chrome-extension conflict');
console.log('  ✓ PASS: index.html safely registers ./sw.js for http/https environments');

// 5. PWA Manifest
console.log('\n5. Progressive Web App Manifest');
assert(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.name, 'Manifest must have a name');
assert(manifest.icons && manifest.icons.length > 0, 'Manifest must declare icons');
assert(manifest.display, 'Manifest must declare display mode');
console.log('  ✓ PASS: manifest.webmanifest is valid and properly configured');

console.log('\n==========================================================');
console.log('🎉 All Offline PWA & Service Worker tests PASSED successfully!\n');
