/**
 * Search bar component for full-text log search.
 * Supports Splunk-style AND/OR operators with in-line highlighting.
 */

import { useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

/**
 * Render text with highlighted AND/OR keywords for the overlay display
 */
function HighlightedText({ text, highlightColor, textColor }: { 
  text: string; 
  highlightColor: string;
  textColor: string;
}) {
  if (!text) return null;
  
  // Split by AND and OR while keeping the delimiters and spaces
  const parts = text.split(/(\s+AND\s+|\s+OR\s+)/gi);
  
  return (
    <>
      {parts.map((part, index) => {
        const trimmedUpper = part.trim().toUpperCase();
        if (trimmedUpper === 'AND' || trimmedUpper === 'OR') {
          // Preserve the original spacing
          const match = part.match(/^(\s*)(AND|OR)(\s*)$/i);
          if (match) {
            return (
              <span key={index}>
                {match[1]}
                <span
                  style={{
                    backgroundColor: highlightColor,
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  {trimmedUpper}
                </span>
                {match[3]}
              </span>
            );
          }
        }
        return <span key={index} style={{ color: textColor }}>{part}</span>;
      })}
    </>
  );
}

export function SearchBar({ value, onChange, onSearch, disabled }: SearchBarProps) {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

  // Check if query contains AND/OR operators
  const hasOperators = /\s+AND\s+|\s+OR\s+/i.test(value);

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
      zIndex: 2,
    },
    // The overlay that shows highlighted text (behind the input)
    highlightOverlay: {
      position: 'absolute' as const,
      left: '40px',
      right: '40px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '15px',
      fontFamily: 'inherit',
      whiteSpace: 'pre' as const,
      pointerEvents: 'none' as const,
      zIndex: 1,
      overflow: 'hidden',
    },
    // The actual input - text is transparent when we have operators
    input: {
      width: '100%',
      padding: '10px 40px',
      fontSize: '15px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.inputBg,
      color: hasOperators ? 'transparent' : theme.colors.inputText,
      caretColor: theme.colors.inputText, // Keep cursor visible
      position: 'relative' as const,
      zIndex: 2,
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
      zIndex: 3,
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
        
        {/* Highlight overlay - only shown when there are AND/OR operators */}
        {hasOperators && value && (
          <div style={styles.highlightOverlay}>
            <HighlightedText 
              text={value} 
              highlightColor={theme.colors.accentSecondary || '#6366f1'}
              textColor={theme.colors.inputText}
            />
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search logs... (use AND / OR)"
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
