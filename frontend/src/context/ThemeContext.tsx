/**
 * Theme context for managing application-wide theme state.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, getTheme, defaultTheme } from '../config/themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'k8s-log-explorer-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
      return savedThemeId ? getTheme(savedThemeId) : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  // Update theme and persist to localStorage
  const setTheme = (themeId: string) => {
    const newTheme = getTheme(themeId);
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Apply theme CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    const colors = theme.colors;

    // Set CSS custom properties for theme colors
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--accent-primary', colors.accentPrimary);

    // Update body background for immediate visual feedback
    document.body.style.backgroundColor = colors.bgPrimary;
    document.body.style.color = colors.textPrimary;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
