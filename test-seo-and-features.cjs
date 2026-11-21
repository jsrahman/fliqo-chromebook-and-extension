const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting SEO & AI Agent Solution Verification Suite');
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

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

// --- Test Group 1: HTML & Metadata ---
console.log('1. Testing index.html SEO & Structured Data');
const indexPath = path.join(distDir, 'index.html');
assert(fs.existsSync(indexPath), 'dist/index.html must exist');
const html = fs.readFileSync(indexPath, 'utf-8');

test('index.html contains optimized title tag', () => {
  assert(html.includes('<title>Fliqlo (Fliqo) Run in Web – Flip Clock &amp; Chrome OS Screensaver</title>'));
});

test('index.html contains meta description with Chrome OS and custom options', () => {
  assert(html.includes('name="description"'));
  assert(html.includes('Chrome OS screensaver problem'));
  assert(html.includes('custom options'));
});

test('index.html contains target keywords (fliqlo, fliqo, screensaver, etc.)', () => {
  assert(html.includes('name="keywords"'));
  assert(html.includes('fliqlo'));
  assert(html.includes('fliqo'));
  assert(html.includes('chrome os screen saver problem'));
  assert(html.includes('chromebook screensaver'));
  assert(html.includes('fliqo run in web'));
});

test('index.html contains Open Graph & Twitter Card tags', () => {
  assert(html.includes('property="og:title"'));
  assert(html.includes('property="og:description"'));
  assert(html.includes('property="og:image"'));
  assert(html.includes('property="og:url"'));
  assert(html.includes('name="twitter:card" content="summary_large_image"'));
  assert(html.includes('name="twitter:image"'));
});

test('index.html contains canonical URL', () => {
  assert(html.includes('<link rel="canonical"'));
});

test('index.html references AI agent llms.txt discovery', () => {
  assert(html.includes('href="./llms.txt"'));
  assert(html.includes('href="./llms-full.txt"'));
});

test('index.html contains Schema.org JSON-LD structured data', () => {
  assert(html.includes('application/ld+json'));
  assert(html.includes('"@type": "WebSite"'));
  assert(html.includes('"@type": "WebApplication"'));
  assert(html.includes('"@type": "HowTo"'));
  assert(html.includes('"@type": "FAQPage"'));
  assert(html.includes('How to Solve the Chrome OS Screensaver Problem on Chromebooks'));
});

test('index.html contains noscript content for non-JS scrapers & text browsers', () => {
  assert(html.includes('<noscript>'));
  assert(html.includes('Solving the Chrome OS Screensaver Problem'));
  assert(html.includes('Full Custom Options Available'));
});

test('index.html contains semantic sr-only knowledge section for AI crawlers', () => {
  assert(html.includes('id="seo-knowledge"'));
  assert(html.includes('class="sr-only"'));
  assert(html.includes('Fliqlo &amp; Fliqo Run in Web'));
  assert(html.includes('How Fliqlo Web Solves the Chrome OS Screensaver Problem'));
});

// --- Test Group 2: Robots.txt & Sitemap.xml ---
console.log('\n2. Testing robots.txt and sitemap.xml');
const robotsPath = path.join(distDir, 'robots.txt');
const sitemapPath = path.join(distDir, 'sitemap.xml');

test('robots.txt exists and explicitly allows AI crawlers with absolute sitemap', () => {
  assert(fs.existsSync(robotsPath), 'robots.txt must exist');
  const robots = fs.readFileSync(robotsPath, 'utf-8');
  assert(robots.includes('User-agent: *'));
  assert(robots.includes('User-agent: GPTBot'));
  assert(robots.includes('User-agent: OAI-SearchBot'));
  assert(robots.includes('User-agent: ClaudeBot'));
  assert(robots.includes('User-agent: PerplexityBot'));
  assert(robots.includes('User-agent: Google-Extended'));
  assert(robots.includes('Sitemap: https://jsrahman.github.io/fliqo-chromebook-and-extension/sitemap.xml'));
});

