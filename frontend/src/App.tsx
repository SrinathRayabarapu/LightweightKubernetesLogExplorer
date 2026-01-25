/**
 * Main application component for K8s Log Explorer.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EnvSelector } from './components/EnvSelector';
import { SearchBar, SearchBarRef } from './components/SearchBar';
import { LogTable } from './components/LogTable';
import { RefreshIndicator } from './components/RefreshIndicator';
import { SearchableSelect } from './components/SearchableSelect';
import { PodSelector } from './components/PodSelector';
import { ThemeSelector } from './components/ThemeSelector';
import { TimePresets, getPresetIdForMinutes } from './components/TimePresets';
import { FieldsPanel } from './components/FieldsPanel';
import { useTheme } from './context/ThemeContext';
import {
  useLogs,
  useSearchLogs,
  useLogsByTime,
  useFetchLogs,
  useStorageStats,
  useServices,
  usePods,
  useExtractedFields,
} from './hooks/useLogs';
import { EnvConfig } from './api/client';
import { filterLogs, logFilterConfig } from './config/logFilters';

type ViewMode = 'logs' | 'search' | 'time-window';

// Fixed namespace for all environments
const FIXED_NAMESPACE = 'jio-t2r-ms';

export default function App() {
  // Theme
  const { theme, setTheme } = useTheme();
  
  // Ref for search bar to focus via keyboard shortcut
  const searchBarRef = useRef<SearchBarRef>(null);
  
  // State for keyboard shortcuts help
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Selection state
  const [selectedEnv, setSelectedEnv] = useState('');
  const namespace = FIXED_NAMESPACE; // Fixed namespace - not user-selectable
  const [service, setService] = useState('');
  const [selectedPod, setSelectedPod] = useState('');
  const [showFilters, setShowFilters] = useState(true); // Toggle filter visibility
  const [hoveredToggleButton, setHoveredToggleButton] = useState(false);
  const [applyLogFilters, setApplyLogFilters] = useState(true); // Toggle log exclusion filters

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Field filter state
  const [fieldFilters, setFieldFilters] = useState<{ field: string; value: string }[]>([]);
  const [showFieldsPanel, setShowFieldsPanel] = useState(true);

  // Time navigation state
  const [timeWindow, setTimeWindow] = useState<{
    timestamp: string;
    minutes: number;
    direction: 'before' | 'after' | 'around';
  } | null>(null);
  const [activeTimePreset, setActiveTimePreset] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('logs');

  // Pagination - default 1000 logs per page
  // All logs are fetched from K8s and stored, UI displays in batches
  const [limit] = useState(1000);
  const [offset, setOffset] = useState(0);

  // Auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300); // 5 minutes

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Handle Escape - works even when typing
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        // Blur active element to exit input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }
      
      // Other shortcuts only work when not typing
      if (isTyping) return;
      
      // / or Ctrl+K - Focus search bar
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        searchBarRef.current?.focus();
        return;
      }
      
      // R - Refresh logs
      if (e.key === 'r' || e.key === 'R') {
        if (selectedEnv && namespace && service && selectedPod) {
          fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod, fetchAll: true });
        }
        return;
      }
      
      // T - Toggle theme (dark/light)
      if (e.key === 't' || e.key === 'T') {
        // Toggle between classicDark and daylight
        // Light themes have lighter bgPrimary (check if it starts with higher hex value)
        const isLightTheme = ['daylight', 'arctic', 'paper', 'mint', 'rose', 'sky', 'sand', 'lavenderLight', 'flatly', 'united'].includes(theme.id);
        const newThemeId = isLightTheme ? 'classicDark' : 'daylight';
        setTheme(newThemeId);
        return;
      }
      
      // F - Toggle filters visibility
      if (e.key === 'f' || e.key === 'F') {
        setShowFilters(prev => !prev);
        return;
      }
      
      // E - Toggle fields panel
      if (e.key === 'e' || e.key === 'E') {
        setShowFieldsPanel(prev => !prev);
        return;
      }
      
      // ? - Show keyboard shortcuts help
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEnv, namespace, service, selectedPod, theme.id, setTheme]);

  // Queries
  const logsQuery = useLogs({
    env: selectedEnv,
    namespace: namespace || undefined,
    service: service || undefined,
    pod: selectedPod || undefined,
    limit,
    offset,
    enabled: viewMode === 'logs' && !!selectedEnv && !!selectedPod,
  });

  const searchLogsQuery = useSearchLogs({
    env: selectedEnv,
    query: activeSearch,
    namespace: namespace || undefined,
    service: service || undefined,
    pod: selectedPod || undefined,
    limit,
    enabled: viewMode === 'search' && !!selectedEnv && !!activeSearch && !!selectedPod,
  });

  const timeWindowQuery = useLogsByTime({
    env: selectedEnv,
    baseTimestamp: timeWindow?.timestamp || '',
    windowMinutes: timeWindow?.minutes || 5,
    direction: timeWindow?.direction || 'around',
    namespace: namespace || undefined,
    service: service || undefined,
    limit,
    enabled: viewMode === 'time-window' && !!selectedEnv && !!timeWindow,
  });

  // Services query uses fixed namespace
  const servicesQuery = useServices(selectedEnv, FIXED_NAMESPACE, true);
  
  // Pods query - fetch pods when service is selected
  const podsQuery = usePods(selectedEnv, FIXED_NAMESPACE, service);

  const fetchLogsMutation = useFetchLogs();
  const storageStats = useStorageStats();
  const queryClient = useQueryClient();

  // Extracted fields for field filtering
  const extractedFieldsQuery = useExtractedFields({
    env: selectedEnv,
    namespace: namespace,
    service: service,
    pod: selectedPod,
    enabled: !!selectedEnv && !!selectedPod,
  });

  // Refetch pods when service changes
  useEffect(() => {
    if (selectedEnv && service) {
      // Invalidate and refetch pods query when service changes
      queryClient.invalidateQueries({ queryKey: ['pods', selectedEnv, FIXED_NAMESPACE, service] });
      queryClient.refetchQueries({ queryKey: ['pods', selectedEnv, FIXED_NAMESPACE, service] });
    }
  }, [selectedEnv, service, queryClient]);

  // Production warning
  const handleEnvChange = useCallback((env: string, _config: EnvConfig | null) => {
    if (env === 'prod') {
      const confirmed = window.confirm(
        '⚠️ WARNING: You are about to view PRODUCTION logs.\n\nAre you sure you want to continue?'
      );
      if (!confirmed) return;
    }

    setSelectedEnv(env);
    // Namespace is fixed to FIXED_NAMESPACE, no need to set
    setService('');
    setSelectedPod('');
    setOffset(0);
    setViewMode('logs');
    setActiveSearch('');
    setSearchQuery('');
    setTimeWindow(null);
    setActiveTimePreset(null);
    setFieldFilters([]);
  }, []);

  // Search handler
  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // If there's a search query, activate search mode
      setActiveSearch(trimmedQuery);
      setViewMode('search');
      setTimeWindow(null);
      setActiveTimePreset(null);
      setOffset(0);
    } else {
      // If search bar is cleared, go back to default logs view
      setActiveSearch('');
      setViewMode('logs');
      setTimeWindow(null);
      setActiveTimePreset(null);
      setOffset(0);
    }
  }, [searchQuery]);

  // Handler to add selected text to search
  const handleAddToSearch = useCallback((selectedText: string) => {
    const trimmed = selectedText.trim();
    if (!trimmed) return;

    // If the selected text contains spaces, wrap it in quotes
    const textToAdd = trimmed.includes(' ') ? `"${trimmed}"` : trimmed;
    
    // Build the new query
    const currentQuery = searchQuery.trim();
    const newQuery = currentQuery ? `${currentQuery} AND ${textToAdd}` : textToAdd;
    
    // Update search query and trigger search
    setSearchQuery(newQuery);
    setActiveSearch(newQuery);
    setViewMode('search');
    setTimeWindow(null);
    setActiveTimePreset(null);
    setOffset(0);
  }, [searchQuery]);

  // Clear search and return to logs view
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearch('');
    setViewMode('logs');
    setOffset(0);
  }, []);

  // Time navigation handler (from clicking timestamps in logs)
  const handleTimeNavigate = useCallback((timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => {
    setTimeWindow({ timestamp, minutes: windowMinutes, direction });
    setViewMode('time-window');
    setActiveSearch('');
    setActiveTimePreset(null); // Clear preset when navigating from timestamp click
    setOffset(0);
  }, []);

  // Time preset handler (from TimePresets component)
  const handleTimePresetSelect = useCallback((timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => {
    setTimeWindow({ timestamp, minutes: windowMinutes, direction });
    setViewMode('time-window');
    setActiveSearch('');
    setActiveTimePreset(getPresetIdForMinutes(windowMinutes));
    setOffset(0);
  }, []);

  // Clear time preset and return to normal logs view
  const handleClearTimePreset = useCallback(() => {
    setTimeWindow(null);
    setActiveTimePreset(null);
    setViewMode('logs');
    setOffset(0);
  }, []);

  // Field filter handlers
  const handleFieldClick = useCallback((field: string, value: string) => {
    // Check if this filter is already active
    const exists = fieldFilters.some(f => f.field === field && f.value === value);
    if (exists) {
      // Remove it
      setFieldFilters(prev => prev.filter(f => !(f.field === field && f.value === value)));
    } else {
      // Add it - build search query with field=value
      const filterTerm = `${field}=${value}`;
      const newQuery = searchQuery.trim() 
        ? `${searchQuery.trim()} AND ${filterTerm}` 
        : filterTerm;
      
      setSearchQuery(newQuery);
      setActiveSearch(newQuery);
      setViewMode('search');
      setFieldFilters(prev => [...prev, { field, value }]);
      setOffset(0);
    }
  }, [searchQuery, fieldFilters]);

  const handleClearFieldFilter = useCallback((field: string, value: string) => {
    // Remove the filter from fieldFilters
    setFieldFilters(prev => prev.filter(f => !(f.field === field && f.value === value)));
    
    // Remove from search query
    let newQuery = searchQuery;
    
    // Try to remove "AND field=value" or "field=value AND" or just "field=value"
    newQuery = newQuery.replace(new RegExp(`\\s+AND\\s+${field}=${value}`, 'gi'), '');
    newQuery = newQuery.replace(new RegExp(`${field}=${value}\\s+AND\\s+`, 'gi'), '');
    newQuery = newQuery.replace(new RegExp(`^${field}=${value}$`, 'gi'), '');
    newQuery = newQuery.trim();
    
    setSearchQuery(newQuery);
    if (newQuery) {
      setActiveSearch(newQuery);
      setViewMode('search');
    } else {
      setActiveSearch('');
      setViewMode('logs');
    }
    setOffset(0);
  }, [searchQuery]);

  const handleClearAllFieldFilters = useCallback(() => {
    // Clear all field filters from search query
    let newQuery = searchQuery;
    fieldFilters.forEach(({ field, value }) => {
      newQuery = newQuery.replace(new RegExp(`\\s+AND\\s+${field}=${value}`, 'gi'), '');
      newQuery = newQuery.replace(new RegExp(`${field}=${value}\\s+AND\\s+`, 'gi'), '');
      newQuery = newQuery.replace(new RegExp(`^${field}=${value}$`, 'gi'), '');
    });
    newQuery = newQuery.trim();
    
    setFieldFilters([]);
    setSearchQuery(newQuery);
    if (newQuery) {
      setActiveSearch(newQuery);
      setViewMode('search');
    } else {
      setActiveSearch('');
      setViewMode('logs');
    }
    setOffset(0);
  }, [searchQuery, fieldFilters]);

  // Manual refresh handler - fetches ALL available logs
  const handleManualRefresh = useCallback(() => {
    if (selectedEnv && namespace && service && selectedPod) {
      // Always fetch ALL logs (no tail limit) to ensure complete log history
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod, fetchAll: true });
    }
  }, [selectedEnv, namespace, service, selectedPod, fetchLogsMutation]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    setOffset(prev => prev + limit);
  }, [limit]);

  // Auto-fetch ALL logs when pod is selected
  // This fetches complete log history from K8s and stores in database
  // UI displays first batch, "Load More" shows subsequent batches from stored data
  useEffect(() => {
    if (selectedEnv && namespace && service && selectedPod) {
      // Fetch ALL logs (no tail limit) to get complete log history
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod, fetchAll: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPod]); // Only trigger when pod changes

  // Auto-apply search when pod changes if there's text in search bar
  useEffect(() => {
    if (selectedPod && searchQuery.trim() && !activeSearch) {
      // If there's text in search bar and pod is selected, automatically activate search
      setActiveSearch(searchQuery.trim());
      setViewMode('search');
      setOffset(0);
    } else if (selectedPod && activeSearch && viewMode !== 'search') {
      // If there's an active search and pod changes, ensure search mode is active
      setViewMode('search');
      setOffset(0);
    }
  }, [selectedPod, searchQuery, activeSearch, viewMode]);

  // Auto-refresh effect - fetches ALL logs on each interval
  useEffect(() => {
    if (!autoRefreshEnabled || !selectedEnv || !namespace || !service || !selectedPod) return;

    const intervalId = setInterval(() => {
      // Always fetch ALL logs to ensure complete history
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod, fetchAll: true });
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, refreshInterval, selectedEnv, namespace, service, selectedPod, fetchLogsMutation]);

  // Determine current data source
  const currentQuery = viewMode === 'search' ? searchLogsQuery :
                       viewMode === 'time-window' ? timeWindowQuery :
                       logsQuery;

  // Apply log exclusion filters to remove unwanted logs (healthchecks, etc.)
  // User can toggle this off to see all logs including filtered ones
  const rawLogs = currentQuery.data?.logs || [];
  const logs = applyLogFilters ? filterLogs(rawLogs) : rawLogs;
  const total = currentQuery.data?.total || 0;
  const filteredCount = rawLogs.length - filterLogs(rawLogs).length; // Always calculate for display
  const hasMore = currentQuery.data?.hasMore || false;

  return (
    <div style={{
      ...styles.app,
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
    }}>
      {/* Header */}
      <header style={{
        ...styles.header,
        backgroundColor: theme.colors.bgSecondary,
        borderBottomColor: theme.colors.borderPrimary,
      }}>
        <h1 style={{ ...styles.title, color: theme.colors.textAccent }}>K8S Log Explorer</h1>
        <div style={styles.headerRight}>
          <button
            onClick={() => setShowShortcuts(true)}
            style={{
              background: 'none',
              border: `1px solid ${theme.colors.borderSecondary}`,
              borderRadius: '6px',
              padding: '6px 10px',
              color: theme.colors.textMuted,
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <ThemeSelector />
          {storageStats.data && (
            <div style={{ ...styles.storage, color: theme.colors.textMuted }}>
              Storage: {storageStats.data.current_size_mb.toFixed(1)} / {storageStats.data.max_size_mb} MB
              ({storageStats.data.usage_percent}%)
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            onMouseEnter={() => setHoveredToggleButton(true)}
            onMouseLeave={() => setHoveredToggleButton(false)}
            style={{
              ...styles.toggleFiltersButton,
              backgroundColor: theme.colors.buttonBg,
              borderColor: theme.colors.buttonBorder,
              color: theme.colors.buttonText,
              ...(hoveredToggleButton ? {
                backgroundColor: theme.colors.buttonBgHover,
                borderColor: theme.colors.borderSecondary,
                color: theme.colors.textAccent,
              } : {}),
            }}
            title={showFilters ? 'Hide filters' : 'Show filters'}
          >
            {showFilters ? '▼' : '▲'} Filters
          </button>
        </div>
      </header>

      {/* Controls */}
      {showFilters && (
      <div style={{
        ...styles.controls,
        backgroundColor: theme.colors.bgTertiary,
        borderBottomColor: theme.colors.borderPrimary,
      }}>
        <div style={styles.controlRow}>
          <EnvSelector
            value={selectedEnv}
            onChange={handleEnvChange}
          />

          {/* Namespace is fixed to jio-t2r-ms - display only */}
          <div style={styles.inputGroup}>
            <label style={{ ...styles.label, color: theme.colors.textMuted }}>Namespace</label>
            <div style={{
              ...styles.fixedValue,
              backgroundColor: theme.colors.bgPrimary,
              borderColor: theme.colors.borderPrimary,
              color: theme.colors.accentSecondary,
            }}>{FIXED_NAMESPACE}</div>
          </div>

          <SearchableSelect
            label="Service"
            options={servicesQuery.data?.services || []}
            value={service}
            onChange={(svc) => {
              setService(svc);
              setSelectedPod(''); // Clear pod when service changes
              setOffset(0);
            }}
            placeholder="Search services..."
            disabled={!selectedEnv}
          />

          <PodSelector
            pods={podsQuery.data?.pods || []}
            value={selectedPod}
            onChange={(pod) => {
              setSelectedPod(pod);
              setOffset(0);
              setFieldFilters([]);
            }}
            disabled={!service}
            isLoading={podsQuery.isLoading}
          />

          <RefreshIndicator
            isRefreshing={fetchLogsMutation.isPending}
            autoRefreshEnabled={autoRefreshEnabled}
            refreshInterval={refreshInterval}
            onManualRefresh={handleManualRefresh}
            onToggleAutoRefresh={setAutoRefreshEnabled}
            onIntervalChange={setRefreshInterval}
          />
        </div>

        {/* Search bar and time presets in single row */}
        <div style={{ ...styles.controlRow, alignItems: 'center' }}>
          <SearchBar
            ref={searchBarRef}
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            disabled={!selectedEnv}
          />
          
          {viewMode !== 'logs' && (
            <button 
              onClick={handleClearSearch} 
              style={{
                ...styles.clearButton,
                borderColor: theme.colors.borderSecondary,
                color: theme.colors.textSecondary,
              }}
            >
              Clear Filter
            </button>
          )}
          
          {/* Separator */}
          <div style={{ 
            width: '1px', 
            height: '28px', 
            backgroundColor: theme.colors.borderSecondary,
            margin: '0 4px',
          }} />
          
          {/* Time presets */}
          <TimePresets
            onSelectPreset={handleTimePresetSelect}
            activePreset={activeTimePreset}
            onClear={handleClearTimePreset}
            disabled={!selectedEnv || !selectedPod}
          />
        </div>

        {/* Time window indicator - only shown for time-based navigation */}
        {viewMode === 'time-window' && timeWindow && (
          <div style={{
            ...styles.viewIndicator,
            backgroundColor: theme.colors.bgHover,
            color: theme.colors.textSecondary,
          }}>
            {(() => {
              const baseTime = new Date(timeWindow.timestamp);
              const formatTime = (date: Date) => date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });
              
              let startTime: Date, endTime: Date, description: string;
              if (timeWindow.direction === 'before') {
                startTime = new Date(baseTime.getTime() - timeWindow.minutes * 60 * 1000);
                endTime = baseTime;
                description = `Last ${timeWindow.minutes >= 60 ? `${timeWindow.minutes / 60}h` : `${timeWindow.minutes}m`}`;
              } else if (timeWindow.direction === 'after') {
                startTime = baseTime;
                endTime = new Date(baseTime.getTime() + timeWindow.minutes * 60 * 1000);
                description = `${timeWindow.minutes}min after ${formatTime(baseTime)}`;
              } else {
                startTime = new Date(baseTime.getTime() - timeWindow.minutes * 60 * 1000);
                endTime = new Date(baseTime.getTime() + timeWindow.minutes * 60 * 1000);
                description = `±${timeWindow.minutes}min around ${formatTime(baseTime)}`;
              }
              
              return (
                <span>
                  Showing logs from <strong style={{ color: theme.colors.accentPrimary }}>{formatTime(startTime)}</strong> to <strong style={{ color: theme.colors.accentPrimary }}>{formatTime(endTime)}</strong>
                  <span style={{ color: theme.colors.textMuted, marginLeft: '8px' }}>
                    ({description})
                  </span>
                </span>
              );
            })()}
          </div>
        )}
      </div>
      )}

      {/* Main Content Area with Fields Panel */}
      <div style={styles.mainContainer}>
        {/* Fields Panel (Sidebar) */}
        {selectedPod && showFieldsPanel && (
          <FieldsPanel
            fields={extractedFieldsQuery.data?.fields || {}}
            isLoading={extractedFieldsQuery.isLoading}
            onFieldClick={handleFieldClick}
            activeFilters={fieldFilters}
            onClearFilter={handleClearFieldFilter}
            onClearAllFilters={handleClearAllFieldFilters}
          />
        )}

        {/* Log Table */}
        <main style={styles.main}>
          {!selectedEnv ? (
            <div style={{ ...styles.placeholder, color: theme.colors.textMuted }}>
              Select an environment to view logs
            </div>
          ) : !service ? (
            <div style={{ ...styles.placeholder, color: theme.colors.textMuted }}>
              Select a service to view pods
            </div>
          ) : !selectedPod ? (
            <div style={{ ...styles.placeholder, color: theme.colors.textMuted }}>
              Select a pod to view logs
            </div>
          ) : (
            <LogTable
              logs={logs}
              allLogs={rawLogs}
              total={total}
              hasMore={hasMore}
              isLoading={currentQuery.isLoading || fetchLogsMutation.isPending}
              filteredCount={filteredCount}
              filterPatterns={logFilterConfig.enabled ? logFilterConfig.excludePatterns : []}
              filtersEnabled={applyLogFilters}
              onToggleFilters={() => setApplyLogFilters(!applyLogFilters)}
              searchQuery={activeSearch}
              onLoadMore={handleLoadMore}
              onTimeNavigate={handleTimeNavigate}
              onAddToSearch={handleAddToSearch}
            />
          )}
        </main>
      </div>

      {/* Error display */}
      {(currentQuery.error || fetchLogsMutation.error) && (
        <div style={{
          ...styles.error,
          backgroundColor: theme.colors.errorBg,
          borderTopColor: theme.colors.error,
          color: theme.colors.error,
        }}>
          {(currentQuery.error as Error)?.message || (fetchLogsMutation.error as Error)?.message}
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            style={{
              backgroundColor: theme.colors.bgSecondary,
              borderRadius: '12px',
              padding: '24px 32px',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: `1px solid ${theme.colors.borderSecondary}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: theme.colors.textPrimary, fontSize: '18px' }}>
              Keyboard Shortcuts
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['/', 'Focus search bar'],
                  ['Ctrl + K', 'Focus search bar'],
                  ['Esc', 'Close popups / blur input'],
                  ['R', 'Refresh logs'],
                  ['T', 'Toggle dark/light theme'],
                  ['F', 'Toggle filters panel'],
                  ['E', 'Toggle fields panel'],
                  ['?', 'Show this help'],
                ].map(([key, desc]) => (
                  <tr key={key} style={{ borderBottom: `1px solid ${theme.colors.borderSecondary}` }}>
                    <td style={{ 
                      padding: '10px 12px 10px 0', 
                      color: theme.colors.accentPrimary,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}>
                      {key}
                    </td>
                    <td style={{ 
                      padding: '10px 0', 
                      color: theme.colors.textSecondary,
                      fontSize: '14px',
                    }}>
                      {desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ 
              marginTop: '16px', 
              textAlign: 'center',
              color: theme.colors.textMuted,
              fontSize: '12px',
            }}>
              Press <code style={{ 
                backgroundColor: theme.colors.bgTertiary, 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}>?</code> or <code style={{ 
                backgroundColor: theme.colors.bgTertiary, 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}>Esc</code> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    backgroundColor: '#16162a',
    borderBottom: '1px solid #333',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    margin: 0,
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  storage: {
    fontSize: '14px',
    color: '#888',
  },
  toggleFiltersButton: {
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#2a2a40',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#ccc',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toggleFiltersButtonHover: {
    backgroundColor: '#3a3a5a',
    borderColor: '#555',
    color: '#fff',
  },
  controls: {
    padding: '10px 24px 12px',
    backgroundColor: '#1f1f35',
    borderBottom: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minHeight: '46px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '5px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '160px',
  },
  fixedValue: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '5px',
    backgroundColor: '#1a1a2e',
    color: '#6cb6ff',
    minWidth: '160px',
    fontFamily: 'var(--font-family-mono, monospace)',
  },
  clearButton: {
    padding: '10px 18px',
    fontSize: '14px',
    border: '1px solid #666',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
  },
  viewIndicator: {
    padding: '10px 14px',
    backgroundColor: '#2a2a40',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#aaa',
  },
  mainContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '18px',
  },
  error: {
    padding: '14px 24px',
    backgroundColor: '#4a2a2a',
    borderTop: '1px solid #6a3a3a',
    color: '#ff8080',
    fontSize: '14px',
  },
};
