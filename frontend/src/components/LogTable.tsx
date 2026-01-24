/**
 * Log table component displaying log entries.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { LogEntry } from '../api/client';
import { TimeNavigation } from './TimeNavigation';

interface LogTableProps {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  filteredCount?: number; // Number of logs excluded by filters
  filterPatterns?: string[]; // Patterns used for filtering
  searchQuery?: string; // Current search query for highlighting matches
  onLoadMore: () => void;
  onTimeNavigate: (timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => void;
}

export function LogTable({ logs, total, hasMore, isLoading, filteredCount = 0, filterPatterns = [], searchQuery = '', onLoadMore, onTimeNavigate }: LogTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [hoveredCopyButton, setHoveredCopyButton] = useState<number | null>(null);
  const [showFilterTooltip, setShowFilterTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    // Format: "Jan 15 10:30:45.123"
    const baseFormat = date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    // Add milliseconds
    const millis = date.getMilliseconds().toString().padStart(3, '0');
    return `${baseFormat}.${millis}`;
  };

  const handleTimestampClick = (timestamp: string, rowId: number) => {
    if (selectedTimestamp === timestamp) {
      setSelectedTimestamp(null);
    } else {
      setSelectedTimestamp(timestamp);
      setExpandedRow(rowId);
    }
  };

  /**
   * Copy log content to clipboard.
   */
  const handleCopyLog = async (log: LogEntry) => {
    // Format log content with all details
    const logContent = `[${formatTimestamp(log.timestamp)}] [${log.env}] [${log.namespace}] [${log.service}] [${log.pod}/${log.container}]\n${log.message}`;
    
    try {
      await navigator.clipboard.writeText(logContent);
      // Visual feedback could be added here (toast notification, etc.)
    } catch (error) {
      // Fallback for older browsers (if clipboard API is not available)
      try {
        const textArea = document.createElement('textarea');
        textArea.value = logContent;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        // eslint-disable-next-line deprecation/deprecation
        const success = document.execCommand('copy');
        textArea.remove();
        if (!success) {
          console.error('Failed to copy log: execCommand returned false');
        }
      } catch (fallbackError) {
        console.error('Failed to copy log:', fallbackError);
      }
    }
  };

  /**
   * Format JSON values in log messages.
   * Looks for JSON patterns and formats them for better readability.
   * Handles: requestPayload, responsePayload, and any JSON objects/arrays in the message.
   */
  const formatJsonInMessage = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Check if message contains payload keywords or JSON-like content
    if (!lowerMessage.includes('payload') && !message.includes('{') && !message.includes('[')) {
      return message;
    }
    
    try {
      let formattedMessage = message;
      
      // Pattern 1: Find "requestPayload" or "responsePayload" followed by = or : and a JSON string
      // Example: requestPayload={"key":"value"} or "requestPayload":{"key":"value"}
      const payloadPatterns = [
        /(requestPayload|responsePayload)\s*[=:]\s*/gi,
      ];
      
      for (const pattern of payloadPatterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(formattedMessage)) !== null) {
          const startOfValue = match.index + match[0].length;
          const remainingMessage = formattedMessage.substring(startOfValue);
          
          // Check if the value starts with { or [
          if (remainingMessage.startsWith('{') || remainingMessage.startsWith('[')) {
            const jsonResult = extractAndFormatJson(remainingMessage);
            if (jsonResult) {
              formattedMessage = 
                formattedMessage.substring(0, startOfValue) + 
                jsonResult.formatted + 
                formattedMessage.substring(startOfValue + jsonResult.originalLength);
              // Adjust pattern index due to replacement
              pattern.lastIndex = startOfValue + jsonResult.formatted.length;
            }
          }
          // Check if value is a quoted JSON string (escaped JSON)
          else if (remainingMessage.startsWith('"')) {
            // Find the end of the quoted string
            let endQuote = 1;
            let escaped = false;
            for (let i = 1; i < remainingMessage.length; i++) {
              if (escaped) {
                escaped = false;
                continue;
              }
              if (remainingMessage[i] === '\\') {
                escaped = true;
                continue;
              }
              if (remainingMessage[i] === '"') {
                endQuote = i;
                break;
              }
            }
            
            if (endQuote > 1) {
              // Extract the quoted string and try to parse it as JSON
              const quotedStr = remainingMessage.substring(1, endQuote);
              // Unescape the string
              try {
                const unescaped = JSON.parse('"' + quotedStr + '"');
                // Try to parse unescaped string as JSON
                const jsonObj = JSON.parse(unescaped);
                const formattedJson = JSON.stringify(jsonObj, null, 2);
                formattedMessage = 
                  formattedMessage.substring(0, startOfValue) + 
                  formattedJson + 
                  formattedMessage.substring(startOfValue + endQuote + 1);
                pattern.lastIndex = startOfValue + formattedJson.length;
              } catch {
                // Not valid JSON, continue
              }
            }
          }
        }
      }
      
      return formattedMessage;
    } catch {
      return message;
    }
  };
  
  /**
   * Extract and format a JSON object/array from the start of a string.
   * Returns the formatted JSON and its original length, or null if not valid JSON.
   */
  const extractAndFormatJson = (str: string): { formatted: string; originalLength: number } | null => {
    if (!str.startsWith('{') && !str.startsWith('[')) {
      return null;
    }
    
    // Find the end of JSON by counting balanced braces/brackets
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let jsonEnd = -1;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        
        // When braces and brackets are balanced, we've found the end
        if (braceCount === 0 && bracketCount === 0 && i > 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonEnd > 0) {
      const jsonStr = str.substring(0, jsonEnd);
      try {
        const jsonObj = JSON.parse(jsonStr);
        const formattedJson = JSON.stringify(jsonObj, null, 2);
        return { formatted: formattedJson, originalLength: jsonEnd };
      } catch {
        return null;
      }
    }
    
    return null;
  };

  /**
   * Detect log severity based on keywords in the message.
   * Returns 'error', 'warning', 'exception', or null.
   */
  const getLogSeverity = (message: string): 'error' | 'warning' | 'exception' | null => {
    const lowerMessage = message.toLowerCase();
    
    // Check for error keywords (highest priority)
    if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('err') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('failure')
    ) {
      return 'error';
    }
    
    // Check for exception keywords
    if (
      lowerMessage.includes('exception') ||
      lowerMessage.includes('throwable') ||
      lowerMessage.includes('stacktrace') ||
      lowerMessage.includes('stack trace')
    ) {
      return 'exception';
    }
    
    // Check for warning keywords
    if (
      lowerMessage.includes('warning') ||
      lowerMessage.includes('warn') ||
      lowerMessage.includes('deprecated')
    ) {
      return 'warning';
    }
    
    return null;
  };

  /**
   * Get style for log message based on severity.
   */
  const getMessageStyle = (severity: 'error' | 'warning' | 'exception' | null): React.CSSProperties => {
    const baseStyle = styles.message;
    
    switch (severity) {
      case 'error':
        return {
          ...baseStyle,
          fontSize: '15px', // +2 from base 13px for better visibility
          color: '#ff6b6b',
          fontWeight: 500,
        };
      case 'exception':
        return {
          ...baseStyle,
          fontSize: '15px', // +2 from base 13px for better visibility
          color: '#ff6b9d',
          fontWeight: 500,
        };
      case 'warning':
        return {
          ...baseStyle,
          fontSize: '15px', // +2 from base 13px for better visibility
          color: '#ffaa00',
          fontWeight: 500,
        };
      default:
        return baseStyle;
    }
  };

  /**
   * Calculate tooltip position based on container element position.
   */
  useEffect(() => {
    if (showFilterTooltip && filterContainerRef.current) {
      const rect = filterContainerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10, // Position above the element with gap
        left: rect.left + rect.width / 2, // Center horizontally
      });
    } else {
      setTooltipPosition(null);
    }
  }, [showFilterTooltip]);

  /**
   * Cleanup timeout on unmount.
   */
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle showing tooltip with delay prevention.
   */
  const handleShowTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowFilterTooltip(true);
  };

  /**
   * Handle hiding tooltip with small delay to allow mouse movement.
   */
  const handleHideTooltip = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowFilterTooltip(false);
    }, 100); // Small delay to allow mouse movement to tooltip
  };

  /**
   * Get row style based on severity for subtle background highlighting.
   */
  const getRowStyle = (severity: 'error' | 'warning' | 'exception' | null, isExpanded: boolean): React.CSSProperties => {
    const baseStyle = isExpanded ? styles.expandedRow : styles.tr;
    
    switch (severity) {
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: isExpanded ? '#3a2525' : '#2a1f1f',
          borderLeft: '3px solid #ff6b6b',
        };
      case 'exception':
        return {
          ...baseStyle,
          backgroundColor: isExpanded ? '#3a2528' : '#2a1f22',
          borderLeft: '3px solid #ff6b9d',
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: isExpanded ? '#3a2f1f' : '#2a241f',
          borderLeft: '3px solid #ffaa00',
        };
      default:
        return baseStyle;
    }
  };

  /**
   * Highlight search matches in text.
   * Returns JSX elements with highlighted spans for matches.
   */
  const highlightSearchMatches = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return (text: string) => text;
    }

    const query = searchQuery.trim();
    // Escape special regex characters in the search query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return (text: string): React.ReactNode => {
      const parts = text.split(regex);
      if (parts.length === 1) {
        return text; // No matches found
      }

      return parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark
              key={index}
              style={{
                backgroundColor: '#ffeb3b',
                color: '#000',
                padding: '1px 2px',
                borderRadius: '2px',
                fontWeight: 600,
              }}
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    };
  }, [searchQuery]);

  if (isLoading && logs.length === 0) {
    return (
      <div style={styles.loading}>
        <span style={styles.spinner}>⟳</span>
        <span>Loading logs...</span>
      </div>
    );
  }

  if (!logs.length) {
    return <div style={styles.empty}>No logs found. Try fetching logs first.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.countContainer}>
          <span style={styles.countNumber}>{logs.length.toLocaleString()}</span>
          <span style={styles.countLabel}>log lines</span>
        </div>
        {logs.length < total && (
          <span style={styles.countSubtext}>
            (of {total.toLocaleString()} total)
          </span>
        )}
        {filteredCount > 0 && (
          <>
            <div
              ref={filterContainerRef}
              style={styles.filteredCountContainer}
              onMouseEnter={handleShowTooltip}
              onMouseLeave={handleHideTooltip}
            >
              <span style={styles.filteredCount}>
                ({filteredCount} filtered)
              </span>
            </div>
            {showFilterTooltip && filterPatterns.length > 0 && tooltipPosition && (
              <div
                ref={tooltipRef}
                data-filter-tooltip
                style={{
                  ...styles.filterTooltip,
                  top: `${tooltipPosition.top}px`,
                  left: `${tooltipPosition.left}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                onMouseEnter={handleShowTooltip}
                onMouseLeave={handleHideTooltip}
              >
                <div style={styles.filterTooltipTitle}>Filtered Patterns:</div>
                <ul style={styles.filterTooltipList}>
                  {filterPatterns.map((pattern, index) => (
                    <li key={index} style={styles.filterTooltipItem}>
                      <code style={styles.filterTooltipCode}>{pattern}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {isLoading && logs.length > 0 && (
          <div style={styles.loadingIndicator}>
            <span style={styles.spinner}>⟳</span>
            <span style={styles.loadingText}>Refreshing...</span>
          </div>
        )}
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '175px' }}>Timestamp</th>
              <th style={{ ...styles.th, width: '180px' }}>Pod / Container</th>
              <th style={styles.th}>Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const severity = getLogSeverity(log.message);
              const isExpanded = expandedRow === log.id;
              
              return (
                <tr
                  key={log.id}
                  style={getRowStyle(severity, isExpanded)}
                >
                  <td style={styles.tdTimestamp}>
                    <div
                      onClick={() => handleTimestampClick(log.timestamp, log.id)}
                      style={{
                        ...styles.timestamp,
                        ...(selectedTimestamp === log.timestamp ? styles.timestampSelected : {}),
                      }}
                    >
                      {formatTimestamp(log.timestamp)}
                    </div>
                    {selectedTimestamp === log.timestamp && (
                      <TimeNavigation
                        timestamp={log.timestamp}
                        onNavigate={onTimeNavigate}
                      />
                    )}
                  </td>
                  <td style={styles.tdPod}>
                    <div style={styles.podName}>{log.pod}</div>
                    <div style={styles.containerName}>{log.container}</div>
                  </td>
                  <td style={styles.tdMessage}>
                    <div style={styles.messageWrapper}>
                      <div style={styles.messageContainer}>
                        <pre style={getMessageStyle(severity)}>{highlightSearchMatches(formatJsonInMessage(log.message))}</pre>
                      </div>
                      <button
                        onClick={() => handleCopyLog(log)}
                        onMouseEnter={() => setHoveredCopyButton(log.id)}
                        onMouseLeave={() => setHoveredCopyButton(null)}
                        style={{
                          ...styles.copyButton,
                          ...(hoveredCopyButton === log.id ? styles.copyButtonHovered : {}),
                        }}
                        title="Copy log content to clipboard"
                        type="button"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={styles.loadMore}>
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            style={styles.loadMoreButton}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 100,
    overflow: 'visible',
  },
  countContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  countNumber: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#4a9eff',
  },
  countLabel: {
    fontSize: '14px',
    color: '#aaa',
  },
  countSubtext: {
    fontSize: '12px',
    color: '#666',
  },
  filteredCountContainer: {
    position: 'relative',
    display: 'inline-block',
    zIndex: 10000,
  },
  filteredCount: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
    cursor: 'help',
  },
  filterTooltip: {
    position: 'fixed',
    backgroundColor: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '10px',
    minWidth: '220px',
    maxWidth: '320px',
    maxHeight: '220px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    zIndex: 10001,
    pointerEvents: 'auto',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
  },
  filterTooltipTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4a9eff',
    marginBottom: '8px',
    borderBottom: '1px solid #333',
    paddingBottom: '6px',
    flexShrink: 0,
  },
  filterTooltipList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    maxHeight: '170px',
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    paddingRight: '6px',
    // Custom scrollbar styling for better visibility
    scrollbarWidth: 'thin',
    scrollbarColor: '#444 #1a1a2e',
  },
  filterTooltipItem: {
    fontSize: '12px',
    color: '#ccc',
    marginBottom: '6px',
    paddingLeft: '8px',
    lineHeight: '1.4',
  },
  filterTooltipCode: {
    fontFamily: 'monospace',
    backgroundColor: '#252540',
    padding: '4px 6px',
    borderRadius: '3px',
    color: '#e0e0e0',
    fontSize: '11px',
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#888',
    backgroundColor: '#1f1f35',
    borderBottom: '1px solid #333',
    position: 'sticky',
    top: 0,
  },
  tr: {
    borderBottom: '1px solid #2a2a40',
  },
  expandedRow: {
    backgroundColor: '#252540',
  },
  tdTimestamp: {
    padding: '8px 12px',
    verticalAlign: 'top',
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#6cb6ff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  timestampSelected: {
    backgroundColor: '#3a3a5a',
    borderRadius: '3px',
    padding: '2px 4px',
    margin: '-2px -4px',
  },
  tdPod: {
    padding: '8px 12px',
    verticalAlign: 'top',
  },
  podName: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#e0e0e0',
    wordBreak: 'break-all',
  },
  containerName: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#888',
  },
  tdMessage: {
    padding: '8px 12px',
    verticalAlign: 'top',
  },
  messageWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  messageContainer: {
    flex: 1,
    maxHeight: '300px',
    overflow: 'auto',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
    padding: '4px 8px',
  },
  message: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#e0e0e0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  copyButton: {
    background: '#3a3a5a',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 8px',
    color: '#ccc',
    transition: 'all 0.2s',
    flexShrink: 0,
    alignSelf: 'flex-start',
    whiteSpace: 'nowrap',
  },
  copyButtonHovered: {
    background: '#4a4a6a',
    color: '#fff',
    borderColor: '#666',
  },
  loading: {
    padding: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#888',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  loadMore: {
    padding: '12px',
    textAlign: 'center',
    borderTop: '1px solid #333',
  },
  loadMoreButton: {
    padding: '8px 24px',
    fontSize: '13px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#4a9eff',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    fontSize: '14px',
  },
  loadingText: {
    color: '#888',
  },
};
