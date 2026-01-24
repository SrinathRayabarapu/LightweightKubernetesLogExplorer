/**
 * Search bar component for full-text log search.
 */

import { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

export function SearchBar({ value, onChange, onSearch, disabled }: SearchBarProps) {
  const { theme } = useTheme();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

  const styles = {
    container: {
      display: 'flex',
      gap: '10px',
      flex: 1,
    },
    inputWrapper: {
      position: 'relative' as const,
      flex: 1,
      display: 'flex',
      alignItems: 'center',
    },
    icon: {
      position: 'absolute' as const,
      left: '14px',
      fontSize: '16px',
      color: theme.colors.textMuted,
    },
    input: {
      width: '100%',
      padding: '10px 40px',
      fontSize: '15px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.inputBg,
      color: theme.colors.inputText,
    },
    clearButton: {
      position: 'absolute' as const,
      right: '10px',
      background: 'none',
      border: 'none',
      fontSize: '20px',
      color: theme.colors.textMuted,
      cursor: 'pointer',
      padding: '0 6px',
    },
    searchButton: {
      padding: '10px 20px',
      fontSize: '15px',
      fontWeight: 600,
      border: 'none',
      borderRadius: '6px',
      backgroundColor: theme.colors.accentPrimary,
      color: '#fff',
      cursor: 'pointer',
    },
    buttonDisabled: {
      backgroundColor: theme.colors.bgHover,
      color: theme.colors.textMuted,
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <span style={styles.icon}>&#128269;</span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search logs..."
          disabled={disabled}
          style={styles.input}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={styles.clearButton}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <button
        onClick={onSearch}
        disabled={disabled}
        style={{
          ...styles.searchButton,
          ...(disabled ? styles.buttonDisabled : {}),
        }}
        title={value ? 'Search logs' : 'Clear search and show all logs'}
      >
        Search
      </button>
    </div>
  );
}
