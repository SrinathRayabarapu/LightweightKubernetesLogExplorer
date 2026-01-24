/**
 * Theme selector dropdown component.
 */

import { useTheme } from '../context/ThemeContext';
import { getThemeOptions } from '../config/themes';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const themeOptions = getThemeOptions();

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    } as React.CSSProperties,
    label: {
      fontSize: '13px',
      color: theme.colors.textMuted,
      textTransform: 'uppercase' as const,
      fontWeight: 600,
      letterSpacing: '0.5px',
    } as React.CSSProperties,
    select: {
      padding: '8px 12px',
      fontSize: '14px',
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.buttonBg,
      color: theme.colors.buttonText,
      cursor: 'pointer',
      outline: 'none',
      minWidth: '160px',
      transition: 'all 0.2s ease',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>Theme</label>
      <select
        value={theme.id}
        onChange={(e) => setTheme(e.target.value)}
        style={styles.select}
        title="Select a color theme"
      >
        {themeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
