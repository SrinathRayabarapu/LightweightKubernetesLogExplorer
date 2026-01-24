/**
 * Main application component for K8s Log Explorer.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EnvSelector } from './components/EnvSelector';
import { SearchBar } from './components/SearchBar';
import { LogTable } from './components/LogTable';
import { RefreshIndicator } from './components/RefreshIndicator';
import { SearchableSelect } from './components/SearchableSelect';
import { PodSelector } from './components/PodSelector';
import { ThemeSelector } from './components/ThemeSelector';
import { useTheme } from './context/ThemeContext';
import {
  useLogs,
  useSearchLogs,
  useLogsByTime,
  useFetchLogs,
  useStorageStats,
  useServices,
  usePods,
} from './hooks/useLogs';
import { EnvConfig } from './api/client';
import { filterLogs, logFilterConfig } from './config/logFilters';

type ViewMode = 'logs' | 'search' | 'time-window';

// Fixed namespace for all environments
const FIXED_NAMESPACE = 'jio-t2r-ms';

export default function App() {
  // Theme
  const { theme } = useTheme();

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

  // Time navigation state
  const [timeWindow, setTimeWindow] = useState<{
    timestamp: string;
    minutes: number;
    direction: 'before' | 'after' | 'around';
  } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('logs');

  // Pagination - default 1000 logs per page
  // All logs are fetched from K8s and stored, UI displays in batches
  const [limit] = useState(1000);
  const [offset, setOffset] = useState(0);

  // Auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300); // 5 minutes

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
    setTimeWindow(null);
  }, []);

  // Search handler
  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // If there's a search query, activate search mode
      setActiveSearch(trimmedQuery);
      setViewMode('search');
      setTimeWindow(null);
      setOffset(0);
    } else {
      // If search bar is cleared, go back to default logs view
      setActiveSearch('');
      setViewMode('logs');
      setTimeWindow(null);
      setOffset(0);
    }
  }, [searchQuery]);

  // Clear search and return to logs view
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearch('');
    setViewMode('logs');
    setOffset(0);
  }, []);

  // Time navigation handler
  const handleTimeNavigate = useCallback((timestamp: string, windowMinutes: number, direction: 'before' | 'after' | 'around') => {
    setTimeWindow({ timestamp, minutes: windowMinutes, direction });
    setViewMode('time-window');
    setActiveSearch('');
    setOffset(0);
  }, []);

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

        <div style={styles.controlRow}>
          <SearchBar
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
        </div>

        {/* View mode indicator */}
        {viewMode !== 'logs' && (
          <div style={{
            ...styles.viewIndicator,
            backgroundColor: theme.colors.bgHover,
            color: theme.colors.textSecondary,
          }}>
            {viewMode === 'search' && (
              <span>Showing search results for: <strong style={{ color: theme.colors.accentPrimary }}>"{activeSearch}"</strong></span>
            )}
            {viewMode === 'time-window' && timeWindow && (() => {
              const baseTime = new Date(timeWindow.timestamp);
              const startTime = new Date(baseTime.getTime() - timeWindow.minutes * 60 * 1000);
              const endTime = new Date(baseTime.getTime() + timeWindow.minutes * 60 * 1000);
              const formatTime = (date: Date) => date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });
              return (
                <span>
                  Showing logs from <strong style={{ color: theme.colors.accentPrimary }}>{formatTime(startTime)}</strong> to <strong style={{ color: theme.colors.accentPrimary }}>{formatTime(endTime)}</strong>
                  <span style={{ color: theme.colors.textMuted, marginLeft: '8px' }}>
                    (±{timeWindow.minutes} min around {formatTime(baseTime)})
                  </span>
                </span>
              );
            })()}
          </div>
        )}
      </div>
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
          />
        )}
      </main>

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
    padding: '18px 24px',
    backgroundColor: '#1f1f35',
    borderBottom: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '18px',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '54px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    padding: '10px 14px',
    fontSize: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '180px',
  },
  fixedValue: {
    padding: '10px 14px',
    fontSize: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#1a1a2e',
    color: '#6cb6ff',
    minWidth: '180px',
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
