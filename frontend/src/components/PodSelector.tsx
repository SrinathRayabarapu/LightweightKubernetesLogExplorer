/**
 * Pod selector dropdown component.
 */

import { PodInfo } from '../api/client';

interface PodSelectorProps {
  pods: PodInfo[];
  value: string;
  onChange: (pod: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function PodSelector({
  pods,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: PodSelectorProps) {
  const selectedPod = pods.find(p => p.name === value);
  const containerCount = selectedPod?.containers.length || 0;
  
  return (
    <div style={styles.container}>
      <label style={styles.label}>Pod</label>
      <div style={styles.selectWrapper}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || isLoading}
          style={{
            ...styles.select,
            ...(disabled ? styles.selectDisabled : {}),
          }}
        >
          <option value="">
            {isLoading ? 'Loading pods...' : 'Select pod...'}
          </option>
          {pods.map(pod => (
            <option key={pod.name} value={pod.name}>
              {pod.name} ({pod.status})
            </option>
          ))}
        </select>
        {value && containerCount > 0 && (
          <span style={styles.podInfoInline}>
            ({containerCount} container{containerCount !== 1 ? 's' : ''})
          </span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
  selectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #333',
    borderRadius: '4px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '280px',
    flex: '1 1 auto',
  },
  selectDisabled: {
    backgroundColor: '#1a1a2e',
    color: '#666',
    cursor: 'not-allowed',
  },
  podInfoInline: {
    fontSize: '11px',
    color: '#666',
    whiteSpace: 'nowrap',
  },
};
