import { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';

const KEY = 'parkease_theme';
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function initialTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Dark mode is a "dark" class on <html>. The colour overrides live in index.css.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggle }}>{children}</ThemeContext.Provider>;
}
