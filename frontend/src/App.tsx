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
  // Selection state
  const [selectedEnv, setSelectedEnv] = useState('');
  const namespace = FIXED_NAMESPACE; // Fixed namespace - not user-selectable
  const [service, setService] = useState('');
  const [selectedPod, setSelectedPod] = useState('');
  const [showFilters, setShowFilters] = useState(true); // Toggle filter visibility
  const [hoveredToggleButton, setHoveredToggleButton] = useState(false);

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

  // Pagination - default 500 logs per page (matches backend batch size)
  const [limit] = useState(500);
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

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    if (selectedEnv && namespace && service && selectedPod) {
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod });
    }
  }, [selectedEnv, namespace, service, selectedPod, fetchLogsMutation]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    setOffset(prev => prev + limit);
  }, [limit]);

  // Auto-fetch logs when pod is selected
  useEffect(() => {
    if (selectedEnv && namespace && service && selectedPod) {
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod });
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

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled || !selectedEnv || !namespace || !service || !selectedPod) return;

    const intervalId = setInterval(() => {
      fetchLogsMutation.mutate({ env: selectedEnv, namespace, service, pod: selectedPod });
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, refreshInterval, selectedEnv, namespace, service, selectedPod, fetchLogsMutation]);

  // Determine current data source
  const currentQuery = viewMode === 'search' ? searchLogsQuery :
                       viewMode === 'time-window' ? timeWindowQuery :
                       logsQuery;

  // Apply log exclusion filters to remove unwanted logs (healthchecks, etc.)
  const rawLogs = currentQuery.data?.logs || [];
  const logs = filterLogs(rawLogs);
  const total = currentQuery.data?.total || 0;
  const filteredCount = rawLogs.length - logs.length;
  const hasMore = currentQuery.data?.hasMore || false;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>K8s Log Explorer</h1>
        <div style={styles.headerRight}>
          {storageStats.data && (
            <div style={styles.storage}>
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
              ...(hoveredToggleButton ? styles.toggleFiltersButtonHover : {}),
            }}
            title={showFilters ? 'Hide filters' : 'Show filters'}
          >
            {showFilters ? '▼' : '▲'} Filters
          </button>
        </div>
      </header>

      {/* Controls */}
      {showFilters && (
      <div style={styles.controls}>
        <div style={styles.controlRow}>
          <EnvSelector
            value={selectedEnv}
            onChange={handleEnvChange}
          />

          {/* Namespace is fixed to jio-t2r-ms - display only */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Namespace</label>
            <div style={styles.fixedValue}>{FIXED_NAMESPACE}</div>
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
            <button onClick={handleClearSearch} style={styles.clearButton}>
              Clear Filter
            </button>
          )}
        </div>

        {/* View mode indicator */}
        {viewMode !== 'logs' && (
          <div style={styles.viewIndicator}>
            {viewMode === 'search' && (
              <span>Showing search results for: <strong>"{activeSearch}"</strong></span>
            )}
            {viewMode === 'time-window' && timeWindow && (
              <span>
                Showing logs ±{timeWindow.minutes} minutes around{' '}
                <strong>{new Date(timeWindow.timestamp).toLocaleString()}</strong>
              </span>
            )}
          </div>
        )}
      </div>
      )}

      {/* Log Table */}
      <main style={styles.main}>
        {!selectedEnv ? (
          <div style={styles.placeholder}>
            Select an environment to view logs
          </div>
        ) : !service ? (
          <div style={styles.placeholder}>
            Select a service to view pods
          </div>
        ) : !selectedPod ? (
          <div style={styles.placeholder}>
            Select a pod to view logs
          </div>
        ) : (
          <LogTable
            logs={logs}
            total={total}
            hasMore={hasMore}
            isLoading={currentQuery.isLoading || fetchLogsMutation.isPending}
            filteredCount={filteredCount}
            filterPatterns={logFilterConfig.enabled ? logFilterConfig.excludePatterns : []}
            onLoadMore={handleLoadMore}
            onTimeNavigate={handleTimeNavigate}
          />
        )}
      </main>

      {/* Error display */}
      {(currentQuery.error || fetchLogsMutation.error) && (
        <div style={styles.error}>
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#16162a',
    borderBottom: '1px solid #333',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  storage: {
    fontSize: '12px',
    color: '#888',
  },
  toggleFiltersButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#2a2a40',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#ccc',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  toggleFiltersButtonHover: {
    backgroundColor: '#3a3a5a',
    borderColor: '#555',
    color: '#fff',
  },
  controls: {
    padding: '16px 20px',
    backgroundColor: '#1f1f35',
    borderBottom: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    flexWrap: 'wrap',
  },
  inputGroup: {
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
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '4px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '160px',
  },
  fixedValue: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#6cb6ff',
    minWidth: '160px',
    fontFamily: 'monospace',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '13px',
    border: '1px solid #666',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
  },
  viewIndicator: {
    padding: '8px 12px',
    backgroundColor: '#2a2a40',
    borderRadius: '4px',
    fontSize: '13px',
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
    fontSize: '16px',
  },
  error: {
    padding: '12px 20px',
    backgroundColor: '#4a2a2a',
    borderTop: '1px solid #6a3a3a',
    color: '#ff8080',
    fontSize: '13px',
  },
};
