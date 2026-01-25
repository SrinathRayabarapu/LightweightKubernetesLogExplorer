/**
 * Log table component displaying log entries.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { LogEntry } from '../api/client';
import { TimeNavigation } from './TimeNavigation';
import { useTheme } from '../context/ThemeContext';
import { parseSearchQuery } from '../utils/searchParser';

interface LogTableProps {
  logs: LogEntry[];
  allLogs?: LogEntry[]; // All unfiltered logs for complete download
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
  onAddToSearch?: (text: string) => void; // Callback to add selected text to search
}

// Font size constants
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;
const DEFAULT_FONT_SIZE = 14;
const FONT_SIZE_STORAGE_KEY = 'logTableFontSize';

export function LogTable({ logs, allLogs, total, hasMore, isLoading, filteredCount = 0, filterPatterns = [], filtersEnabled = true, onToggleFilters, searchQuery = '', onLoadMore, onTimeNavigate, onAddToSearch }: LogTableProps) {
  const { theme } = useTheme();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [hoveredCopyButton, setHoveredCopyButton] = useState<number | null>(null);
  const [hoveredChatGptButton, setHoveredChatGptButton] = useState<number | null>(null);
  const [showFilterTooltip, setShowFilterTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  
  // Text selection state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /**
   * Export logs to Excel file.
   * @param logsToExport - Array of log entries to export
   * @param filename - Name for the downloaded file
   */
  const exportToExcel = (logsToExport: LogEntry[], filename: string) => {
    if (logsToExport.length === 0) {
      alert('No logs to download');
      return;
    }

    // Transform logs to Excel-friendly format
    const excelData = logsToExport.map(log => ({
      'Timestamp': new Date(log.timestamp).toISOString(),
      'Environment': log.env,
      'Namespace': log.namespace,
      'Service': log.service,
      'Pod': log.pod,
      'Container': log.container,
      'Message': log.message,
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');

    // Auto-size columns
    const columnWidths = [
      { wch: 25 },  // Timestamp
      { wch: 12 },  // Environment
      { wch: 15 },  // Namespace
      { wch: 35 },  // Service
      { wch: 50 },  // Pod
      { wch: 30 },  // Container
      { wch: 100 }, // Message
    ];
    worksheet['!cols'] = columnWidths;

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    setShowDownloadDropdown(false);
  };

  /**
   * Download filtered logs (currently displayed logs).
   */
  const handleDownloadFilteredLogs = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const podName = logs[0]?.pod || 'logs';
    const filename = `filtered_logs_${podName}_${timestamp}`;
    exportToExcel(logs, filename);
  };

  /**
   * Download all logs for the current POD.
   */
  const handleDownloadAllLogs = () => {
    const logsToDownload = allLogs || logs;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const podName = logsToDownload[0]?.pod || 'logs';
    const filename = `all_logs_${podName}_${timestamp}`;
    exportToExcel(logsToDownload, filename);
  };

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown]);

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
   * Open AI service with the log message for analysis.
   * Uses Perplexity AI which supports URL-based queries for instant analysis.
   */
  const handleAnalyzeWithAI = async (log: LogEntry) => {
    // Create a concise prompt for AI analysis
    // Keep it focused to work well with URL length limits
    const logContext = `[${log.service}/${log.pod}] ${log.message}`;
    
    // Truncate if too long (URL limit is ~2000 chars, keep prompt under 1500)
    const maxLength = 1500;
    const truncatedLog = logContext.length > maxLength 
      ? logContext.substring(0, maxLength) + '...[truncated]'
      : logContext;
    
    const prompt = `Analyze this Kubernetes log entry. Explain what it means and if there's an error/warning, suggest causes and solutions:\n\n${truncatedLog}`;
    
    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Open Perplexity AI with the query (supports URL-based queries)
    const aiUrl = `https://www.perplexity.ai/search?q=${encodedPrompt}`;
    
    // Also copy the full log to clipboard in case user wants to use elsewhere
    try {
      const fullPrompt = `Analyze this Kubernetes log entry and help me understand what it means. If there's an error or warning, suggest possible causes and solutions:

Service: ${log.service}
Pod: ${log.pod}
Container: ${log.container}
Timestamp: ${formatTimestamp(log.timestamp)}

Log Message:
${log.message}`;
      await navigator.clipboard.writeText(fullPrompt);
    } catch {
      // Continue even if clipboard fails
    }

    // Open Perplexity AI in a new tab with the query
    window.open(aiUrl, '_blank');
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
   * Handle text selection in log messages.
   */
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // Clear selection popup if no selection
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelectedText('');
          setSelectionPosition(null);
        }, 200);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();

      // Only show popup if text is selected and it's within a log message
      if (selectedText.length > 0 && selectedText.length < 500) {
        // Check if selection is within a log message (pre element)
        const container = range.commonAncestorContainer;
        let preElement: HTMLElement | null = null;
        
        if (container.nodeType === Node.TEXT_NODE) {
          preElement = container.parentElement?.closest('pre') as HTMLElement | null;
        } else if (container.nodeType === Node.ELEMENT_NODE) {
          preElement = (container as HTMLElement).closest('pre') as HTMLElement | null;
        }

        if (preElement) {
          // Get position relative to viewport
          const rect = range.getBoundingClientRect();
          setSelectedText(selectedText);
          setSelectionPosition({
            top: rect.top - 40, // Position above selection
            left: rect.left + rect.width / 2, // Center horizontally
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle adding selected text to search.
   */
  const handleAddSelectedToSearch = () => {
    if (selectedText && onAddToSearch) {
      onAddToSearch(selectedText);
      setSelectedText('');
      setSelectionPosition(null);
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

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
   * Supports multiple terms from parsed search query (AND/OR operations).
   * Returns JSX elements with highlighted spans for all matching terms.
   */
  const highlightSearchMatches = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return (text: string) => text;
    }

    // Parse the search query to get all terms
    const parsed = parseSearchQuery(searchQuery);
    if (parsed.terms.length === 0) {
      return (text: string) => text;
    }

    // Create regex patterns for each term (case-insensitive)
    const patterns = parsed.terms.map(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(${escaped})`, 'gi');
    });

    return (text: string): React.ReactNode => {
      // Build an array of all matches with their positions
      interface Match {
        start: number;
        end: number;
        text: string;
      }
      
      const matches: Match[] = [];
      
      // Find all matches for each pattern
      patterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });
        }
      });

      if (matches.length === 0) {
        return text; // No matches found
      }

      // Sort matches by position
      matches.sort((a, b) => a.start - b.start);

      // Merge overlapping matches
      const mergedMatches: Match[] = [];
      for (const match of matches) {
        const lastMatch = mergedMatches[mergedMatches.length - 1];
        if (lastMatch && match.start <= lastMatch.end) {
          // Overlapping or adjacent - merge them
          lastMatch.end = Math.max(lastMatch.end, match.end);
          lastMatch.text = text.substring(lastMatch.start, lastMatch.end);
        } else {
          // New match
          mergedMatches.push({ ...match });
        }
      }

      // Build the highlighted text
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      mergedMatches.forEach((match, index) => {
        // Add text before match
        if (match.start > lastIndex) {
          parts.push(text.substring(lastIndex, match.start));
        }

        // Add highlighted match
        parts.push(
          <mark
            key={`match-${index}`}
            style={{
              backgroundColor: theme.colors.searchHighlight,
              color: theme.colors.searchHighlightText,
              padding: '1px 2px',
              borderRadius: '2px',
              fontWeight: 600,
            }}
          >
            {match.text}
          </mark>
        );

        lastIndex = match.end;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return <>{parts}</>;
    };
  }, [searchQuery, theme.colors.searchHighlight, theme.colors.searchHighlightText]);

  // Show loading state when fetching (whether or not we have logs)
  if (isLoading && logs.length === 0) {
    return (
      <div style={styles.loading}>
        <span style={styles.spinner}>⟳</span>
        <span>Loading logs...</span>
      </div>
    );
  }

  // Show empty state only when NOT loading and no logs
  // This prevents the momentary "No logs" flash during pod changes
  if (!logs.length && !isLoading) {
    return <div style={styles.empty}>No logs found. Try fetching logs first.</div>;
  }
  
  // If we have no logs but are loading, show loading state
  if (!logs.length) {
    return (
      <div style={styles.loading}>
        <span style={styles.spinner}>⟳</span>
        <span>Fetching logs...</span>
      </div>
    );
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

        {/* Download Dropdown */}
        <div ref={downloadDropdownRef} style={styles.downloadContainer}>
          <button
            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            style={styles.downloadButton}
            title="Download logs as Excel"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ marginRight: '6px' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ marginLeft: '4px' }}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
          {showDownloadDropdown && (
            <div style={styles.downloadDropdown}>
              <button
                onClick={handleDownloadFilteredLogs}
                style={styles.downloadOption}
                title={`Download ${logs.length} filtered log entries`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <div style={styles.downloadOptionText}>
                  <span style={styles.downloadOptionTitle}>Download Filtered Logs</span>
                  <span style={styles.downloadOptionDesc}>{logs.length.toLocaleString()} entries (with current filters)</span>
                </div>
              </button>
              <button
                onClick={handleDownloadAllLogs}
                style={styles.downloadOption}
                title={`Download all ${(allLogs || logs).length} log entries`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <div style={styles.downloadOptionText}>
                  <span style={styles.downloadOptionTitle}>Download All Logs</span>
                  <span style={styles.downloadOptionDesc}>{(allLogs || logs).length.toLocaleString()} entries (complete POD logs)</span>
                </div>
              </button>
            </div>
          )}
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
                          onClick={() => handleAnalyzeWithAI(log)}
                          onMouseEnter={() => setHoveredChatGptButton(log.id)}
                          onMouseLeave={() => setHoveredChatGptButton(null)}
                          style={{
                            ...styles.actionButton,
                            ...styles.chatGptButton,
                            ...(hoveredChatGptButton === log.id ? styles.chatGptButtonHovered : {}),
                          }}
                          title="Analyze with AI (opens Perplexity with your log)"
                          type="button"
                        >
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            style={{ marginRight: '4px' }}
                          >
                            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
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

      {/* Floating Load More button */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          style={styles.loadMoreButton}
        >
          {isLoading ? '⟳ Loading...' : '↓ Load More'}
        </button>
      )}

      {/* Text Selection Popup */}
      {selectedText && selectionPosition && onAddToSearch && (
        <div
          style={{
            ...styles.selectionPopup,
            top: `${selectionPosition.top}px`,
            left: `${selectionPosition.left}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div style={styles.selectionPopupText}>
            "{selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"
          </div>
          <button
            onClick={handleAddSelectedToSearch}
            style={styles.selectionPopupButton}
            title="Add to search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add to Search
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
      padding: '8px 16px',
      borderBottom: `1px solid ${colors.borderPrimary}`,
      backgroundColor: colors.bgPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      position: 'relative' as const,
      zIndex: 100,
      overflow: 'visible' as const,
    },
    countContainer: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px',
    },
    countNumber: {
      fontSize: '18px',
      fontWeight: 600,
      color: colors.accentPrimary,
    },
    countLabel: {
      fontSize: '13px',
      color: colors.textSecondary,
    },
    countSubtext: {
      fontSize: '12px',
      color: colors.textMuted,
    },
    filteredCountContainer: {
      position: 'relative' as const,
      display: 'inline-block',
      zIndex: 10000,
    },
    filteredCount: {
      fontSize: '12px',
      color: colors.textMuted,
      fontStyle: 'italic' as const,
      cursor: 'help',
    },
    filterToggleButton: {
      padding: '3px 8px',
      fontSize: '11px',
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
      background: 'linear-gradient(135deg, #20b8cd 0%, #5436da 100%)',
      borderColor: '#20b8cd',
      color: '#ffffff',
    },
    chatGptButtonHovered: {
      background: 'linear-gradient(135deg, #5436da 0%, #20b8cd 100%)',
      borderColor: '#5436da',
      color: '#ffffff',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(84, 54, 218, 0.3)',
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
    loadMoreButton: {
      position: 'fixed' as const,
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 28px',
      fontSize: '14px',
      border: 'none',
      borderRadius: '24px',
      backgroundColor: colors.accentPrimary,
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 600,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'transform 0.2s, box-shadow 0.2s',
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
      gap: '4px',
      marginLeft: 'auto',
      padding: '2px 6px',
      backgroundColor: colors.bgSecondary,
      borderRadius: '4px',
      border: `1px solid ${colors.borderPrimary}`,
    },
    fontSizeLabel: {
      fontSize: '11px',
      color: colors.textMuted,
      fontWeight: 500,
    },
    fontSizeButton: {
      width: '22px',
      height: '22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 600,
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '3px',
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      transition: 'all 0.2s',
    },
    fontSizeValue: {
      fontSize: '11px',
      fontWeight: 600,
      color: colors.textPrimary,
      minWidth: '30px',
      textAlign: 'center' as const,
      cursor: 'pointer',
    },
    downloadContainer: {
      position: 'relative' as const,
      marginLeft: '6px',
    },
    downloadButton: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: 500,
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '4px',
      backgroundColor: colors.buttonBg,
      color: colors.buttonText,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    downloadDropdown: {
      position: 'absolute' as const,
      top: '100%',
      right: 0,
      marginTop: '6px',
      backgroundColor: colors.bgTertiary,
      border: `1px solid ${colors.borderSecondary}`,
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      minWidth: '280px',
      overflow: 'hidden',
    },
    downloadOption: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      width: '100%',
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      cursor: 'pointer',
      textAlign: 'left' as const,
      transition: 'background-color 0.2s',
      borderBottom: `1px solid ${colors.borderPrimary}`,
    },
    downloadOptionText: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2px',
    },
    downloadOptionTitle: {
      fontSize: '14px',
      fontWeight: 500,
      color: colors.textPrimary,
    },
    downloadOptionDesc: {
      fontSize: '12px',
      color: colors.textMuted,
    },
    selectionPopup: {
      position: 'fixed' as const,
      backgroundColor: colors.bgTertiary,
      border: `1px solid ${colors.borderSecondary}`,
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      zIndex: 10003, // Above everything
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      minWidth: '200px',
      maxWidth: '400px',
    },
    selectionPopupText: {
      fontSize: '13px',
      color: colors.textSecondary,
      fontStyle: 'italic' as const,
      wordBreak: 'break-word' as const,
      marginBottom: '4px',
    },
    selectionPopupButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '6px 12px',
      fontSize: '13px',
      fontWeight: 500,
      border: `1px solid ${colors.buttonBorder}`,
      borderRadius: '6px',
      backgroundColor: colors.accentPrimary,
      color: '#fff',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };
}
