/**
 * scripts/build-icons.js
 *
 * Generates platform-specific icon files from assets/icon.png.
 *
 * Usage:
 *   node scripts/build-icons.js
 *
 * Requirements:
 *   npm install sharp  (only needed to run this script, not at runtime)
 *
 * What it produces:
 *   assets/icon.ico     Windows (multi-size: 16,32,48,64,128,256)
 *   assets/icon.icns    macOS   (via iconutil or manual ICNS assembly)
 *   assets/icon-256.png Fallback Linux
 *
 * If you'd rather use an online converter:
 *   - .ico:  https://convertio.co/png-ico/
 *   - .icns: https://cloudconvert.com/png-to-icns
 *   Just keep the same filenames.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const SRC  = path.join(__dirname, '..', 'assets', 'icon.png');
const DEST = path.join(__dirname, '..', 'assets');

async function buildIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch(e) {
    console.error('sharp not installed. Run: npm install sharp');
    console.error('Or convert manually — see comments in this file.');
    process.exit(1);
  }

  if (!fs.existsSync(SRC)) {
    console.error('Source icon not found:', SRC);
    console.error('Place a 1024×1024 PNG at assets/icon.png first.');
    process.exit(1);
  }

  console.log('Building icons from', SRC);

  // ── Linux PNG (256×256) ─────────────────────────────────────────
  const linux256 = path.join(DEST, 'icon-256.png');
  await sharp(SRC).resize(256, 256).toFile(linux256);
  console.log('✓ Linux PNG:', linux256);

  // ── Windows ICO ────────────────────────────────────────────────
  // ICO is a container format. We generate multiple sizes and
  // combine them. sharp doesn't natively write .ico, so we write
  // a multi-size PNG and use the png-to-ico approach.
  //
  // Simple approach: write the 256×256 PNG and electron-builder
  // will handle the rest if you have ImageMagick installed.
  // Or install: npm install png-to-ico
  try {
    const pngToIco = require('png-to-ico');
    const sizes = [16, 32, 48, 64, 128, 256];
    const buffers = await Promise.all(
      sizes.map(s => sharp(SRC).resize(s, s).png().toBuffer())
    );
    const icoBuffer = await pngToIco(buffers);
    const icoPath = path.join(DEST, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('✓ Windows ICO:', icoPath);
  } catch(e) {
    console.warn('⚠  Could not build .ico (png-to-ico not installed)');
    console.warn('   Run: npm install png-to-ico');
    console.warn('   Or convert manually at https://convertio.co/png-ico/');
  }

  // ── macOS ICNS ─────────────────────────────────────────────────
  // On macOS, use iconutil (built into macOS):
  //   1. Create an .iconset folder with specific sizes
  //   2. Run: iconutil -c icns assets/icon.iconset
  //
  // On Linux/Windows CI, use icns-lib or similar.
  try {
    const { execSync } = require('child_process');
    // Check if we're on macOS
    if (process.platform === 'darwin') {
      const iconsetDir = path.join(DEST, 'icon.iconset');
      fs.mkdirSync(iconsetDir, { recursive: true });
      const macSizes = [
        [16,1],[16,2],[32,1],[32,2],[64,1],[64,2],
        [128,1],[128,2],[256,1],[256,2],[512,1],[512,2],[512,4],
      ];
      await Promise.all(macSizes.map(async ([size, scale]) => {
        const actualSize = size * scale;
        const fname = scale === 1
          ? `icon_${size}x${size}.png`
          : `icon_${size}x${size}@${scale}x.png`;
        await sharp(SRC).resize(actualSize, actualSize).toFile(path.join(iconsetDir, fname));
      }));
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(DEST, 'icon.icns')}"`);
      fs.rmSync(iconsetDir, { recursive: true });
      console.log('✓ macOS ICNS: assets/icon.icns');
    } else {
      console.warn('⚠  ICNS generation requires macOS (iconutil)');
      console.warn('   On Linux/Windows CI, use: npm install icns-lib');
      console.warn('   Or convert at: https://cloudconvert.com/png-to-icns');
    }
  } catch(e) {
    console.warn('⚠  ICNS build failed:', e.message);
  }

  console.log('\nDone. Icons are in assets/');
}

buildIcons().catch(e => {
  console.error('Icon build failed:', e);
  process.exit(1);
});
