/**
 * Time preset buttons for quick log filtering.
 * Splunk-style "Last X minutes/hours" selectors.
 */

import { useTheme } from '../context/ThemeContext';

interface TimePresetsProps {
  onSelectPreset: (timestamp: string, minutes: number, direction: 'before' | 'after' | 'around') => void;
  activePreset: string | null;
  onClear: () => void;
  disabled?: boolean;
}

interface Preset {
  label: string;
  minutes: number;
  id: string;
}

const PRESETS: Preset[] = [
  { label: 'Last 5m', minutes: 5, id: 'last-5m' },
  { label: 'Last 15m', minutes: 15, id: 'last-15m' },
  { label: 'Last 1h', minutes: 60, id: 'last-1h' },
  { label: 'Last 4h', minutes: 240, id: 'last-4h' },
  { label: 'Last 24h', minutes: 1440, id: 'last-24h' },
];

export function TimePresets({ onSelectPreset, activePreset, onClear, disabled }: TimePresetsProps) {
  const { theme } = useTheme();

  const handlePresetClick = (preset: Preset) => {
    // Use current time as base, direction "before" to get logs from (now - X) to now
    const now = new Date().toISOString();
    onSelectPreset(now, preset.minutes, 'before');
  };

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: 'wrap' as const,
    },
    label: {
      fontSize: '12px',
      color: theme.colors.textMuted,
      marginRight: '4px',
    },
    button: {
      padding: '4px 10px',
      fontSize: '12px',
      border: `1px solid ${theme.colors.buttonBorder}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.buttonBg,
      color: theme.colors.buttonText,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    buttonActive: {
      backgroundColor: theme.colors.accentPrimary,
      borderColor: theme.colors.accentPrimary,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    clearButton: {
      padding: '4px 8px',
      fontSize: '11px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: 'transparent',
      color: theme.colors.textMuted,
      cursor: 'pointer',
      marginLeft: '4px',
    },
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Time:</span>
      {PRESETS.map(preset => (
        <button
          key={preset.id}
          onClick={() => handlePresetClick(preset)}
          disabled={disabled}
          style={{
            ...styles.button,
            ...(activePreset === preset.id ? styles.buttonActive : {}),
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          title={`Show logs from the last ${preset.label.replace('Last ', '')}`}
        >
          {preset.label}
        </button>
      ))}
      {activePreset && (
        <button
          onClick={onClear}
          style={styles.clearButton}
          title="Clear time filter"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// Export preset IDs for use in parent component
export function getPresetIdForMinutes(minutes: number): string | null {
  const preset = PRESETS.find(p => p.minutes === minutes);
  return preset?.id || null;
}
