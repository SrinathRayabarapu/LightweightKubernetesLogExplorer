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
      gap: '8px',
    } as React.CSSProperties,
    label: {
      fontSize: '11px',
      color: theme.colors.textMuted,
      textTransform: 'uppercase' as const,
      fontWeight: 500,
    } as React.CSSProperties,
    select: {
      padding: '6px 10px',
      fontSize: '13px',
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.buttonBg,
      color: theme.colors.buttonText,
      cursor: 'pointer',
      outline: 'none',
      minWidth: '140px',
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
