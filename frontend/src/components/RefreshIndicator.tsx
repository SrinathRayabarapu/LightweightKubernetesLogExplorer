/**
 * Refresh indicator and auto-refresh control component.
 */

import { useState } from 'react';

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
  const [showSettings, setShowSettings] = useState(false);

  const intervalOptions = [
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
    { value: 300, label: '5m' },
    { value: 600, label: '10m' },
  ];

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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  refreshButton: {
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
    gap: '4px',
    position: 'relative',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#aaa',
    cursor: 'pointer',
  },
  settingsButton: {
    padding: '4px 8px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    color: '#888',
    cursor: 'pointer',
  },
  settingsPopup: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    padding: '12px',
    backgroundColor: '#2a2a40',
    border: '1px solid #444',
    borderRadius: '4px',
    zIndex: 100,
    minWidth: '150px',
  },
  settingsLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
  },
  intervalButtons: {
    display: 'flex',
    gap: '4px',
  },
  intervalButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid #444',
    borderRadius: '3px',
    backgroundColor: '#1a1a2e',
    color: '#aaa',
    cursor: 'pointer',
  },
  intervalActive: {
    backgroundColor: '#4a9eff',
    borderColor: '#4a9eff',
    color: '#fff',
  },
  intervalLabel: {
    fontSize: '12px',
    color: '#666',
  },
};