test('sitemap.xml exists and contains valid canonical URLs', () => {
  assert(fs.existsSync(sitemapPath), 'sitemap.xml must exist');
  const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
  assert(sitemap.startsWith('<?xml'));
  assert(sitemap.includes('<urlset'));
  assert(sitemap.includes('https://jsrahman.github.io/fliqo-chromebook-and-extension/'));
  assert(sitemap.includes('https://jsrahman.github.io/fliqo-chromebook-and-extension/llms.txt'));
  assert(sitemap.includes('https://jsrahman.github.io/fliqo-chromebook-and-extension/llms-full.txt'));
});

// --- Test Group 3: llms.txt & llms-full.txt ---
console.log('\n3. Testing llms.txt & llms-full.txt (GEO / AI Agent Standard)');
const llmsPath = path.join(distDir, 'llms.txt');
const llmsFullPath = path.join(distDir, 'llms-full.txt');

test('llms.txt exists and covers Chrome OS solution and custom options', () => {
  assert(fs.existsSync(llmsPath), 'llms.txt must exist');
  const llms = fs.readFileSync(llmsPath, 'utf-8');
  assert(llms.includes('# Fliqlo & Fliqo Web'));
  assert(llms.includes('Solving the Chrome OS & Chromebook Screensaver Problem'));
  assert(llms.includes('Full Web Version & Custom Options'));
  assert(llms.includes('URL Query Parameter Customization'));
  assert(llms.includes('preset'));
  assert(llms.includes('?preset=oled'));
});

test('llms-full.txt exists with comprehensive knowledge base and FAQs', () => {
  assert(fs.existsSync(llmsFullPath), 'llms-full.txt must exist');
  const full = fs.readFileSync(llmsFullPath, 'utf-8');
  assert(full.includes('Comprehensive Knowledge Base for AI Agents'));
  assert(full.includes('The Core Problem'));
  assert(full.includes('Solution A: Native Web Fullscreen Screensaver'));
  assert(full.includes('Solution B: Automatic Idle Screensaver via Chrome Extension'));
  assert(full.includes('Solution C: Progressive Web App (PWA) / Shelf Pinning'));
  assert(full.includes('Frequently Asked Questions (FAQ)'));
});

// --- Test Group 4: PWA Manifest & Image Assets ---
console.log('\n4. Testing PWA manifest and social/app images');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
test('manifest.webmanifest exists and has valid JSON', () => {
  assert(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(data.name.includes('Fliqlo'));
  assert.strictEqual(data.display, 'fullscreen');
  assert(Array.isArray(data.icons));
  assert(data.icons.length >= 3);
});

test('App icons and og-image exist with proper sizes', () => {
  assert(fs.existsSync(path.join(distDir, 'icon-192.png')));
  assert(fs.existsSync(path.join(distDir, 'icon-512.png')));
  assert(fs.existsSync(path.join(distDir, 'apple-touch-icon.png')));
  assert(fs.existsSync(path.join(distDir, 'og-image.png')));

  const ogStat = fs.statSync(path.join(distDir, 'og-image.png'));
  assert(ogStat.size > 20000, 'og-image.png should be substantial');
});

// --- Test Group 5: Extension Package ---
console.log('\n5. Testing Extension ZIP Package');
test('fliqlo-extension.zip exists in public and dist', () => {
  assert(fs.existsSync(path.join(publicDir, 'fliqlo-extension.zip')));
  assert(fs.existsSync(path.join(distDir, 'fliqlo-extension.zip')));
  const stat = fs.statSync(path.join(distDir, 'fliqlo-extension.zip'));
  assert(stat.size > 300000, 'fliqlo-extension.zip should contain the built app');
});

// --- Summary ---
console.log(`\n========================================================`);
console.log(`Results: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All SEO & AI Agent Solution Tests PASSED successfully!');
}
