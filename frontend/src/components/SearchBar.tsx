/**
 * Search bar component for full-text log search.
 */

import { useCallback } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

export function SearchBar({ value, onChange, onSearch, disabled }: SearchBarProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '10px',
    flex: 1,
  },
  inputWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '14px',
    fontSize: '16px',
    color: '#666',
  },
  input: {
    width: '100%',
    padding: '10px 40px',
    fontSize: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#2a2a40',
    color: '#eee',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '0 6px',
  },
  searchButton: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#4a9eff',
    color: '#fff',
    cursor: 'pointer',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },
};
