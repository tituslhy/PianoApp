import { useCallback, useEffect, useState } from 'react';

/** Supported application colour themes. */
export type Theme = 'dark' | 'light';

/** localStorage key for persisting the user's theme preference. */
export const THEME_STORAGE_KEY = 'piano-theme';

/** Return value from {@link useTheme}. */
export interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Reads the stored theme or falls back to the OS colour-scheme preference.
 * @returns Resolved theme for first visit or when storage is empty.
 */
export function resolveTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

/**
 * Applies the theme by setting `data-theme` on the document root.
 * @param theme - Theme to activate.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Synchronously initialises theme before React renders to reduce flash of wrong theme.
 */
export function initTheme(): void {
  applyTheme(resolveTheme());
}

/**
 * Manages theme state, persists preference to localStorage, and syncs `data-theme` on the root element.
 * @returns Current theme and helpers to change it.
 */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  /**
   * Switches between dark and light themes.
   */
  const toggleTheme = useCallback((): void => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  /**
   * Sets the active theme explicitly.
   * @param next - Theme to apply.
   */
  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
  }, []);

  return { theme, toggleTheme, setTheme };
}
