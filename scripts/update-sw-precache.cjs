const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distSwPath = path.join(distDir, 'sw.js');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distSwPath)) {
  console.log('ℹ️  sw.js not found in dist/, skipping asset injection');
  process.exit(0);
}

if (!fs.existsSync(assetsDir)) {
  console.log('ℹ️  dist/assets/ not found, skipping asset injection');
  process.exit(0);
}

const assetFiles = fs.readdirSync(assetsDir);
const injectedAssets = assetFiles
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((f) => `'./assets/${f}'`);

if (injectedAssets.length > 0) {
  let swContent = fs.readFileSync(distSwPath, 'utf8');
  const injectionTarget = '/* __BUILD_INJECTED_ASSETS__ */';
  if (swContent.includes(injectionTarget)) {
    const replacement = injectedAssets.join(',\n  ') + ',';
    swContent = swContent.replace(injectionTarget, replacement);
    fs.writeFileSync(distSwPath, swContent, 'utf8');
    console.log(`✓ Injected ${injectedAssets.length} built assets into dist/sw.js`);
  }
}
