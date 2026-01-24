/**
 * Theme configuration for K8s Log Explorer.
 * Contains refined, eye-friendly color themes optimized for extended use.
 */

export interface Theme {
  id: string;
  name: string;
  colors: {
    // Background colors
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgHover: string;
    bgSelected: string;
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    
    // Border colors
    borderPrimary: string;
    borderSecondary: string;
    
    // Accent colors
    accentPrimary: string;
    accentSecondary: string;
    
    // Status colors
    error: string;
    errorBg: string;
    warning: string;
    warningBg: string;
    success: string;
    successBg: string;
    exception: string;
    exceptionBg: string;
    
    // Log specific
    timestamp: string;
    podName: string;
    containerName: string;
    searchHighlight: string;
    searchHighlightText: string;
    
    // Button colors
    buttonBg: string;
    buttonBgHover: string;
    buttonText: string;
    buttonBorder: string;
    
    // Input colors
    inputBg: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
  };
}

export const themes: Record<string, Theme> = {
  // Midnight - Refined dark theme with soft blue undertones
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bgPrimary: '#1e2128',
      bgSecondary: '#181b20',
      bgTertiary: '#252a33',
      bgHover: '#2d333d',
      bgSelected: '#363d4a',
      
      textPrimary: '#e6e8eb',
      textSecondary: '#a8adb5',
      textMuted: '#6b7280',
      textAccent: '#ffffff',
      
      borderPrimary: '#2d333d',
      borderSecondary: '#3d4450',
      
      accentPrimary: '#6b9fff',
      accentSecondary: '#8bb4ff',
      
      error: '#f87171',
      errorBg: '#2d2023',
      warning: '#fbbf24',
      warningBg: '#2d2920',
      success: '#4ade80',
      successBg: '#202d23',
      exception: '#fb7185',
      exceptionBg: '#2d2025',
      
      timestamp: '#6b9fff',
      podName: '#e6e8eb',
      containerName: '#6b7280',
      searchHighlight: '#fbbf24',
      searchHighlightText: '#1e2128',
      
      buttonBg: '#2d333d',
      buttonBgHover: '#3d4450',
      buttonText: '#a8adb5',
      buttonBorder: '#3d4450',
      
      inputBg: '#252a33',
      inputBorder: '#3d4450',
      inputText: '#e6e8eb',
      inputPlaceholder: '#6b7280',
    },
  },

  // Daylight - Clean, warm light theme easy on the eyes
  daylight: {
    id: 'daylight',
    name: 'Daylight',
    colors: {
      bgPrimary: '#fafafa',
      bgSecondary: '#f0f0f0',
      bgTertiary: '#ffffff',
      bgHover: '#e8e8e8',
      bgSelected: '#e0e0e0',
      
      textPrimary: '#2d3748',
      textSecondary: '#4a5568',
      textMuted: '#718096',
      textAccent: '#1a202c',
      
      borderPrimary: '#e2e8f0',
      borderSecondary: '#cbd5e0',
      
      accentPrimary: '#3182ce',
      accentSecondary: '#4299e1',
      
      error: '#e53e3e',
      errorBg: '#fff5f5',
      warning: '#d69e2e',
      warningBg: '#fffff0',
      success: '#38a169',
      successBg: '#f0fff4',
      exception: '#d53f8c',
      exceptionBg: '#fff5f7',
      
      timestamp: '#3182ce',
      podName: '#2d3748',
      containerName: '#718096',
      searchHighlight: '#faf089',
      searchHighlightText: '#1a202c',
      
      buttonBg: '#edf2f7',
      buttonBgHover: '#e2e8f0',
      buttonText: '#4a5568',
      buttonBorder: '#cbd5e0',
      
      inputBg: '#ffffff',
      inputBorder: '#cbd5e0',
      inputText: '#2d3748',
      inputPlaceholder: '#a0aec0',
    },
  },

  // Ocean - Deep blue with calming teal accents
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#0c1322',
      bgTertiary: '#1e293b',
      bgHover: '#273549',
      bgSelected: '#334155',
      
      textPrimary: '#e2e8f0',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      textAccent: '#f8fafc',
      
      borderPrimary: '#1e293b',
      borderSecondary: '#334155',
      
      accentPrimary: '#22d3ee',
      accentSecondary: '#67e8f9',
      
      error: '#fb7185',
      errorBg: '#1f1b24',
      warning: '#fcd34d',
      warningBg: '#1f1d18',
      success: '#4ade80',
      successBg: '#151f1a',
      exception: '#f472b6',
      exceptionBg: '#1f1820',
      
      timestamp: '#22d3ee',
      podName: '#e2e8f0',
      containerName: '#64748b',
      searchHighlight: '#fcd34d',
      searchHighlightText: '#0f172a',
      
      buttonBg: '#1e293b',
      buttonBgHover: '#334155',
      buttonText: '#94a3b8',
      buttonBorder: '#334155',
      
      inputBg: '#1e293b',
      inputBorder: '#334155',
      inputText: '#e2e8f0',
      inputPlaceholder: '#64748b',
    },
  },

  // Forest - Calming dark green theme
  forest: {
    id: 'forest',
    name: 'Forest',
    colors: {
      bgPrimary: '#1a1f1c',
      bgSecondary: '#151917',
      bgTertiary: '#222923',
      bgHover: '#2a322c',
      bgSelected: '#343d36',
      
      textPrimary: '#e8ece9',
      textSecondary: '#a3b0a7',
      textMuted: '#6b7a6f',
      textAccent: '#ffffff',
      
      borderPrimary: '#2a322c',
      borderSecondary: '#3d4840',
      
      accentPrimary: '#6ee7b7',
      accentSecondary: '#a7f3d0',
      
      error: '#fca5a5',
      errorBg: '#2a2220',
      warning: '#fcd34d',
      warningBg: '#2a2820',
      success: '#86efac',
      successBg: '#1f2a22',
      exception: '#f9a8d4',
      exceptionBg: '#2a2024',
      
      timestamp: '#6ee7b7',
      podName: '#e8ece9',
      containerName: '#6b7a6f',
      searchHighlight: '#fcd34d',
      searchHighlightText: '#1a1f1c',
      
      buttonBg: '#2a322c',
      buttonBgHover: '#3d4840',
      buttonText: '#a3b0a7',
      buttonBorder: '#3d4840',
      
      inputBg: '#222923',
      inputBorder: '#3d4840',
      inputText: '#e8ece9',
      inputPlaceholder: '#6b7a6f',
    },
  },

  // Slate - Professional gray tones
  slate: {
    id: 'slate',
    name: 'Slate',
    colors: {
      bgPrimary: '#1c1c1e',
      bgSecondary: '#161618',
      bgTertiary: '#242426',
      bgHover: '#2c2c2e',
      bgSelected: '#3a3a3c',
      
      textPrimary: '#f5f5f7',
      textSecondary: '#a1a1a6',
      textMuted: '#6e6e73',
      textAccent: '#ffffff',
      
      borderPrimary: '#2c2c2e',
      borderSecondary: '#3a3a3c',
      
      accentPrimary: '#0a84ff',
      accentSecondary: '#5ac8fa',
      
      error: '#ff6961',
      errorBg: '#2a1f1f',
      warning: '#ffd60a',
      warningBg: '#2a2810',
      success: '#32d74b',
      successBg: '#1a2a1f',
      exception: '#ff6482',
      exceptionBg: '#2a1f22',
      
      timestamp: '#5ac8fa',
      podName: '#f5f5f7',
      containerName: '#6e6e73',
      searchHighlight: '#ffd60a',
      searchHighlightText: '#1c1c1e',
      
      buttonBg: '#2c2c2e',
      buttonBgHover: '#3a3a3c',
      buttonText: '#a1a1a6',
      buttonBorder: '#3a3a3c',
      
      inputBg: '#242426',
      inputBorder: '#3a3a3c',
      inputText: '#f5f5f7',
      inputPlaceholder: '#6e6e73',
    },
  },

  // Sunset - Warm dark theme with orange accents
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      bgPrimary: '#1f1a18',
      bgSecondary: '#181513',
      bgTertiary: '#28221f',
      bgHover: '#332b27',
      bgSelected: '#3d3430',
      
      textPrimary: '#f5ebe6',
      textSecondary: '#b8a99e',
      textMuted: '#7a6e66',
      textAccent: '#ffffff',
      
      borderPrimary: '#332b27',
      borderSecondary: '#4a403a',
      
      accentPrimary: '#fb923c',
      accentSecondary: '#fdba74',
      
      error: '#f87171',
      errorBg: '#2d201f',
      warning: '#facc15',
      warningBg: '#2d2918',
      success: '#4ade80',
      successBg: '#1d2a1f',
      exception: '#fb7185',
      exceptionBg: '#2d1f22',
      
      timestamp: '#fb923c',
      podName: '#f5ebe6',
      containerName: '#7a6e66',
      searchHighlight: '#facc15',
      searchHighlightText: '#1f1a18',
      
      buttonBg: '#332b27',
      buttonBgHover: '#4a403a',
      buttonText: '#b8a99e',
      buttonBorder: '#4a403a',
      
      inputBg: '#28221f',
      inputBorder: '#4a403a',
      inputText: '#f5ebe6',
      inputPlaceholder: '#7a6e66',
    },
  },

  // Lavender - Soft purple tones, gentle on eyes
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    colors: {
      bgPrimary: '#1e1b23',
      bgSecondary: '#18161c',
      bgTertiary: '#26222d',
      bgHover: '#302b38',
      bgSelected: '#3a3444',
      
      textPrimary: '#ede8f5',
      textSecondary: '#a8a0b8',
      textMuted: '#706882',
      textAccent: '#ffffff',
      
      borderPrimary: '#302b38',
      borderSecondary: '#443d50',
      
      accentPrimary: '#a78bfa',
      accentSecondary: '#c4b5fd',
      
      error: '#fca5a5',
      errorBg: '#2a1f22',
      warning: '#fcd34d',
      warningBg: '#2a2720',
      success: '#86efac',
      successBg: '#1f2a22',
      exception: '#f9a8d4',
      exceptionBg: '#2a1f28',
      
      timestamp: '#a78bfa',
      podName: '#ede8f5',
      containerName: '#706882',
      searchHighlight: '#fcd34d',
      searchHighlightText: '#1e1b23',
      
      buttonBg: '#302b38',
      buttonBgHover: '#443d50',
      buttonText: '#a8a0b8',
      buttonBorder: '#443d50',
      
      inputBg: '#26222d',
      inputBorder: '#443d50',
      inputText: '#ede8f5',
      inputPlaceholder: '#706882',
    },
  },

  // Coffee - Warm sepia tones, comfortable for long sessions
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    colors: {
      bgPrimary: '#1c1917',
      bgSecondary: '#171412',
      bgTertiary: '#231f1c',
      bgHover: '#2d2825',
      bgSelected: '#38322e',
      
      textPrimary: '#f5f0eb',
      textSecondary: '#b5a99d',
      textMuted: '#786b60',
      textAccent: '#ffffff',
      
      borderPrimary: '#2d2825',
      borderSecondary: '#45403a',
      
      accentPrimary: '#d4a574',
      accentSecondary: '#e6c9a8',
      
      error: '#f87171',
      errorBg: '#2a1f1f',
      warning: '#fbbf24',
      warningBg: '#2a2618',
      success: '#4ade80',
      successBg: '#1c2a1f',
      exception: '#fb7185',
      exceptionBg: '#2a1f22',
      
      timestamp: '#d4a574',
      podName: '#f5f0eb',
      containerName: '#786b60',
      searchHighlight: '#fbbf24',
      searchHighlightText: '#1c1917',
      
      buttonBg: '#2d2825',
      buttonBgHover: '#45403a',
      buttonText: '#b5a99d',
      buttonBorder: '#45403a',
      
      inputBg: '#231f1c',
      inputBorder: '#45403a',
      inputText: '#f5f0eb',
      inputPlaceholder: '#786b60',
    },
  },

  // Arctic - Cool light gray theme
  arctic: {
    id: 'arctic',
    name: 'Arctic',
    colors: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#f1f5f9',
      bgTertiary: '#ffffff',
      bgHover: '#e2e8f0',
      bgSelected: '#cbd5e1',
      
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#64748b',
      textAccent: '#0f172a',
      
      borderPrimary: '#e2e8f0',
      borderSecondary: '#cbd5e1',
      
      accentPrimary: '#0ea5e9',
      accentSecondary: '#38bdf8',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#ca8a04',
      warningBg: '#fefce8',
      success: '#16a34a',
      successBg: '#f0fdf4',
      exception: '#db2777',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#0ea5e9',
      podName: '#1e293b',
      containerName: '#64748b',
      searchHighlight: '#fde047',
      searchHighlightText: '#1e293b',
      
      buttonBg: '#f1f5f9',
      buttonBgHover: '#e2e8f0',
      buttonText: '#475569',
      buttonBorder: '#cbd5e1',
      
      inputBg: '#ffffff',
      inputBorder: '#cbd5e1',
      inputText: '#1e293b',
      inputPlaceholder: '#94a3b8',
    },
  },
};

// Default theme
export const defaultTheme = themes.midnight;

// Get theme by ID or return default
export function getTheme(id: string): Theme {
  return themes[id] || defaultTheme;
}

// Get all theme options for dropdown
export function getThemeOptions(): { id: string; name: string }[] {
  return Object.values(themes).map(theme => ({
    id: theme.id,
    name: theme.name,
  }));
}
