import { ClockSettings } from '../types';

/**
 * Helper to parse boolean values from URL query string.
 * Supports: true, 1, yes, on, enable, enabled, show -> true
 * Supports: false, 0, no, off, disable, disabled, hide -> false
 */
function parseBooleanParam(val: string | null): boolean | undefined {
  if (val === null) return undefined;
  const normalized = val.trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'enable', 'enabled', 'show'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off', 'disable', 'disabled', 'hide'].includes(normalized)) {
    return false;
  }
  return undefined;
}

/**
 * Helper to parse number with optional percentage or multiplier (e.g. 1.2, 120%, 1.2x).
 */
function parseScaleParam(val: string | null, min = 0.4, max = 4.0): number | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().toLowerCase();
  let num: number;
  if (trimmed.endsWith('%')) {
    num = parseFloat(trimmed.slice(0, -1)) / 100;
  } else if (trimmed.endsWith('x')) {
    num = parseFloat(trimmed.slice(0, -1));
  } else {
    num = parseFloat(trimmed);
  }
  if (!isNaN(num) && num >= min && num <= max) {
    return Math.round(num * 100) / 100;
  }
  return undefined;
}

/**
 * Preset definitions for instant curated clock aesthetics
 */
export const PRESETS: Record<string, Partial<ClockSettings>> = {
  oled: {
    backgroundTheme: 'oled',
    textColorTheme: 'retro-amber',
    format: '24h',
  },
  'oled-amber': {
    backgroundTheme: 'oled',
    textColorTheme: 'retro-amber',
    format: '24h',
  },
  retro: {
    backgroundTheme: 'classic',
    textColorTheme: 'vintage-cream',
    soundEnabled: true,
    format: '12h',
  },
  cyber: {
    backgroundTheme: 'oled',
    textColorTheme: 'cyan',
    showSeconds: true,
    format: '24h',
  },
  neon: {
    backgroundTheme: 'oled',
    textColorTheme: 'cyan',
    showSeconds: true,
    format: '24h',
  },
  minimal: {
    backgroundTheme: 'oled',
    textColorTheme: 'white',
    format: '24h',
    autoHideControls: true,
  },
  solari: {
    backgroundTheme: 'classic',
    textColorTheme: 'white',
    soundEnabled: true,
    format: '12h',
    showSeconds: true,
  },
};

/**
 * Parse clock customization settings from URL search parameters.
 * Supports:
 * ?format=12h|24h|12|24|military
 * ?theme=classic|oled|charcoal|navy|black|dark
 * ?color=white|cream|amber|cyan|gold|orange|yellow
 * ?font=fliqlo|barlow|serif|ubuntu
 * ?seconds=true|1|yes|on|false|0|no|off
 * ?ampm=true|1|yes|on|false|0|no|off
 * ?date=true|1|yes|on|false|0|no|off
 * ?sound=true|1|yes|on|false|0|no|off
 * ?volume=0.0-1.0 or 0%-100%
 * ?scale=0.4-4.0 or 40%-400%
 * ?preset=oled|retro|cyber|neon|minimal|solari
 */
