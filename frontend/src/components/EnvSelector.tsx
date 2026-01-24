/**
 * Environment selector dropdown component.
 */

import { useEnvs } from '../hooks/useLogs';
import { EnvConfig } from '../api/client';

interface EnvSelectorProps {
  value: string;
  onChange: (env: string, config: EnvConfig | null) => void;
}

export function EnvSelector({ value, onChange }: EnvSelectorProps) {
  const { data: envs, isLoading, error } = useEnvs();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const envName = e.target.value;
    const config = envs?.find(env => env.envName === envName) || null;
    onChange(envName, config);
  };

  // Sort environments in order: sit, replica, prod
  const sortedEnvs = envs ? [...envs].sort((a, b) => {
    const order: Record<string, number> = { sit: 1, replica: 2, prod: 3 };
    const orderA = order[a.envName.toLowerCase()] || 999;
    const orderB = order[b.envName.toLowerCase()] || 999;
    return orderA - orderB;
  }) : [];

  return (
    <div style={styles.container}>
      <label style={styles.label}>Environment</label>
      <select
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        style={{
          ...styles.select,
          ...(value === 'prod' ? styles.prodSelect : {}),
        }}
      >
        <option value="">Select environment...</option>
        {sortedEnvs.map(env => (
          <option key={env.envName} value={env.envName}>
            {env.envName.toUpperCase()}
          </option>
        ))}
      </select>
      {error && <span style={styles.error}>Failed to load environments</span>}
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
  select: {
    padding: '10px 14px',
    fontSize: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#2a2a40',
    color: '#eee',
    cursor: 'pointer',
    minWidth: '160px',
  },
  prodSelect: {
    borderColor: '#ff6b6b',
    backgroundColor: '#3a2a2a',
  },
  error: {
    fontSize: '13px',
    color: '#ff6b6b',
  },
};
