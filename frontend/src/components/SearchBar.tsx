/**
 * Search bar component for full-text log search.
 * Supports Splunk-style AND/OR/NOT operators.
 * Includes search history with localStorage persistence.
 */

import { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../context/ThemeContext';

const SEARCH_HISTORY_KEY = 'k8s-log-explorer-search-history';
const MAX_HISTORY_ITEMS = 10;

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

export interface SearchBarRef {
  focus: () => void;
}

// Load search history from localStorage
function loadSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save search history to localStorage
function saveSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore localStorage errors
  }
}

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
  { value, onChange, onSearch, disabled },
  ref
) {
  const { theme } = useTheme();
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose focus method to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  // Load history on mount
  useEffect(() => {
    setHistory(loadSearchHistory());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add search to history
  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setHistory(prev => {
      // Remove duplicates and add to front
      const filtered = prev.filter(h => h !== query);
      const newHistory = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveSearchHistory(newHistory);
      return newHistory;
    });
  }, []);

  // Handle search - save to history
  const handleSearch = useCallback(() => {
    if (value.trim()) {
      addToHistory(value.trim());
    }
    onSearch();
    setShowHistory(false);
  }, [value, onSearch, addToHistory]);

  // Handle selecting from history
  const handleSelectHistory = useCallback((query: string) => {
    onChange(query);
    setShowHistory(false);
    // Trigger search after a brief delay to let state update
    setTimeout(() => {
      addToHistory(query);
      onSearch();
    }, 0);
  }, [onChange, onSearch, addToHistory]);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveSearchHistory([]);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowHistory(false);
    }
  }, [handleSearch]);

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
      left: '12px',
      fontSize: '14px',
      color: theme.colors.textMuted,
      zIndex: 1,
    },
    input: {
      width: '100%',
      padding: '8px 36px',
      fontSize: '14px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '5px',
      backgroundColor: theme.colors.inputBg,
      color: theme.colors.inputText,
    },
    clearButton: {
      position: 'absolute' as const,
      right: '8px',
      background: 'none',
      border: 'none',
      fontSize: '18px',
      color: theme.colors.textMuted,
      cursor: 'pointer',
      padding: '0 4px',
    },
    searchButton: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 600,
      border: 'none',
      borderRadius: '5px',
      backgroundColor: theme.colors.accentPrimary,
      color: '#fff',
      cursor: 'pointer',
    },
    buttonDisabled: {
      backgroundColor: theme.colors.bgHover,
      color: theme.colors.textMuted,
      cursor: 'not-allowed',
    },
    historyDropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '4px',
      backgroundColor: theme.colors.bgSecondary,
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxHeight: '300px',
      overflowY: 'auto' as const,
    },
    historyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      borderBottom: `1px solid ${theme.colors.borderSecondary}`,
      fontSize: '12px',
      color: theme.colors.textMuted,
    },
    historyClearBtn: {
      background: 'none',
      border: 'none',
      fontSize: '11px',
      color: theme.colors.textMuted,
      cursor: 'pointer',
      padding: '2px 6px',
      borderRadius: '4px',
    },
    historyItem: {
      padding: '10px 12px',
      cursor: 'pointer',
      fontSize: '14px',
      color: theme.colors.textPrimary,
      borderBottom: `1px solid ${theme.colors.borderSecondary}`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    historyItemHover: {
      backgroundColor: theme.colors.bgHover,
    },
    historyIcon: {
      fontSize: '12px',
      color: theme.colors.textMuted,
    },
  };

  // Filter history based on current input
  const filteredHistory = value.trim()
    ? history.filter(h => h.toLowerCase().includes(value.toLowerCase()) && h !== value)
    : history;

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.inputWrapper}>
        <span style={styles.icon}>&#128269;</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => history.length > 0 && setShowHistory(true)}
          placeholder="Search logs... (use AND / OR / NOT)"
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
        
        {/* Search History Dropdown */}
        {showHistory && filteredHistory.length > 0 && (
          <div style={styles.historyDropdown}>
            <div style={styles.historyHeader}>
              <span>Recent Searches</span>
              <button
                onClick={handleClearHistory}
                style={styles.historyClearBtn}
                title="Clear all history"
              >
                Clear All
              </button>
            </div>
            {filteredHistory.map((query, index) => (
              <div
                key={`${query}-${index}`}
                role="button"
                tabIndex={0}
                style={styles.historyItem}
                onClick={() => handleSelectHistory(query)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectHistory(query); }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.colors.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={styles.historyIcon}>🕐</span>
                <span>{query}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleSearch}
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
});