export function parseUrlSettings(search: string): Partial<ClockSettings> {
  const params = new URLSearchParams(search);
  let overrides: Partial<ClockSettings> = {};

  // Check preset first if present
  const presetKey = params.get('preset')?.toLowerCase().trim();
  if (presetKey && PRESETS[presetKey]) {
    overrides = { ...PRESETS[presetKey] };
  }

  // Format
  const formatRaw = params.get('format')?.toLowerCase().trim();
  if (formatRaw) {
    if (['12h', '12', '12-hour', 'standard', 'ampm', 'am-pm'].includes(formatRaw)) {
      overrides.format = '12h';
    } else if (['24h', '24', '24-hour', 'military'].includes(formatRaw)) {
      overrides.format = '24h';
    }
  }

  // Background Theme
  const themeRaw = (params.get('theme') || params.get('bg') || params.get('background'))?.toLowerCase().trim();
  if (themeRaw) {
    if (['classic', 'default', 'dark'].includes(themeRaw)) {
      overrides.backgroundTheme = 'classic';
    } else if (['oled', 'black', 'pure-black', 'pitch-black'].includes(themeRaw)) {
      overrides.backgroundTheme = 'oled';
    } else if (['charcoal', 'slate', 'gray', 'grey'].includes(themeRaw)) {
      overrides.backgroundTheme = 'charcoal';
    } else if (['navy', 'midnight', 'blue'].includes(themeRaw)) {
      overrides.backgroundTheme = 'navy';
    }
  }

  // Text / Digit Color Theme
  const colorRaw = (params.get('color') || params.get('textColor') || params.get('digits'))?.toLowerCase().trim();
  if (colorRaw) {
    if (['white', 'light', '#fff', '#ffffff'].includes(colorRaw)) {
      overrides.textColorTheme = 'white';
    } else if (['vintage-cream', 'cream', 'ivory', 'warm', 'beige'].includes(colorRaw)) {
      overrides.textColorTheme = 'vintage-cream';
    } else if (['retro-amber', 'amber', 'orange', 'gold', 'yellow'].includes(colorRaw)) {
      overrides.textColorTheme = 'retro-amber';
    } else if (['cyan', 'cyber-cyan', 'blue', 'neon'].includes(colorRaw)) {
      overrides.textColorTheme = 'cyan';
    }
  }

  // Font family
  const fontRaw = (params.get('font') || params.get('fontFamily') || params.get('typography'))?.toLowerCase().trim();
  if (fontRaw) {
    if (['fliqlo', 'official', 'solari', 'default'].includes(fontRaw)) {
      overrides.fontFamily = 'fliqlo';
    } else if (['barlow', 'barlow-condensed', 'condensed', 'sans'].includes(fontRaw)) {
      overrides.fontFamily = 'barlow-condensed';
    } else if (['serif', 'libre-baskerville', 'baskerville', 'retro'].includes(fontRaw)) {
      overrides.fontFamily = 'libre-baskerville';
    } else if (['ubuntu', 'humanist'].includes(fontRaw)) {
      overrides.fontFamily = 'ubuntu';
    }
  }

  // Seconds toggle
  const secondsVal = parseBooleanParam(params.get('seconds') || params.get('sec'));
  if (secondsVal !== undefined) {
    overrides.showSeconds = secondsVal;
  }

  // AM/PM badge
  const ampmVal = parseBooleanParam(params.get('ampm'));
  if (ampmVal !== undefined) {
    overrides.showAmPm = ampmVal;
  }

  // Date toggle
  const dateVal = parseBooleanParam(params.get('date'));
  if (dateVal !== undefined) {
    overrides.showDate = dateVal;
  }

  // Scale (0.4 to 4.0, or 40% to 400%)
  const scale = parseScaleParam(params.get('scale'), 0.4, 4.0);
  if (scale !== undefined) {
    overrides.scale = scale;
  }

  // Granular Scale X / Y
  const scaleX = parseScaleParam(params.get('scaleX'), 0.4, 2.5);
  if (scaleX !== undefined) overrides.scaleX = scaleX;

  const scaleY = parseScaleParam(params.get('scaleY'), 0.4, 2.5);
  if (scaleY !== undefined) overrides.scaleY = scaleY;

  // Numeral Font Scale X / Y
  const fontScaleX = parseScaleParam(params.get('fontScaleX'), 0.4, 2.5);
  if (fontScaleX !== undefined) overrides.fontScaleX = fontScaleX;

  const fontScaleY = parseScaleParam(params.get('fontScaleY'), 0.4, 2.5);
  if (fontScaleY !== undefined) overrides.fontScaleY = fontScaleY;

  // Mechanical flap sound
  const soundVal = parseBooleanParam(params.get('sound') || params.get('audio'));
  if (soundVal !== undefined) {
    overrides.soundEnabled = soundVal;
  }

  // Sound volume (0.0 to 1.0 or 0% to 100%)
  const volumeStr = params.get('volume');
  if (volumeStr) {
    const trimmed = volumeStr.trim();
    let vol = parseFloat(trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed);
    if (trimmed.endsWith('%') || (vol > 1.0 && vol <= 100)) {
      vol = vol / 100;
    }
    if (!isNaN(vol) && vol >= 0 && vol <= 1.0) {
      overrides.soundVolume = Math.round(vol * 100) / 100;
    }
  }

  // Auto-hide controls
  const autohideVal = parseBooleanParam(params.get('autohide') || params.get('autoHide'));
  if (autohideVal !== undefined) {
    overrides.autoHideControls = autohideVal;
  }

  return overrides;
}

/**
 * Build shareable URL with custom clock options encoded.
 * Ensures transient query parameters (like ?guide=1, ?info=1, or ?utm_source=...)
 * are stripped, producing a clean, shareable clock URL.
 */
export function buildShareableUrl(settings: ClockSettings): string {
  if (typeof window === 'undefined') return '';
  const current = new URL(window.location.href);
  // Construct clean base using origin and pathname only
  const url = new URL(current.origin + current.pathname);
  const params = url.searchParams;

  // Add non-default parameters
  if (settings.format !== '12h') params.set('format', settings.format);
  if (settings.backgroundTheme !== 'classic') params.set('theme', settings.backgroundTheme);
  if (settings.textColorTheme !== 'white') {
    const colorMap: Record<string, string> = {
      'vintage-cream': 'cream',
      'retro-amber': 'amber',
      cyan: 'cyan',
    };
    params.set('color', colorMap[settings.textColorTheme] || settings.textColorTheme);
  }
  if (settings.fontFamily !== 'fliqlo') {
    const fontMap: Record<string, string> = {
      'barlow-condensed': 'barlow',
      'libre-baskerville': 'serif',
      ubuntu: 'ubuntu',
    };
    params.set('font', fontMap[settings.fontFamily] || settings.fontFamily);
  }
  if (settings.showSeconds) params.set('seconds', 'true');
  if (!settings.showAmPm) params.set('ampm', 'false');
  if (settings.showDate) params.set('date', 'true');
  if (settings.scale !== 1.0) params.set('scale', settings.scale.toFixed(2));
  if (settings.soundEnabled) {
    params.set('sound', 'true');
    if (settings.soundVolume !== 0.5) {
      params.set('volume', settings.soundVolume.toFixed(2));
    }
  }

  return url.toString();
}

