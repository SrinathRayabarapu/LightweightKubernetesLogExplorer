/**
 * FieldsPanel component for displaying extracted fields from logs.
 * Allows users to filter logs by clicking on field values.
 */

import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface FieldsPanelProps {
  fields: Record<string, Record<string, number>>;
  isLoading: boolean;
  onFieldClick: (field: string, value: string) => void;
  activeFilters: { field: string; value: string }[];
  onClearFilter: (field: string, value: string) => void;
  onClearAllFilters: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function FieldsPanel({
  fields,
  isLoading,
  onFieldClick,
  activeFilters,
  onClearFilter,
  onClearAllFilters,
  collapsed,
  onToggleCollapsed,
}: FieldsPanelProps) {
  const { theme } = useTheme();
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleField = (field: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const isValueActive = (field: string, value: string) => {
    return activeFilters.some(f => f.field === field && f.value === value);
  };

  const formatFieldName = (field: string) => {
    // Convert snake_case or camelCase to Title Case
    return field
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const colors = theme.colors;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: collapsed ? '40px' : '220px',
      minWidth: collapsed ? '40px' : '220px',
      height: '100%',
      backgroundColor: colors.bgSecondary,
      borderRight: `1px solid ${colors.borderPrimary}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    },
    header: {
      padding: collapsed ? '10px 8px' : '10px 12px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'space-between',
      gap: '8px',
      backgroundColor: colors.bgTertiary,
    },
    headerTitle: {
      fontSize: '12px',
      fontWeight: 600,
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    },
    collapseButton: {
      padding: '4px',
      background: 'none',
      border: 'none',
      color: colors.textMuted,
      cursor: 'pointer',
      fontSize: '12px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeFiltersSection: {
      padding: '8px 12px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
      backgroundColor: colors.bgHover,
    },
    activeFiltersTitle: {
      fontSize: '10px',
      fontWeight: 600,
      color: colors.textMuted,
      marginBottom: '6px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeFilterTag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 6px',
      marginRight: '4px',
      marginBottom: '4px',
      fontSize: '11px',
      backgroundColor: colors.accentPrimary,
      color: '#fff',
      borderRadius: '3px',
    },
    activeFilterRemove: {
      cursor: 'pointer',
      opacity: 0.8,
      fontWeight: 'bold',
    },
    clearAllButton: {
      fontSize: '10px',
      color: colors.textMuted,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      textDecoration: 'underline',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 0',
    },
    fieldGroup: {
      marginBottom: '4px',
    },
    fieldHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    },
    fieldName: {
      fontSize: '12px',
      fontWeight: 500,
      color: colors.textSecondary,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    fieldArrow: {
      fontSize: '10px',
      color: colors.textMuted,
      transition: 'transform 0.15s',
    },
    fieldCount: {
      fontSize: '10px',
      color: colors.textMuted,
      backgroundColor: colors.bgTertiary,
      padding: '1px 5px',
      borderRadius: '8px',
    },
    valuesList: {
      padding: '0 8px 4px 20px',
    },
    valueItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 8px',
      marginBottom: '2px',
      fontSize: '11px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    },
    valueText: {
      color: colors.textPrimary,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '120px',
    },
    valueCount: {
      fontSize: '10px',
      color: colors.textMuted,
      marginLeft: '8px',
      flexShrink: 0,
    },
    loading: {
      padding: '20px',
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: '12px',
    },
    empty: {
      padding: '20px 12px',
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: '12px',
    },
    collapsedContent: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      transform: 'rotate(180deg)',
      fontSize: '11px',
      fontWeight: 600,
      color: colors.textMuted,
      padding: '12px 0',
      textAlign: 'center',
      letterSpacing: '1px',
    },
    searchContainer: {
      padding: '8px 10px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
    },
    searchInput: {
      width: '100%',
      padding: '6px 10px',
      fontSize: '11px',
      border: `1px solid ${colors.borderSecondary}`,
      borderRadius: '4px',
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      outline: 'none',
    },
    noResults: {
      padding: '16px 12px',
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: '11px',
    },
  };

  // Filter fields and values based on search query
  const filterFields = () => {
    if (!searchQuery.trim()) {
      return Object.entries(fields);
    }
    
    const query = searchQuery.toLowerCase();
    const filtered: [string, Record<string, number>][] = [];
    
    for (const [field, values] of Object.entries(fields)) {
      // Check if field name matches
      const fieldMatches = field.toLowerCase().includes(query) || 
                          formatFieldName(field).toLowerCase().includes(query);
      
      // Check if any value matches
      const matchingValues: Record<string, number> = {};
      for (const [value, count] of Object.entries(values)) {
        if (fieldMatches || value.toLowerCase().includes(query)) {
          matchingValues[value] = count;
        }
      }
      
      // Include field if it matches or has matching values
      if (Object.keys(matchingValues).length > 0) {
        filtered.push([field, fieldMatches ? values : matchingValues]);
      }
    }
    
    return filtered;
  };

  if (collapsed) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            style={styles.collapseButton}
            onClick={onToggleCollapsed}
            title="Expand fields panel (E)"
          >
            »
          </button>
        </div>
        <div style={styles.collapsedContent}>FIELDS</div>
      </div>
    );
  }

  const fieldEntries = filterFields();
  const hasFields = Object.keys(fields).length > 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Fields</span>
        <button
          style={styles.collapseButton}
          onClick={onToggleCollapsed}
          title="Collapse fields panel (E)"
        >
          «
        </button>
      </div>

      {/* Search Input */}
      {hasFields && !isLoading && (
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      )}

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div style={styles.activeFiltersSection}>
          <div style={styles.activeFiltersTitle}>
            <span>Active Filters</span>
            <button style={styles.clearAllButton} onClick={onClearAllFilters}>
              Clear All
            </button>
          </div>
          <div>
            {activeFilters.map((filter, i) => (
              <span key={i} style={styles.activeFilterTag}>
                {filter.field}={filter.value}
                <span
                  style={styles.activeFilterRemove}
                  onClick={() => onClearFilter(filter.field, filter.value)}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.loading}>Extracting fields...</div>
        ) : !hasFields ? (
          <div style={styles.empty}>
            No fields extracted.
            <br />
            <span style={{ fontSize: '10px', marginTop: '8px', display: 'block' }}>
              Fields are detected from key=value patterns in logs.
            </span>
          </div>
        ) : fieldEntries.length === 0 ? (
          <div style={styles.noResults}>
            No fields match "{searchQuery}"
          </div>
        ) : (
          fieldEntries.map(([field, values]) => {
            // Auto-expand when there's a search query, otherwise use manual expansion
            const isExpanded = searchQuery.trim() ? true : expandedFields.has(field);
            const valueEntries = Object.entries(values);
            const totalCount = valueEntries.reduce((sum, [, count]) => sum + count, 0);

            return (
              <div key={field} style={styles.fieldGroup}>
                <div
                  style={{
                    ...styles.fieldHeader,
                    backgroundColor: isExpanded ? colors.bgHover : 'transparent',
                  }}
                  onClick={() => toggleField(field)}
                >
                  <span style={styles.fieldName}>
                    <span
                      style={{
                        ...styles.fieldArrow,
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                      }}
                    >
                      ▶
                    </span>
                    {formatFieldName(field)}
                  </span>
                  <span style={styles.fieldCount}>{totalCount}</span>
                </div>

                {isExpanded && (
                  <div style={styles.valuesList}>
                    {valueEntries.map(([value, count]) => {
                      const isActive = isValueActive(field, value);
                      const query = searchQuery.toLowerCase();
                      const valueMatches = query && value.toLowerCase().includes(query);
                      return (
                        <div
                          key={value}
                          style={{
                            ...styles.valueItem,
                            backgroundColor: isActive
                              ? colors.accentPrimary + '30'
                              : valueMatches
                              ? colors.searchHighlight + '40'
                              : 'transparent',
                            border: isActive
                              ? `1px solid ${colors.accentPrimary}`
                              : '1px solid transparent',
                          }}
                          onClick={() => onFieldClick(field, value)}
                          title={`Filter by ${field}=${value}`}
                        >
                          <span style={styles.valueText}>{value}</span>
                          <span style={styles.valueCount}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
