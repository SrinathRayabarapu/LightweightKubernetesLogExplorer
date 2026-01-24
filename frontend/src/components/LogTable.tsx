/**
 * Log table component displaying log entries.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { LogEntry } from '../api/client';
import { TimeNavigation } from './TimeNavigation';
import { useTheme } from '../context/ThemeContext';

interface LogTableProps {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  filteredCount?: number; // Number of logs excluded by filters
  filterPatterns?: string[]; // Patterns used for filtering
  filtersEnabled?: boolean; // Whether log filters are currently applied
  onToggleFilters?: () => void; // Callback to toggle log filters on/off
  searchQuery?: string; // Current search query for highlighting matches
  onLoadMore: () => void;
  onTimeNavigate: (timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => void;
}

// Font size constants
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;
const DEFAULT_FONT_SIZE = 14;
const FONT_SIZE_STORAGE_KEY = 'logTableFontSize';

export function LogTable({ logs, total, hasMore, isLoading, filteredCount = 0, filterPatterns = [], filtersEnabled = true, onToggleFilters, searchQuery = '', onLoadMore, onTimeNavigate }: LogTableProps) {
  const { theme } = useTheme();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [hoveredCopyButton, setHoveredCopyButton] = useState<number | null>(null);
  const [hoveredChatGptButton, setHoveredChatGptButton] = useState<number | null>(null);
  const [showFilterTooltip, setShowFilterTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [showHeaders, setShowHeaders] = useState(true);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Font size state with localStorage persistence
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
        return parsed;
      }
    }
    return DEFAULT_FONT_SIZE;
  });

  // Persist font size to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
  }, [fontSize]);

  // Font size handlers
  const handleIncreaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 1, MAX_FONT_SIZE));
  };

  const handleDecreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 1, MIN_FONT_SIZE));
  };

  const handleResetFontSize = () => {
    setFontSize(DEFAULT_FONT_SIZE);
  };

  // Dynamic styles based on current theme
  const styles = getThemedStyles(theme.colors);

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
   * Open ChatGPT with the log message for analysis.
   * Copies a formatted prompt to clipboard and opens ChatGPT in a new tab.
   */
  const handleAnalyzeWithChatGpt = async (log: LogEntry) => {
    // Create a formatted prompt for ChatGPT
    const prompt = `Please analyze this log entry and help me understand what it means. If there's an error or warning, suggest possible causes and solutions:

Service: ${log.service}
Pod: ${log.pod}
Container: ${log.container}
Timestamp: ${formatTimestamp(log.timestamp)}

Log Message:
${log.message}`;

    // Copy the prompt to clipboard
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Fallback - still open ChatGPT even if copy fails
      console.warn('Could not copy to clipboard');
    }

    // Open ChatGPT in a new tab
    window.open('https://chat.openai.com/', '_blank');
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
   * Uses the current fontSize state for dynamic font sizing.
   */
  const getMessageStyle = (severity: 'error' | 'warning' | 'exception' | null): React.CSSProperties => {
    const baseStyle = {
      ...styles.message(fontSize),
      color: theme.colors.textPrimary,
    };
    
    switch (severity) {
      case 'error':
        return {
          ...baseStyle,
          color: theme.colors.error,
          fontWeight: 600,
        };
      case 'exception':
        return {
          ...baseStyle,
          color: theme.colors.exception,
          fontWeight: 600,
        };
      case 'warning':
        return {
          ...baseStyle,
          color: theme.colors.warning,
          fontWeight: 600,
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
   * Handle scroll events to show/hide headers.
   * Headers are visible only when scrolled to the top.
   */
  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    if (!tableWrapper) return;

    const handleScroll = () => {
      const isAtTop = tableWrapper.scrollTop === 0;
      setShowHeaders(isAtTop);
    };

    tableWrapper.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => {
      tableWrapper.removeEventListener('scroll', handleScroll);
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
    const baseStyle = {
      ...(isExpanded ? styles.expandedRow : styles.tr),
      borderBottomColor: theme.colors.borderPrimary,
      backgroundColor: isExpanded ? theme.colors.bgSelected : 'transparent',
    };
    
    switch (severity) {
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.errorBg,
          borderLeft: `3px solid ${theme.colors.error}`,
        };
      case 'exception':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.exceptionBg,
          borderLeft: `3px solid ${theme.colors.exception}`,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.warningBg,
          borderLeft: `3px solid ${theme.colors.warning}`,
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
                backgroundColor: theme.colors.searchHighlight,
                color: theme.colors.searchHighlightText,
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
            {onToggleFilters && (
              <button
                onClick={onToggleFilters}
                style={{
                  ...styles.filterToggleButton,
                  backgroundColor: filtersEnabled ? theme.colors.buttonBg : theme.colors.accentSecondary,
                  color: filtersEnabled ? theme.colors.textSecondary : '#fff',
                  borderColor: filtersEnabled ? theme.colors.buttonBorder : theme.colors.accentSecondary,
                }}
                title={filtersEnabled ? 'Show all logs including filtered' : 'Hide filtered logs'}
              >
                {filtersEnabled ? '👁 Show All' : '🚫 Filtering Off'}
              </button>
            )}
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
        
        {/* Font Size Controls */}
        <div style={styles.fontSizeControls}>
          <span style={styles.fontSizeLabel}>Font:</span>
          <button
            onClick={handleDecreaseFontSize}
            disabled={fontSize <= MIN_FONT_SIZE}
            style={{
              ...styles.fontSizeButton,
              opacity: fontSize <= MIN_FONT_SIZE ? 0.4 : 1,
              cursor: fontSize <= MIN_FONT_SIZE ? 'not-allowed' : 'pointer',
            }}
            title="Decrease font size"
          >
            −
          </button>
          <span 
            style={styles.fontSizeValue}
            onClick={handleResetFontSize}
            title="Click to reset to default (14px)"
          >
            {fontSize}px
          </span>
          <button
            onClick={handleIncreaseFontSize}
            disabled={fontSize >= MAX_FONT_SIZE}
            style={{
              ...styles.fontSizeButton,
              opacity: fontSize >= MAX_FONT_SIZE ? 0.4 : 1,
              cursor: fontSize >= MAX_FONT_SIZE ? 'not-allowed' : 'pointer',
            }}
            title="Increase font size"
          >
            +
          </button>
        </div>
      </div>

      <div ref={tableWrapperRef} style={styles.tableWrapper}>
        <table style={styles.table}>
          {showHeaders && (
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '175px', minWidth: '175px', maxWidth: '175px', paddingRight: '24px' }}>Timestamp</th>
                <th style={{ ...styles.th, width: '250px', minWidth: '250px', maxWidth: '250px', paddingLeft: '24px' }}>Pod</th>
                <th style={styles.th}>Message</th>
              </tr>
            </thead>
          )}
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
                        ...styles.timestamp(fontSize),
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
                    <div style={styles.podName(fontSize)}>{log.pod}</div>
                  </td>
                  <td style={styles.tdMessage}>
                    <div style={styles.messageWrapper}>
                      <div style={styles.messageContainer}>
                        <pre style={getMessageStyle(severity)}>{highlightSearchMatches(formatJsonInMessage(log.message))}</pre>
                      </div>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleCopyLog(log)}
                          onMouseEnter={() => setHoveredCopyButton(log.id)}
                          onMouseLeave={() => setHoveredCopyButton(null)}
                          style={{
                            ...styles.actionButton,
                            ...(hoveredCopyButton === log.id ? styles.actionButtonHovered : {}),
                          }}
                          title="Copy log content to clipboard"
                          type="button"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleAnalyzeWithChatGpt(log)}
                          onMouseEnter={() => setHoveredChatGptButton(log.id)}
                          onMouseLeave={() => setHoveredChatGptButton(null)}
                          style={{
                            ...styles.actionButton,
                            ...styles.chatGptButton,
                            ...(hoveredChatGptButton === log.id ? styles.chatGptButtonHovered : {}),
                          }}
                          title="Analyze with ChatGPT (copies prompt to clipboard)"
                          type="button"
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            style={{ marginRight: '4px' }}
                          >
                            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.4850 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                          </svg>
                          Ask AI
                        </button>
                      </div>
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

