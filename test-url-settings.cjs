const assert = require('assert');

async function runTests() {
  console.log('🧪 Starting REAL Source Code URL Query Parameter Verification Suite');
  console.log('===================================================================\n');

  // Load the ACTUAL TypeScript source module via Vite SSR
  const { createServer } = await import('vite');
  const server = await createServer();
  const urlModule = await server.ssrLoadModule('./src/utils/urlSettings.ts');
  const { parseUrlSettings, buildShareableUrl } = urlModule;

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

  // 1. Basic 24h OLED Amber setup
  test('24h OLED Amber setup parsed correctly from real TS module', () => {
    const res = parseUrlSettings('?format=24h&theme=oled&color=amber&seconds=true');
    assert.strictEqual(res.format, '24h');
    assert.strictEqual(res.backgroundTheme, 'oled');
    assert.strictEqual(res.textColorTheme, 'retro-amber');
    assert.strictEqual(res.showSeconds, true);
  });

  // 2. Case-insensitivity (e.g., uppercase format=24H, color=AMBER)
  test('Case-insensitive format and color (e.g. ?format=24H&color=AMBER)', () => {
    const res = parseUrlSettings('?format=24H&color=AMBER');
    assert.strictEqual(res.format, '24h');
    assert.strictEqual(res.textColorTheme, 'retro-amber');
  });

  // 3. Theme aliases (black -> oled, dark -> classic)
  test('Theme aliases (black -> oled, dark -> classic)', () => {
    const resBlack = parseUrlSettings('?theme=black');
    assert.strictEqual(resBlack.backgroundTheme, 'oled');
    const resDark = parseUrlSettings('?bg=dark');
    assert.strictEqual(resDark.backgroundTheme, 'classic');
  });

  // 4. Scale percentages and multipliers (e.g. 120%, 80%, 1.5x)
  test('Scale parsing with percentages and multipliers (120%, 80%, 1.5x)', () => {
    const resPct = parseUrlSettings('?scale=120%');
    assert.strictEqual(resPct.scale, 1.2);
    const resPct2 = parseUrlSettings('?scale=80%');
    assert.strictEqual(resPct2.scale, 0.8);
    const resX = parseUrlSettings('?scale=1.5x');
    assert.strictEqual(resX.scale, 1.5);
  });

  // 5. Boolean flags using on/off (fixes critical bug where on evaluated to false)
  test('Boolean flags with on/off (?sound=on, ?sound=off, ?seconds=on)', () => {
    const resOn = parseUrlSettings('?sound=on&seconds=on&ampm=off');
    assert.strictEqual(resOn.soundEnabled, true, 'sound=on should enable sound');
    assert.strictEqual(resOn.showSeconds, true, 'seconds=on should enable seconds');
    assert.strictEqual(resOn.showAmPm, false, 'ampm=off should disable ampm badge');

    const resOff = parseUrlSettings('?sound=off');
    assert.strictEqual(resOff.soundEnabled, false, 'sound=off should disable sound');
  });

  // 6. Curated presets (?preset=oled, ?preset=cyber, ?preset=retro)
  test('Curated presets (?preset=oled, ?preset=cyber, ?preset=retro)', () => {
    const resOled = parseUrlSettings('?preset=oled');
    assert.strictEqual(resOled.backgroundTheme, 'oled');
    assert.strictEqual(resOled.textColorTheme, 'retro-amber');
    assert.strictEqual(resOled.format, '24h');

    const resCyber = parseUrlSettings('?preset=cyber');
    assert.strictEqual(resCyber.backgroundTheme, 'oled');
    assert.strictEqual(resCyber.textColorTheme, 'cyan');
    assert.strictEqual(resCyber.showSeconds, true);
    assert.strictEqual(resCyber.format, '24h');

    const resRetro = parseUrlSettings('?preset=retro');
    assert.strictEqual(resRetro.backgroundTheme, 'classic');
    assert.strictEqual(resRetro.textColorTheme, 'vintage-cream');
    assert.strictEqual(resRetro.soundEnabled, true);
    assert.strictEqual(resRetro.format, '12h');
  });

  // 7. Preset override with individual query parameter
  test('Preset overridden by individual query parameter (?preset=oled&color=cyan)', () => {
    const res = parseUrlSettings('?preset=oled&color=cyan');
    assert.strictEqual(res.backgroundTheme, 'oled');
    assert.strictEqual(res.textColorTheme, 'cyan', 'Explicit color should override preset');
    assert.strictEqual(res.format, '24h');
  });

  // 8. Scale out-of-range rejection
  test('Out of range scale rejected (scale=99.9, scale=0.01)', () => {
    const resHigh = parseUrlSettings('?scale=99.9');
    assert.strictEqual(resHigh.scale, undefined);
    const resLow = parseUrlSettings('?scale=0.01');
    assert.strictEqual(resLow.scale, undefined);
  });

  // 9. Empty query returns empty object
  test('Empty query returns empty object', () => {
    const res = parseUrlSettings('');
    assert.deepStrictEqual(res, {});
  });

  // 10. buildShareableUrl cleans dirty parameters (guide=1, utm_source, info=1)
  test('buildShareableUrl strips dirty params (?guide=1, utm_source) and generates clean URL', () => {
    global.window = {
      location: {
        href: 'https://jsrahman.github.io/fliqo-chromebook-and-extension/?guide=1&utm_source=twitter&format=12h'
      }
    };
    const cleanUrl = buildShareableUrl({
      format: '24h',
      fontFamily: 'fliqlo',
      showSeconds: true,
      showAmPm: true,
      showDate: false,
      scale: 1.0,
      scaleX: 1.0,
      scaleY: 1.0,
      fontScaleX: 1.0,
      fontScaleY: 1.0,
      soundEnabled: true,
      soundVolume: 0.5,
      backgroundTheme: 'oled',
      textColorTheme: 'retro-amber',
      autoHideControls: true
    });

    assert(!cleanUrl.includes('guide=1'), 'Shared URL must not contain guide=1');
    assert(!cleanUrl.includes('utm_source'), 'Shared URL must not contain utm_source');
    assert(cleanUrl.includes('format=24h'));
    assert(cleanUrl.includes('theme=oled'));
    assert(cleanUrl.includes('color=amber'));
    assert(cleanUrl.includes('seconds=true'));
    assert(cleanUrl.includes('sound=true'));
    assert.strictEqual(
      cleanUrl,
      'https://jsrahman.github.io/fliqo-chromebook-and-extension/?format=24h&theme=oled&color=amber&seconds=true&sound=true'
    );
  });

  await server.close();

  console.log('\n===================================================================');
  console.log(`Results: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
  console.log('🎉 All Real-Source URL Settings Tests PASSED!\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
