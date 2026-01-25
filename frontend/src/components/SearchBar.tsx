/**
 * Search bar component for full-text log search.
 * Supports Splunk-style AND/OR operators.
 */

import { useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

/**
 * Render search query with highlighted AND/OR keywords
 */
function HighlightedQuery({ query, highlightColor }: { query: string; highlightColor: string }) {
  // Split by AND and OR while keeping the delimiters
  const parts = query.split(/(\s+AND\s+|\s+OR\s+)/gi);
  
  return (
    <>
      {parts.map((part, index) => {
        const upperPart = part.trim().toUpperCase();
        if (upperPart === 'AND' || upperPart === 'OR') {
          return (
            <span
              key={index}
              style={{
                backgroundColor: highlightColor,
                color: '#fff',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '12px',
                marginLeft: '2px',
                marginRight: '2px',
              }}
            >
              {upperPart}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export function SearchBar({ value, onChange, onSearch, disabled }: SearchBarProps) {
  const { theme } = useTheme();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

  // Check if query contains AND/OR operators
  const hasOperators = useMemo(() => {
    return /\s+AND\s+|\s+OR\s+/i.test(value);
  }, [value]);

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column' as const,
      flex: 1,
      gap: '4px',
    },
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
    hint: {
      fontSize: '12px',
      color: theme.colors.textMuted,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingLeft: '4px',
    },
    keywordBadge: {
      backgroundColor: theme.colors.accentSecondary || '#6366f1',
      color: '#fff',
      padding: '1px 6px',
      borderRadius: '4px',
      fontWeight: 700,
      fontSize: '11px',
    },
    parsedQuery: {
      fontSize: '13px',
      color: theme.colors.textSecondary,
      padding: '4px 8px',
      backgroundColor: theme.colors.bgHover,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.inputWrapper}>
          <span style={styles.icon}>&#128269;</span>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search logs... (use AND / OR for multiple terms)"
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
      
      {/* Show hint when input is empty or focused */}
      {!value && (
        <div style={styles.hint}>
          <span>Tip: Use</span>
          <span style={styles.keywordBadge}>AND</span>
          <span>or</span>
          <span style={styles.keywordBadge}>OR</span>
          <span>to combine search terms (e.g., error AND timeout)</span>
        </div>
      )}
      
      {/* Show parsed query with highlighted operators when user has operators */}
      {value && hasOperators && (
        <div style={styles.parsedQuery}>
          <span style={{ fontWeight: 500 }}>Query:</span>
          <HighlightedQuery 
            query={value} 
            highlightColor={theme.colors.accentSecondary || '#6366f1'} 
          />
        </div>
      )}
    </div>
  );
}

export { HighlightedQuery };
