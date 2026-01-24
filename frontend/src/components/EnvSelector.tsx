/**
 * Environment selector dropdown component.
 */

import { useEnvs } from '../hooks/useLogs';
import { useTheme } from '../context/ThemeContext';
import { EnvConfig } from '../api/client';

interface EnvSelectorProps {
  value: string;
  onChange: (env: string, config: EnvConfig | null) => void;
}

export function EnvSelector({ value, onChange }: EnvSelectorProps) {
  const { theme } = useTheme();
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

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
      minHeight: '54px',
    },
    label: {
      fontSize: '13px',
      fontWeight: 600,
      color: theme.colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    select: {
      padding: '10px 14px',
      fontSize: '15px',
      border: `1px solid ${theme.colors.inputBorder}`,
      borderRadius: '6px',
      backgroundColor: theme.colors.inputBg,
      color: theme.colors.inputText,
      cursor: 'pointer',
      minWidth: '160px',
    },
    prodSelect: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorBg,
    },
    error: {
      fontSize: '13px',
      color: theme.colors.error,
    },
  };

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
