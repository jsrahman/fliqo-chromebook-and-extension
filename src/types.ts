export type TimeFormat = '12h' | '24h';

export type BackgroundTheme = 'classic' | 'oled' | 'charcoal' | 'navy';

export type TextColorTheme = 'white' | 'vintage-cream' | 'retro-amber' | 'cyan';

export type FontFamilyId = 'fliqlo' | 'barlow-condensed' | 'libre-baskerville' | 'ubuntu';

export interface FontOption {
  id: FontFamilyId;
  name: string;
  fontFamily: string;
  description: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: 'fliqlo',
    name: 'Fliqlo Original',
    fontFamily: '"Fliqlo", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
    description: 'Official iconic screensaver font by Yuji Adachi',
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
  scale: number; // 0.6 to 1.4, default 1.0
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
  soundEnabled: false,
  soundVolume: 0.5,
  backgroundTheme: 'classic',
  textColorTheme: 'white',
  autoHideControls: true,
};
