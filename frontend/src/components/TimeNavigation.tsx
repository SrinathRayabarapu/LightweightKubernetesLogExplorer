/**
 * Time navigation component for Splunk-style log browsing.
 */

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TimeNavigationProps {
  timestamp: string;
  onNavigate: (timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => void;
}

export function TimeNavigation({ timestamp, onNavigate }: TimeNavigationProps) {
  const { theme } = useTheme();
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showCustom) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCustom(false);
      }
    };

    // Add listener with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustom]);

  const handleCustomNavigate = () => {
    onNavigate(timestamp, customMinutes, 'around');
    setShowCustom(false);
  };

  const styles = {
    container: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      position: 'relative' as const,
      marginTop: '6px',
    },
    button: {
      padding: '4px 8px',
      fontSize: '12px',
      border: `1px solid ${theme.colors.buttonBorder}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.buttonBg,
      color: theme.colors.buttonText,
      cursor: 'pointer',
    },
    activeButton: {
      backgroundColor: theme.colors.accentPrimary,
      borderColor: theme.colors.accentPrimary,
      color: '#fff',
    },
    customPopup: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      marginTop: '6px',
      padding: '10px',
      backgroundColor: theme.colors.bgTertiary,
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '6px',
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    customInput: {
      width: '55px',
      padding: '6px',
      fontSize: '13px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.inputBg,
      color: theme.colors.inputText,
    },
    customLabel: {
      fontSize: '13px',
      color: theme.colors.textMuted,
    },
    customButton: {
      padding: '6px 10px',
      fontSize: '13px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: theme.colors.accentPrimary,
      color: '#fff',
      cursor: 'pointer',
    },
  };

  return (
    <div ref={containerRef} style={styles.container}>
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
