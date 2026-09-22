export const theme = {
  background: '#0a0a0f',
  surface: '#13131a',
  surfaceElevated: '#1c1c27',
  border: '#2a2a3d',
  text: '#e8e8f0',
  textSecondary: '#9090b0',
  muted: '#5a5a7a',
  accent: '#4f8ef7',
  success: '#3dd68c',
  danger: '#f7604f',
  warning: '#f7c94f',
  chart: {
    historical: '#4f8ef7',
    forecast: '#9b6ff7',
    portfolioHistorical: '#3dd68c',
    portfolioForecast: '#f7c94f',
  },
} as const;

export type Theme = typeof theme;
