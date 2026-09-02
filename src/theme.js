// theme.js — 浅色/暗色/跟随系统
import { getSettings, saveSettings } from './storage.js';

const root = document.documentElement;
let settings = getSettings();

export function applyTheme(mode) {
  let theme = mode;
  if (mode === 'auto') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
}

export function currentMode() { return settings.theme; }

export function cycleTheme() {
  const order = ['light', 'dark', 'auto'];
  const i = order.indexOf(settings.theme === 'auto' ? 'auto' : settings.theme);
  settings.theme = order[(i + 1) % order.length];
  saveSettings(settings);
  applyTheme(settings.theme);
  return settings.theme;
}

export function initTheme() {
  applyTheme(settings.theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'auto') applyTheme('auto');
  });
}
