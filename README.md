# Fliqlo Flip Clock (React + Vite)

A modern, authentic web recreation of the iconic **Fliqlo** flip-clock screensaver built with React, TypeScript, and CSS 3D transforms.

## Features

- **Authentic Fliqlo Visuals**:
  - Deep matte dark background with subtle atmospheric gradients.
  - Split-flap cards with horizontal center groove and side hinge notches.
  - Realistic 3D mechanical flip animation with progressive top/bottom shadows and cast drop shadows.
  - High-contrast, bold typography inspired by classic Solari flip clocks.
  - AM / PM indicator badge on the hour flap (in 12-hour mode).

- **Bottom Navigation Controls**:
  - **Settings Button**: Opens custom configuration panel.
  - **Fullscreen Button**: Toggles native browser fullscreen mode with state sync.
  - **Auto-Hide Screensaver Mode**: Cursor and bottom controls gracefully fade away after 3 seconds of inactivity and instantly reappear upon mouse movement or tap.

- **Settings Customization**:
  - **Time Format**: Switch between 12-Hour (AM/PM) and 24-Hour display.
  - **Display Seconds**: Toggle optional animated seconds card unit.
  - **Display Date**: Optional subtle date indicator.
  - **Clock Scale**: Smooth slider from 60% to 140%.
  - **Mechanical Sound FX**: Offline Web Audio API synthesis replicating authentic retro plastic flap clicks.
  - **Background Themes**: Classic Dark, OLED Pure Black, Charcoal Slate, Deep Midnight.
  - **Digit Colors**: Pure White, Vintage Cream, Retro Amber, Cyber Cyan.
  - **Persistent Settings**: All settings auto-saved to `localStorage`.

- **Keyboard Shortcuts**:
  - `F`: Toggle Fullscreen
  - `S`: Toggle Settings Modal
  - `Space`: Quick toggle between 12h and 24h format
  - `Esc`: Close Settings Modal / Exit Fullscreen

## Getting Started

### Development
```bash
npm install
npm run dev
```

Visit [http://127.0.0.1:5173](http://127.0.0.1:5173).

### Production Build
```bash
npm run build
npm run preview
```

### Build Chrome Screensaver Extension (.zip)
```bash
npm run extension-build
```
This builds the latest React web application, synchronizes the assets into `extension/app/`, and packages the extension into ready-to-distribute ZIP archives:
- `extension.zip` & `fliqlo-extension.zip` in project root
- `public/fliqlo-extension.zip` (for web download)
- `dist/fliqlo-extension.zip`

### Installing the Extension
1. Run `npm run extension-build` or click **Extension** on the webpage to download `fliqlo-extension.zip`.
2. Extract `fliqlo-extension.zip`.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the unzipped `extension` directory.
