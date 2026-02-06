/**
 * Custom hooks for log-related operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useEnvs() {
  return useQuery({
    queryKey: ['envs'],
    queryFn: api.getEnvs,
  });
}

export function useNamespaces(env: string, fromCluster = false) {
  return useQuery({
    queryKey: ['namespaces', env, fromCluster],
    queryFn: () => api.getNamespaces(env, fromCluster),
    enabled: !!env,
  });
}

export function useServices(env: string, namespace: string, fromCluster = false) {
  return useQuery({
    queryKey: ['services', env, namespace, fromCluster],
    queryFn: () => api.getServices(env, namespace, fromCluster),
    enabled: !!env && !!namespace,
    staleTime: 0, // Always consider data stale - fetch fresh on every request
    gcTime: 0, // Don't cache - always fetch from cluster (renamed from cacheTime in v5)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function usePods(env: string, namespace: string, service: string) {
  return useQuery({
    queryKey: ['pods', env, namespace, service],
    queryFn: () => api.getPods(env, namespace, service),
    enabled: !!env && !!namespace && !!service,
    staleTime: 0, // Always consider data stale - fetch fresh on every request
    gcTime: 0, // Don't cache - always fetch from cluster (renamed from cacheTime in v5)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useLogs(params: {
  env: string;
  namespace?: string;
  service?: string;
  pod?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['logs', params.env, params.namespace, params.service, params.pod, params.limit, params.offset],
    queryFn: () => api.getLogs(params),
    enabled: params.enabled !== false && !!params.env,
    refetchInterval: false,
  });
}

export function useSearchLogs(params: {
  env: string;
  query: string;
  namespace?: string;
  service?: string;
  pod?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  enabled?: boolean;
}) {
  // Send the raw query to the backend - let backend handle parsing
  // Only transform if the query contains explicit AND/OR/NOT operators
  const rawQuery = params.query.trim();
  
  return useQuery({
    queryKey: ['search', params.env, params.query, params.namespace, params.service, params.pod, params.start_time, params.end_time],
    queryFn: () => api.searchLogs({
      ...params,
      query: rawQuery,
    }),
    enabled: params.enabled !== false && !!params.env && !!params.query && rawQuery.length > 0,
  });
}

export function useLogsByTime(params: {
  env: string;
  baseTimestamp: string;
  windowMinutes: number;
  direction: 'before' | 'after' | 'around';
  namespace?: string;
  service?: string;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['logs-by-time', params.env, params.baseTimestamp, params.windowMinutes, params.direction],
    queryFn: () => api.getLogsByTime(params),
    enabled: params.enabled !== false && !!params.env && !!params.baseTimestamp,
  });
}

export function useFetchLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ env, namespace, service, pod, fetchAll }: { env: string; namespace: string; service: string; pod?: string; fetchAll?: boolean }) =>
      api.fetchLogs(env, namespace, service, pod, fetchAll),
    onSuccess: () => {
      // Invalidate and refetch logs queries immediately to show new data
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['extracted-fields'] });
      // Force refetch all log queries
      queryClient.refetchQueries({ queryKey: ['logs'] });
      queryClient.refetchQueries({ queryKey: ['search'] });
      queryClient.refetchQueries({ queryKey: ['extracted-fields'] });
    },
  });
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn: api.getStorageStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ env, namespace, service, intervalSeconds }: { env: string; namespace: string; service: string; intervalSeconds?: number }) =>
      api.subscribe(env, namespace, service, intervalSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useUnsubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ env, namespace, service }: { env: string; namespace: string; service: string }) =>
      api.unsubscribe(env, namespace, service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: api.getSubscriptions,
  });
}

export function useExtractedFields(params: {
  env: string;
  namespace?: string;
  service?: string;
  pod?: string;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['extracted-fields', params.env, params.namespace, params.service, params.pod],
    queryFn: () => api.getExtractedFields(params),
    enabled: params.enabled !== false && !!params.env && !!params.pod,
    staleTime: 60000, // Cache for 1 minute (fields don't change often)
    refetchOnWindowFocus: false,
  });
}
