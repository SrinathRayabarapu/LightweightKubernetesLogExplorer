/**
 * Time navigation component for Splunk-style log browsing.
 */

import { useState } from 'react';

interface TimeNavigationProps {
  timestamp: string;
  onNavigate: (timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => void;
}

export function TimeNavigation({ timestamp, onNavigate }: TimeNavigationProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(15);

  const handleCustomNavigate = () => {
    onNavigate(timestamp, customMinutes, 'around');
    setShowCustom(false);
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => onNavigate(timestamp, 5, 'around')}
        style={styles.button}
        title="View logs ±5 minutes from this timestamp"
      >
        ±5m
      </button>
      <button
        onClick={() => onNavigate(timestamp, 10, 'around')}
        style={styles.button}
        title="View logs ±10 minutes from this timestamp"
      >
        ±10m
      </button>
      <button
        onClick={() => setShowCustom(!showCustom)}
        style={{ ...styles.button, ...(showCustom ? styles.activeButton : {}) }}
        title="Custom time window"
      >
        ...
      </button>
      
      {showCustom && (
        <div style={styles.customPopup}>
          <input
            type="number"
            value={customMinutes}
            onChange={e => setCustomMinutes(parseInt(e.target.value) || 5)}
            min={1}
            max={60}
            style={styles.customInput}
          />
          <span style={styles.customLabel}>min</span>
          <button onClick={handleCustomNavigate} style={styles.customButton}>
            Go
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    position: 'relative',
  },
  button: {
    padding: '2px 6px',
    fontSize: '11px',
    border: '1px solid #444',
    borderRadius: '3px',
    backgroundColor: '#333',
    color: '#aaa',
    cursor: 'pointer',
  },
  activeButton: {
    backgroundColor: '#4a9eff',
    borderColor: '#4a9eff',
    color: '#fff',
  },
  customPopup: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    padding: '8px',
    backgroundColor: '#2a2a40',
    border: '1px solid #444',
    borderRadius: '4px',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    zIndex: 100,
  },
  customInput: {
    width: '50px',
    padding: '4px',
    fontSize: '12px',
    border: '1px solid #444',
    borderRadius: '3px',
    backgroundColor: '#1a1a2e',
    color: '#eee',
  },
  customLabel: {
    fontSize: '12px',
    color: '#888',
  },
  customButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: '#4a9eff',
    color: '#fff',
    cursor: 'pointer',
  },
};
