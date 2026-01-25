/**
 * Searchable select component with filtering and auto-select on exact match.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  label,
}: SearchableSelectProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on input (case-insensitive)
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Sync input value with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset input to current value if no selection made
        if (!value && inputValue) {
          setInputValue('');
        } else {
          setInputValue(value);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, inputValue]);

  // Handle input change with auto-select on exact match
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Check for exact match (case-insensitive)
    const exactMatch = options.find(
      opt => opt.toLowerCase() === newValue.toLowerCase()
    );

    if (exactMatch) {
      // Auto-select on exact match
      onChange(exactMatch);
      setInputValue(exactMatch);
      setIsOpen(false);
    }
  }, [options, onChange]);

  // Handle option selection
  const handleSelect = useCallback((option: string) => {
    onChange(option);
    setInputValue(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          // Select highlighted option
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          // Auto-select if only one option matches
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setInputValue(value);
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleSelect, value]);

  // Clear selection
  const handleClear = useCallback(() => {
    onChange('');
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  // Dynamic styles based on theme
  const styles = {
    container: {
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
      minHeight: '54px',
    },
    label: {
      fontSize: '13px',
      fontWeight: 600,
      color: theme.colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    inputWrapper: {
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      padding: '10px 40px 10px 14px',
      fontSize: '15px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.inputBg,
      color: theme.colors.inputText,
      minWidth: '220px',
      outline: 'none',
    },
    inputDisabled: {
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textMuted,
      cursor: 'not-allowed',
    },
    clearButton: {
      position: 'absolute' as const,
      right: '28px',
      background: 'none',
      border: 'none',
      color: theme.colors.textMuted,
      fontSize: '18px',
      cursor: 'pointer',
      padding: '0 6px',
    },
    arrow: {
      position: 'absolute' as const,
      right: '10px',
      color: theme.colors.textMuted,
      fontSize: '12px',
      pointerEvents: 'none' as const,
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '6px',
      maxHeight: '240px',
      overflowY: 'auto' as const,
      backgroundColor: theme.colors.bgTertiary,
      border: `1px solid ${theme.colors.borderSecondary}`,
      borderRadius: '6px',
      zIndex: 1000,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    },
    option: {
      padding: '10px 14px',
      fontSize: '15px',
      color: theme.colors.textPrimary,
      cursor: 'pointer',
      borderBottom: `1px solid ${theme.colors.borderPrimary}`,
    },
    optionHighlighted: {
      backgroundColor: theme.colors.bgHover,
    },
    optionSelected: {
      backgroundColor: `${theme.colors.accentPrimary}22`,
      color: theme.colors.accentPrimary,
    },
    noResults: {
      padding: '14px',
      fontSize: '14px',
      color: theme.colors.textMuted,
      textAlign: 'center' as const,
    },
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...styles.input,
            ...(disabled ? styles.inputDisabled : {}),
          }}
        />
        {value && !disabled && (
          <button
            onClick={handleClear}
            style={styles.clearButton}
            type="button"
            title="Clear selection"
          >
            ×
          </button>
        )}
        <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div style={styles.dropdown}>
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              onClick={() => handleSelect(option)}
              style={{
                ...styles.option,
                ...(index === highlightedIndex ? styles.optionHighlighted : {}),
                ...(option === value ? styles.optionSelected : {}),
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && filteredOptions.length === 0 && inputValue && (
        <div style={styles.dropdown}>
          <div style={styles.noResults}>No matching services</div>
        </div>
      )}
    </div>
  );
}
