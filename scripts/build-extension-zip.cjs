const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const appInExtDir = path.join(extensionDir, 'app');

const isSyncOnly = process.argv.includes('--sync-only');
const skipBuild = process.argv.includes('--skip-build') || isSyncOnly;

console.log('🚀 Fliqlo Extension Build & Packager');
console.log('====================================');

// 1. Build web application
if (!skipBuild) {
  console.log('📦 Step 1/3: Compiling and building web application with Vite...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} else {
  console.log('📦 Step 1/3: Skipping web build (--skip-build or --sync-only)');
}

// 2. Synchronize dist into extension/app
console.log('🔄 Step 2/3: Syncing dist/ into extension/app/ ...');
if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory does not exist. Run npm run build first.');
  process.exit(1);
}

// Remove old extension/app directory
if (fs.existsSync(appInExtDir)) {
  fs.rmSync(appInExtDir, { recursive: true, force: true });
}
fs.mkdirSync(appInExtDir, { recursive: true });

// Copy dist files to extension/app, safely omitting zip archives and system junk
function copyDirRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name.endsWith('.zip') ||
      entry.name === '.DS_Store' ||
      entry.name === 'Thumbs.db'
    ) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyDirRecursive(distDir, appInExtDir);
console.log('  ✓ Updated extension/app with latest application bundle');

if (isSyncOnly) {
  console.log('✅ Sync completed.');
  process.exit(0);
}

// 3. Create extension zip archive
console.log('⚡ Step 3/3: Packaging extension directory into zip archive...');

// Fallback pure JavaScript zip implementation (zero external dependencies)
function createZipPureJs(sourceDir, outputFile) {
  function getAllFiles(dir, baseDir = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      if (
        entry.name === '.DS_Store' ||
        entry.name === 'Thumbs.db' ||
        entry.name.endsWith('.zip')
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(fullPath, baseDir));
      } else {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        files.push({ fullPath, relPath });
      }
    }
    return files;
  }

  const files = getAllFiles(sourceDir);
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const f of files) {
    const data = fs.readFileSync(f.fullPath);
    const uncompressedSize = data.length;
    const crc = zlib.crc32(data);
    const compressedData = zlib.deflateRawSync(data);
    const compressedSize = compressedData.length;
    const nameBuf = Buffer.from(f.relPath, 'utf8');

    const mtime = fs.statSync(f.fullPath).mtime;
    const time =
      ((mtime.getHours() << 11) |
        (mtime.getMinutes() << 5) |
        (mtime.getSeconds() >> 1)) &
      0xffff;
    const date =
      (((mtime.getFullYear() - 1980) << 9) |
        ((mtime.getMonth() + 1) << 5) |
        mtime.getDate()) &
      0xffff;

    // Local file header (30 bytes + filename)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4);         // version needed (2.0)
    lh.writeUInt16LE(0, 6);          // flags
    lh.writeUInt16LE(8, 8);          // compression method (deflate)
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressedSize, 18);
    lh.writeUInt32LE(uncompressedSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);         // extra length

    localHeaders.push(lh, nameBuf, compressedData);

    // Central directory header (46 bytes + filename)
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); // signature
    ch.writeUInt16LE(20, 4);         // version made by
    ch.writeUInt16LE(20, 6);         // version needed
    ch.writeUInt16LE(0, 8);          // flags
    ch.writeUInt16LE(8, 10);         // compression method
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compressedSize, 20);
    ch.writeUInt32LE(uncompressedSize, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);         // extra length
    ch.writeUInt16LE(0, 32);         // comment length
    ch.writeUInt16LE(0, 34);         // disk start
    ch.writeUInt16LE(0, 36);         // internal attr
    ch.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attr (regular file)
    ch.writeUInt32LE(offset, 42);    // relative offset

    centralHeaders.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + compressedData.length;
  }

  const centralDirBuf = Buffer.concat(centralHeaders);
  const cdOffset = offset;
  const cdSize = centralDirBuf.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const finalBuf = Buffer.concat([...localHeaders, centralDirBuf, eocd]);
  fs.writeFileSync(outputFile, finalBuf);
  return { filesCount: files.length, size: finalBuf.length };
}

function packageZip(sourceDir, outputFile) {
  const absOut = path.resolve(outputFile);
  if (fs.existsSync(absOut)) fs.unlinkSync(absOut);

  // Try system zip first (available on Mac/Linux)
  try {
    execSync('which zip', { stdio: 'pipe' });
    execSync(`zip -q -r "${absOut}" . -x "*.DS_Store" "*Thumbs.db" "*.zip"`, {
      cwd: sourceDir,
      stdio: 'pipe',
    });
    const stat = fs.statSync(absOut);
    return { filesCount: 'all', size: stat.size };
  } catch {
    return createZipPureJs(sourceDir, absOut);
  }
}

// 1. Generate temp zip at project root
const mainZipPath = path.join(rootDir, 'extension.zip');
const info = packageZip(extensionDir, mainZipPath);

// 2. Distribute zip to root, public/ (for Vite dev/web download), and dist/ (for production build)
const outputDestinations = [
  path.join(rootDir, 'extension.zip'),
  path.join(rootDir, 'fliqlo-extension.zip'),
  path.join(publicDir, 'fliqlo-extension.zip'),
  path.join(publicDir, 'extension.zip'),
];

if (fs.existsSync(distDir)) {
  outputDestinations.push(path.join(distDir, 'fliqlo-extension.zip'));
  outputDestinations.push(path.join(distDir, 'extension.zip'));
}

for (const dest of outputDestinations) {
  if (dest !== mainZipPath) {
    fs.copyFileSync(mainZipPath, dest);
  }
  const rel = path.relative(rootDir, dest);
  console.log(`  ✓ Created: ${rel} (${(info.size / 1024).toFixed(1)} KB)`);
}

// Read manifest version if present
try {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8')
  );
  console.log(`\n🎉 Success! Fliqlo Extension v${manifest.version} built and zipped.`);
} catch {
  console.log('\n🎉 Success! Extension built and zipped.');
}
