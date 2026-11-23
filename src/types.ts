export type TimeFormat = '12h' | '24h';

export type AppMode = 'screensaver' | 'countdown';

export type BackgroundTheme = 'classic' | 'oled' | 'charcoal' | 'navy';

export type TextColorTheme = 'white' | 'vintage-cream' | 'retro-amber' | 'cyan';

export type FontFamilyId =
  | 'fliqlo'
  | 'barlow-condensed'
  | 'libre-baskerville'
  | 'ubuntu';

export interface FontOption {
  id: FontFamilyId;
  name: string;
  fontFamily: string;
  description: string;
  badge?: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: 'fliqlo',
    name: 'Fliqlo',
    fontFamily: '"Fliqlo", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
    description: 'Iconic screensaver flip clock font by Yuji Adachi',
    badge: 'Official',
  },
  {
    id: 'barlow-condensed',
    name: 'Barlow Condensed',
    fontFamily: '"Barlow Condensed", sans-serif',
    description: 'Grotesque condensed geometric sans-serif',
  },
  {
    id: 'libre-baskerville',
    name: 'Libre Baskerville',
    fontFamily: '"Libre Baskerville", Georgia, serif',
    description: 'Classic high-contrast elegant serif',
  },
  {
    id: 'ubuntu',
    name: 'Ubuntu',
    fontFamily: '"Ubuntu", sans-serif',
    description: 'Distinctive humanist sans-serif',
  },
];

export interface ClockSettings {
  format: TimeFormat;
  fontFamily: FontFamilyId;
  showSeconds: boolean;
  showAmPm: boolean;
  showDate: boolean;
  scale: number; // Overall scale: 0.4 to 4.0, default 1.0
  scaleX: number; // Horizontal scale: 0.4 to 2.5, default 1.0
  scaleY: number; // Vertical scale: 0.4 to 2.5, default 1.0
  fontScaleX: number; // Numeral Font Width (horizontal stretch/condense): 0.4 to 2.5, default 1.0
  fontScaleY: number; // Numeral Font Height (vertical size/tallness): 0.4 to 2.5, default 1.0
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  backgroundTheme: BackgroundTheme;
  textColorTheme: TextColorTheme;
  autoHideControls: boolean;
}

export const DEFAULT_SETTINGS: ClockSettings = {
  format: '12h',
  fontFamily: 'fliqlo',
  showSeconds: false,
  showAmPm: true,
  showDate: false,
  scale: 1.0,
  scaleX: 1.0,
  scaleY: 1.0,
  fontScaleX: 1.0,
  fontScaleY: 1.0,
  soundEnabled: false,
  soundVolume: 0.5,
  backgroundTheme: 'classic',
  textColorTheme: 'white',
  autoHideControls: true,
};
