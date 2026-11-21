# Fliqlo Web Flip Clock (Chrome OS, Mac, Windows)

An authentic, modern web recreation of the iconic **Fliqlo** (also commonly searched as **Fliqo**) flip-clock screensaver built with React 19, TypeScript, and CSS 3D transforms.

> 🚀 **Solves the Chrome OS Screensaver Problem**: Google Chrome OS and Chromebooks cannot run traditional `.saver` (macOS) or `.scr` (Windows) binary files. Fliqlo Web solves this completely with full-screen browser mode, Progressive Web App (PWA) installation, and an automated idle-detection Chrome Screensaver Extension!

---

## Key Highlights

- **Authentic Solari Split-Flap Mechanics**:
  - Split-flap cards with horizontal center groove and realistic side hinge notches.
  - 60 FPS 3D mechanical flip animation with progressive top/bottom lighting and cast drop shadows.
  - Bold Solari flip clock typography with authentic proportions.
  - AM / PM indicator badge on the hours card in 12-hour mode.

- **Solves the Chrome OS & Chromebook Limitation**:
  - **Direct Fullscreen**: Press `F` to enter distraction-free full-screen screensaver on any Chromebook.
  - **Auto-Hide Cursor & Controls**: Interface and cursor seamlessly fade away after 3 seconds of inactivity.
  - **Automated Idle Extension**: Packaged Chrome Extension (`fliqlo-extension.zip`) listens for idle time and launches automatically.
  - **PWA Ready**: Install onto your Chromebook shelf directly from Chrome's omnibox.

- **Full Web Custom Options**:
  - **Time Format**: Switch between 12-Hour (AM/PM) and 24-Hour display.
  - **Display Seconds**: Animated split-flap unit flipping live seconds with realistic gravity drop.
  - **Display Date**: Discrete calendar day indicator.
  - **Clock Scale**: Smooth slider from 60% to 140%, plus independent horizontal/vertical stretch.
  - **Mechanical Sound FX**: Offline Web Audio API synthesis replicating authentic retro plastic flap clicks (with volume control).
  - **Background Themes**: Classic Dark, OLED Pure Black (#000000), Charcoal Slate, Deep Midnight.
  - **Digit Colors**: Pure White, Vintage Cream (#f4ecd8), Retro Amber (#f59e0b), Cyber Cyan (#06b6d4).
  - **Solari Typefaces**: Fliqlo Official, Barlow Condensed, Libre Baskerville, Ubuntu.
  - **Persistent Settings**: Auto-saved to `localStorage` and synced via `chrome.storage`.

- **Instant URL Query Parameter Customization**:
  Launch or embed pre-configured custom clock setups directly via URL:
  - `?format=24h&theme=oled&color=amber&seconds=true`
  - `?seconds=true&sound=true&volume=0.7`
  - `?scale=1.2&font=barlow`
  - `?mode=screensaver&hideControls=true`

- **Best-in-Class SEO & AI Agent Optimization (GEO)**:
  - **AI Agent Discoverability**: Standards-compliant `/llms.txt` and `/llms-full.txt` for ChatGPT, Perplexity, Claude, Gemini, and Copilot.
  - **Schema.org JSON-LD**: Comprehensive `WebSite`, `WebApplication`, `HowTo` (Chrome OS walkthrough), and `FAQPage` schemas.
  - **Open Graph & Twitter Cards**: 1200x630 social preview card (`og-image.png`).
  - **Crawler Accessibility**: Noscript fallback and semantic crawlable DOM (`sr-only`) for headless engines.
  - **Web Manifest & Robots.txt**: Complete PWA icons (`icon-192`, `icon-512`, `apple-touch-icon`) and AI-friendly crawl rules.

---

## Keyboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| <kbd>F</kbd> | Toggle Fullscreen mode |
| <kbd>S</kbd> | Toggle Settings customization dialog |
| <kbd>I</kbd> or <kbd>?</kbd> | Toggle Chrome OS Guide & About dialog |
| <kbd>Space</kbd> | Instant toggle between 12-Hour and 24-Hour mode |
| <kbd>Esc</kbd> | Close dialogs, exit fullscreen, or close screensaver |

---

## URL Parameters Reference

| Parameter | Values / Aliases | Default | Description |
|-----------|------------------|---------|-------------|
| `preset` | `oled`, `retro`, `cyber`, `neon`, `minimal`, `solari` | `null` | Curated clock aesthetic preset |
| `format` | `12h`, `24h`, `12`, `24`, `military` | `12h` | Clock time format |
| `theme` | `classic`, `oled`, `charcoal`, `navy`, `black`, `dark` | `classic` | Background color theme |
| `color` | `white`, `cream`, `amber`, `cyan`, `gold`, `yellow` | `white` | Numeral text color |
| `font` | `fliqlo`, `barlow`, `serif`, `ubuntu` | `fliqlo` | Numeral typeface |
| `seconds` | `true`, `1`, `on`, `false`, `0`, `off` | `false` | Show seconds flip unit |
| `ampm` | `true`, `1`, `on`, `false`, `0`, `off` | `true` | Show AM/PM indicator |
| `date` | `true`, `1`, `on`, `false`, `0`, `off` | `false` | Show calendar date |
| `sound` | `true`, `1`, `on`, `false`, `0`, `off` | `false` | Enable flap click audio |
| `volume` | `0.0` to `1.0` or `0%` to `100%` | `0.5` | Flap sound volume |
| `scale` | `0.4` to `4.0` or `40%` to `400%` | `1.0` | Clock scale factor |
| `mode` | `screensaver` | `null` | Pure fullscreen screensaver |
| `hideControls` | `true`, `1` | `false` | Hide toolbar permanently |

---

## Getting Started

### Development
```bash
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
npm run preview
```

### Run Tests
```bash
npm test
```

### Build & Package Chrome Screensaver Extension (.zip)
```bash
npm run build:extension
```
This compiles the web application, synchronizes assets into `extension/app/`, and packages ready-to-distribute ZIP archives:
- `extension.zip` & `fliqlo-extension.zip` in project root
- `public/fliqlo-extension.zip` (for website one-click download)
- `dist/fliqlo-extension.zip`

### Installing on Chromebook / Chrome
1. Click **Extension** on the website to download `fliqlo-extension.zip`.
2. Extract `fliqlo-extension.zip` in the ChromeOS Files app.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** in the top right.
5. Click **Load unpacked** and select the unzipped folder.
