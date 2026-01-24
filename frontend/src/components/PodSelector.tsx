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
  selectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  select: {
    padding: '10px 14px',
    fontSize: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '300px',
    flex: '1 1 auto',
  },
  selectDisabled: {
    backgroundColor: '#1a1a2e',
    color: '#666',
    cursor: 'not-allowed',
  },
  podInfoInline: {
    fontSize: '13px',
    color: '#666',
    whiteSpace: 'nowrap',
  },
};
