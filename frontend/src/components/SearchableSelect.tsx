/**
 * Searchable select component with filtering and auto-select on exact match.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

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
          handleSelect(filteredOptions[highlightedIndex]);
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minHeight: '48px', // Ensure consistent height with other components
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#888',
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '8px 36px 8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '4px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    minWidth: '200px',
    outline: 'none',
  },
  inputDisabled: {
    backgroundColor: '#1a1a2e',
    color: '#666',
    cursor: 'not-allowed',
  },
  clearButton: {
    position: 'absolute',
    right: '24px',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  arrow: {
    position: 'absolute',
    right: '8px',
    color: '#666',
    fontSize: '10px',
    pointerEvents: 'none',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: '#2a2a40',
    border: '1px solid #444',
    borderRadius: '4px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  option: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#eee',
    cursor: 'pointer',
    borderBottom: '1px solid #333',
  },
  optionHighlighted: {
    backgroundColor: '#3a3a5a',
  },
  optionSelected: {
    backgroundColor: '#4a9eff22',
    color: '#4a9eff',
  },
  noResults: {
    padding: '12px',
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
  },
};