/**
 * Generate themed styles for LogTable component.
 */
function getThemedStyles(colors: import('../config/themes').Theme['colors']) {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      overflow: 'hidden',
    },
    header: {
      padding: '14px 20px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
      backgroundColor: colors.bgPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      position: 'relative' as const,
      zIndex: 100,
      overflow: 'visible' as const,
    },
    countContainer: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
    },
    countNumber: {
      fontSize: '24px',
      fontWeight: 600,
      color: colors.accentPrimary,
    },
    countLabel: {
      fontSize: '16px',
      color: colors.textSecondary,
    },
    countSubtext: {
      fontSize: '14px',
      color: colors.textMuted,
    },
    filteredCountContainer: {
      position: 'relative' as const,
      display: 'inline-block',
      zIndex: 10000,
    },
    filteredCount: {
      fontSize: '14px',
      color: colors.textMuted,
      fontStyle: 'italic' as const,
      cursor: 'help',
    },
    filterToggleButton: {
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: 500,
      border: '1px solid',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap' as const,
    },
    filterTooltip: {
      position: 'fixed' as const,
      backgroundColor: colors.bgTertiary,
      border: `1px solid ${colors.borderSecondary}`,
      borderRadius: '8px',
      padding: '14px',
      minWidth: '260px',
      maxWidth: '360px',
      maxHeight: '260px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
      zIndex: 10001,
      pointerEvents: 'auto' as const,
      cursor: 'default',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    filterTooltipTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: colors.accentPrimary,
      marginBottom: '10px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
      paddingBottom: '8px',
      flexShrink: 0,
    },
    filterTooltipList: {
      margin: 0,
      padding: 0,
      listStyle: 'none' as const,
      maxHeight: '200px',
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      flex: 1,
      paddingRight: '8px',
      scrollbarWidth: 'thin' as const,
      scrollbarColor: `${colors.borderSecondary} ${colors.bgPrimary}`,
    },
    filterTooltipItem: {
      fontSize: '14px',
      color: colors.textSecondary,
      marginBottom: '8px',
      paddingLeft: '10px',
      lineHeight: '1.5',
    },
    filterTooltipCode: {
      fontFamily: 'var(--font-family-mono, monospace)',
      backgroundColor: colors.bgHover,
      padding: '5px 8px',
      borderRadius: '4px',
      color: colors.textPrimary,
      fontSize: '13px',
    },
    tableWrapper: {
      flex: 1,
      overflow: 'auto' as const,
    },
    table: {
      width: '100%',
      tableLayout: 'fixed' as const,
      borderCollapse: 'collapse' as const,
      fontSize: '14px',
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left' as const,
      fontWeight: 600,
      fontSize: '13px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: colors.textMuted,
      backgroundColor: colors.bgSecondary,
      borderBottom: `1px solid ${colors.borderPrimary}`,
    },
    tr: {
      borderBottom: `1px solid ${colors.borderPrimary}`,
    },
    expandedRow: {
      backgroundColor: colors.bgHover,
    },
    tdTimestamp: {
      padding: '10px 16px 10px 16px',
      paddingRight: '24px',
      verticalAlign: 'top' as const,
      width: '175px',
      minWidth: '175px',
      maxWidth: '175px',
    },
    timestamp: (fontSize: number) => ({
      fontFamily: 'var(--font-family-mono, monospace)',
      fontSize: `${fontSize}px`,
      color: colors.timestamp,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    }),
    timestampSelected: {
      backgroundColor: colors.bgSelected,
      borderRadius: '4px',
      padding: '3px 6px',
      margin: '-3px -6px',
    },
    tdPod: {
      padding: '10px 16px',
      paddingLeft: '24px',
      verticalAlign: 'top' as const,
      width: '250px',
      minWidth: '250px',
      maxWidth: '250px',
    },
    podName: (fontSize: number) => ({
      fontFamily: 'var(--font-family-mono, monospace)',
      fontSize: `${fontSize}px`,
      color: colors.podName,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }),
    containerName: {
      fontFamily: 'var(--font-family-mono, monospace)',
      fontSize: '13px',
      color: colors.containerName,
      marginTop: '2px',
    },
    tdMessage: {
      padding: '10px 16px',
      verticalAlign: 'top' as const,
    },
    messageWrapper: {
      position: 'relative' as const,
      width: '100%',
    },
    messageContainer: {
      width: '100%',
      maxHeight: '300px',
      overflow: 'auto' as const,
      backgroundColor: colors.bgPrimary,
      borderRadius: '6px',
      padding: '8px 12px',
    },
    message: (fontSize: number) => ({
      margin: 0,
      fontFamily: 'var(--font-family-mono, monospace)',
      fontSize: `${fontSize}px`,
      color: colors.textPrimary,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
      lineHeight: '1.5',
    }),
    actionButtons: {
      position: 'absolute' as const,
      top: '8px',
      right: '8px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
      zIndex: 5,
    },
    actionButton: {
      background: colors.buttonBg,
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      padding: '5px 10px',
      color: colors.buttonText,
      transition: 'all 0.2s',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonHovered: {
      background: colors.buttonBgHover,
      color: colors.textAccent,
      borderColor: colors.borderSecondary,
    },
    chatGptButton: {
      background: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
      borderColor: '#10a37f',
      color: '#ffffff',
    },
    chatGptButtonHovered: {
      background: 'linear-gradient(135deg, #1a7f64 0%, #10a37f 100%)',
      borderColor: '#0d8a6f',
      color: '#ffffff',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(16, 163, 127, 0.3)',
    },
    loading: {
      padding: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      color: colors.textMuted,
      fontSize: '16px',
    },
    empty: {
      padding: '50px',
      textAlign: 'center' as const,
      color: colors.textMuted,
      fontSize: '16px',
    },
    loadMore: {
      padding: '16px',
      textAlign: 'center' as const,
      borderTop: `1px solid ${colors.borderPrimary}`,
    },
    loadMoreButton: {
      padding: '10px 28px',
      fontSize: '15px',
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '6px',
      backgroundColor: colors.buttonBg,
      color: colors.textPrimary,
      cursor: 'pointer',
      fontWeight: 500,
    },
    loadingIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginLeft: 'auto',
      fontSize: '14px',
      color: colors.accentPrimary,
    },
    spinner: {
      display: 'inline-block',
      animation: 'spin 1s linear infinite',
      fontSize: '16px',
    },
    loadingText: {
      color: colors.textMuted,
    },
    fontSizeControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginLeft: 'auto',
      padding: '4px 8px',
      backgroundColor: colors.bgSecondary,
      borderRadius: '6px',
      border: `1px solid ${colors.borderPrimary}`,
    },
    fontSizeLabel: {
      fontSize: '12px',
      color: colors.textMuted,
      fontWeight: 500,
    },
    fontSizeButton: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 600,
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '4px',
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      transition: 'all 0.2s',
    },
    fontSizeValue: {
      fontSize: '13px',
      fontWeight: 600,
      color: colors.textPrimary,
      minWidth: '36px',
      textAlign: 'center' as const,
      cursor: 'pointer',
    },
  };
}
