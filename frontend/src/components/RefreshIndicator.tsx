/**
 * Refresh indicator and auto-refresh control component.
 */

import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface RefreshIndicatorProps {
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in seconds
  onManualRefresh: () => void;
  onToggleAutoRefresh: (enabled: boolean) => void;
  onIntervalChange: (seconds: number) => void;
}

export function RefreshIndicator({
  isRefreshing,
  autoRefreshEnabled,
  refreshInterval,
  onManualRefresh,
  onToggleAutoRefresh,
  onIntervalChange,
}: RefreshIndicatorProps) {
  const { theme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const intervalOptions = [
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
    { value: 300, label: '5m' },
    { value: 600, label: '10m' },
  ];

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    refreshButton: {
      padding: '10px 14px',
      fontSize: '14px',
      border: `1px solid ${theme.colors.buttonBorder}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.buttonBg,
      color: theme.colors.buttonText,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    refreshing: {
      opacity: 0.7,
      cursor: 'wait',
    },
    spinner: {
      display: 'inline-block',
      animation: 'spin 1s linear infinite',
    },
    autoRefresh: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      position: 'relative' as const,
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      color: theme.colors.textSecondary,
      cursor: 'pointer',
    },
    settingsButton: {
      padding: '6px 10px',
      fontSize: '16px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: 'transparent',
      color: theme.colors.textMuted,
      cursor: 'pointer',
    },
    settingsPopup: {
      position: 'absolute' as const,
      top: '100%',
      right: 0,
      marginTop: '6px',
      padding: '14px',
      backgroundColor: theme.colors.bgTertiary,
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '6px',
      zIndex: 100,
      minWidth: '160px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    settingsLabel: {
      fontSize: '13px',
      color: theme.colors.textMuted,
      marginBottom: '10px',
    },
    intervalButtons: {
      display: 'flex',
      gap: '6px',
    },
    intervalButton: {
      padding: '6px 10px',
      fontSize: '13px',
      border: `1px solid ${theme.colors.buttonBorder}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textSecondary,
      cursor: 'pointer',
    },
    intervalActive: {
      backgroundColor: theme.colors.accentPrimary,
      borderColor: theme.colors.accentPrimary,
      color: '#fff',
    },
    intervalLabel: {
      fontSize: '13px',
      color: theme.colors.textMuted,
    },
  };

  return (
    <div style={styles.container}>
      <button
        onClick={onManualRefresh}
        disabled={isRefreshing}
        style={{
          ...styles.refreshButton,
          ...(isRefreshing ? styles.refreshing : {}),
        }}
        title="Fetch latest logs"
      >
        {isRefreshing ? (
          <span style={styles.spinner}>⟳</span>
        ) : (
          '↻'
        )} Refresh
      </button>

      <div style={styles.autoRefresh}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={autoRefreshEnabled}
            onChange={e => onToggleAutoRefresh(e.target.checked)}
          />
          <span>Auto</span>
        </label>

        <button
          onClick={() => setShowSettings(!showSettings)}
          style={styles.settingsButton}
          title="Refresh settings"
        >
          ⚙
        </button>

        {showSettings && (
          <div style={styles.settingsPopup}>
            <div style={styles.settingsLabel}>Refresh interval:</div>
            <div style={styles.intervalButtons}>
              {intervalOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onIntervalChange(opt.value);
                    setShowSettings(false);
                  }}
                  style={{
                    ...styles.intervalButton,
                    ...(refreshInterval === opt.value ? styles.intervalActive : {}),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {autoRefreshEnabled && (
        <span style={styles.intervalLabel}>
          every {Math.floor(refreshInterval / 60)}m
        </span>
      )}
    </div>
  );
}
