/**
 * API client for the K8s Log Explorer backend.
 */

const API_BASE = '/api';

export interface EnvConfig {
  envName: string;
  defaultNamespace: string;
  allowedNamespaces: string[] | null;
  refreshInterval: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  env: string;
  namespace: string;
  service: string;
  pod: string;
  container: string;
  message: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}

export interface FetchLogsResult {
  success: boolean;
  pods_processed: number;
  logs_stored: number;
  last_timestamp: string | null;
  error?: string;
}

export interface StorageStats {
  current_size_mb: number;
  max_size_mb: number;
  usage_percent: number;
  total_logs: number;
}

export interface PodInfo {
  name: string;
  status: string;
  containers: string[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Health check
  health: () => fetchJson<{ status: string; app: string; version: string }>(`${API_BASE}/health`),

  // Environments
  getEnvs: () => fetchJson<EnvConfig[]>(`${API_BASE}/envs`),

  // Namespaces and services
  getNamespaces: (env: string, fromCluster = false) =>
    fetchJson<{ env: string; namespaces: string[]; source: string }>(
      `${API_BASE}/namespaces?env=${encodeURIComponent(env)}&from_cluster=${fromCluster}`
    ),

  getServices: (env: string, namespace: string, fromCluster = false) =>
    fetchJson<{ env: string; namespace: string; services: string[]; source: string }>(
      `${API_BASE}/services?env=${encodeURIComponent(env)}&namespace=${encodeURIComponent(namespace)}&from_cluster=${fromCluster}`
    ),

  // Pods
  getPods: (env: string, namespace: string, service: string) =>
    fetchJson<{ env: string; namespace: string; service: string; pods: PodInfo[] }>(
      `${API_BASE}/pods?env=${encodeURIComponent(env)}&namespace=${encodeURIComponent(namespace)}&service=${encodeURIComponent(service)}`
    ),

  // Logs
  getLogs: (params: {
    env: string;
    namespace?: string;
    service?: string;
    pod?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('env', params.env);
    if (params.namespace) searchParams.set('namespace', params.namespace);
    if (params.service) searchParams.set('service', params.service);
    if (params.pod) searchParams.set('pod', params.pod);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    return fetchJson<LogsResponse>(`${API_BASE}/logs?${searchParams}`);
  },

  fetchLogs: (env: string, namespace: string, service: string, pod?: string) =>
    fetchJson<FetchLogsResult>(`${API_BASE}/logs/fetch`, {
      method: 'POST',
      body: JSON.stringify({ env, namespace, service, pod }),
    }),

  searchLogs: (params: {
    env: string;
    query: string;
    namespace?: string;
    service?: string;
    pod?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('env', params.env);
    searchParams.set('query', params.query);
    if (params.namespace) searchParams.set('namespace', params.namespace);
    if (params.service) searchParams.set('service', params.service);
    if (params.pod) searchParams.set('pod', params.pod);
    if (params.start_time) searchParams.set('start_time', params.start_time);
    if (params.end_time) searchParams.set('end_time', params.end_time);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    return fetchJson<LogsResponse>(`${API_BASE}/logs/search?${searchParams}`);
  },

  getLogsByTime: (params: {
    env: string;
    baseTimestamp: string;
    windowMinutes: number;
    direction: 'before' | 'after' | 'around';
    namespace?: string;
    service?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('env', params.env);
    searchParams.set('base_timestamp', params.baseTimestamp);
    searchParams.set('window_minutes', params.windowMinutes.toString());
    searchParams.set('direction', params.direction);
    if (params.namespace) searchParams.set('namespace', params.namespace);
    if (params.service) searchParams.set('service', params.service);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    return fetchJson<LogsResponse>(`${API_BASE}/logs/by-time?${searchParams}`);
  },

  getStorageStats: () => fetchJson<StorageStats>(`${API_BASE}/logs/storage`),

  // Refresh
  subscribe: (env: string, namespace: string, service: string, intervalSeconds?: number) =>
    fetchJson<{ status: string }>(`${API_BASE}/refresh/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ env, namespace, service, interval_seconds: intervalSeconds }),
    }),

  unsubscribe: (env: string, namespace: string, service: string) =>
    fetchJson<{ status: string }>(`${API_BASE}/refresh/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify({ env, namespace, service }),
    }),

  getSubscriptions: () =>
    fetchJson<{ subscriptions: Array<{ key: string; env: string; namespace: string; service: string; interval: number }> }>(
      `${API_BASE}/refresh/subscriptions`
    ),
};
