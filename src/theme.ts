export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  onPrimary: string;
}

export const dark: Palette = {
  bg: '#0F1115',
  surface: '#1A1D24',
  surfaceAlt: '#232730',
  border: '#2C313C',
  text: '#F5F7FA',
  textDim: '#9BA3B0',
  primary: '#6C8CFF',
  success: '#3DD68C',
  warning: '#FFB454',
  danger: '#FF6B6B',
  onPrimary: '#0F1115',
};

export const light: Palette = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF0F7',
  border: '#DDE2EC',
  text: '#1A1D24',
  textDim: '#6B7280',
  primary: '#4F6CF0',
  success: '#1FB877',
  warning: '#E0922F',
  danger: '#E5484D',
  onPrimary: '#FFFFFF',
};

export const palettes: Record<'dark' | 'light', Palette> = { dark, light };

// Default palette kept for any non-themed usage.
export const colors = dark;

export const habitColors = [
  '#6C8CFF',
  '#3DD68C',
  '#FFB454',
  '#FF6B6B',
  '#C792EA',
  '#4FD1C5',
  '#F687B3',
  '#F6C453',
];

export const habitIcons = [
  '💪', '📚', '💧', '🏃', '🧘', '🥗', '😴', '✍️',
  '🎯', '🚭', '☀️', '🧠', '💊', '🦷', '🎸', '💰',
];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };
