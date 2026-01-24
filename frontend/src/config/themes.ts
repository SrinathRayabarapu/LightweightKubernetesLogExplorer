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
  // ==================== DARK THEMES ====================

  // Classic Dark - Original dark blue theme
  classicDark: {
    id: 'classicDark',
    name: 'Classic Dark',
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16162a',
      bgTertiary: '#1f1f35',
      bgHover: '#252540',
      bgSelected: '#3a3a5a',
      
      textPrimary: '#eee',
      textSecondary: '#aaa',
      textMuted: '#888',
      textAccent: '#fff',
      
      borderPrimary: '#333',
      borderSecondary: '#444',
      
      accentPrimary: '#4a9eff',
      accentSecondary: '#6cb6ff',
      
      error: '#ff6b6b',
      errorBg: '#2a1f1f',
      warning: '#ffaa00',
      warningBg: '#2a241f',
      success: '#51cf66',
      successBg: '#1f2a1f',
      exception: '#ff6b9d',
      exceptionBg: '#2a1f22',
      
      timestamp: '#6cb6ff',
      podName: '#e0e0e0',
      containerName: '#888',
      searchHighlight: '#ffeb3b',
      searchHighlightText: '#000',
      
      buttonBg: '#2a2a40',
      buttonBgHover: '#3a3a5a',
      buttonText: '#ccc',
      buttonBorder: '#444',
      
      inputBg: '#2a2a40',
      inputBorder: '#333',
      inputText: '#eee',
      inputPlaceholder: '#666',
    },
  },

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

  // Lavender - Soft purple tones
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

  // Coffee - Warm sepia tones
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

  // ==================== LIGHT THEMES ====================

  // Daylight - Clean, warm light theme
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

  // Paper - Warm off-white theme
  paper: {
    id: 'paper',
    name: 'Paper',
    colors: {
      bgPrimary: '#fdfbf7',
      bgSecondary: '#f5f1ea',
      bgTertiary: '#ffffff',
      bgHover: '#ebe5db',
      bgSelected: '#ddd5c8',
      
      textPrimary: '#3d3929',
      textSecondary: '#5c5647',
      textMuted: '#8a8377',
      textAccent: '#2a2618',
      
      borderPrimary: '#e5dfd4',
      borderSecondary: '#d4cbbf',
      
      accentPrimary: '#b8860b',
      accentSecondary: '#d4a017',
      
      error: '#c53030',
      errorBg: '#fef5f5',
      warning: '#b7791f',
      warningBg: '#fefcf0',
      success: '#2f855a',
      successBg: '#f0fdf4',
      exception: '#b83280',
      exceptionBg: '#fef5f8',
      
      timestamp: '#b8860b',
      podName: '#3d3929',
      containerName: '#8a8377',
      searchHighlight: '#fde68a',
      searchHighlightText: '#3d3929',
      
      buttonBg: '#f5f1ea',
      buttonBgHover: '#ebe5db',
      buttonText: '#5c5647',
      buttonBorder: '#d4cbbf',
      
      inputBg: '#ffffff',
      inputBorder: '#d4cbbf',
      inputText: '#3d3929',
      inputPlaceholder: '#a09889',
    },
  },

  // Mint - Fresh green-tinted light theme
  mint: {
    id: 'mint',
    name: 'Mint',
    colors: {
      bgPrimary: '#f5faf8',
      bgSecondary: '#ebf5f0',
      bgTertiary: '#ffffff',
      bgHover: '#dceee5',
      bgSelected: '#c6e2d4',
      
      textPrimary: '#1f3d32',
      textSecondary: '#3d5c4e',
      textMuted: '#5f8070',
      textAccent: '#14332a',
      
      borderPrimary: '#d1e8dc',
      borderSecondary: '#b5d9c6',
      
      accentPrimary: '#059669',
      accentSecondary: '#10b981',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#d97706',
      warningBg: '#fffbeb',
      success: '#059669',
      successBg: '#ecfdf5',
      exception: '#db2777',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#059669',
      podName: '#1f3d32',
      containerName: '#5f8070',
      searchHighlight: '#fde047',
      searchHighlightText: '#1f3d32',
      
      buttonBg: '#ebf5f0',
      buttonBgHover: '#dceee5',
      buttonText: '#3d5c4e',
      buttonBorder: '#b5d9c6',
      
      inputBg: '#ffffff',
      inputBorder: '#b5d9c6',
      inputText: '#1f3d32',
      inputPlaceholder: '#7fa393',
    },
  },

  // Rose - Soft pink-tinted light theme
  rose: {
    id: 'rose',
    name: 'Rose',
    colors: {
      bgPrimary: '#fdf8f9',
      bgSecondary: '#f9eff1',
      bgTertiary: '#ffffff',
      bgHover: '#f3e4e7',
      bgSelected: '#e8d3d8',
      
      textPrimary: '#4a2c34',
      textSecondary: '#6b4550',
      textMuted: '#957a82',
      textAccent: '#3d2229',
      
      borderPrimary: '#f0dce0',
      borderSecondary: '#e0c5cb',
      
      accentPrimary: '#be185d',
      accentSecondary: '#db2777',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#d97706',
      warningBg: '#fffbeb',
      success: '#059669',
      successBg: '#ecfdf5',
      exception: '#be185d',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#be185d',
      podName: '#4a2c34',
      containerName: '#957a82',
      searchHighlight: '#fde047',
      searchHighlightText: '#4a2c34',
      
      buttonBg: '#f9eff1',
      buttonBgHover: '#f3e4e7',
      buttonText: '#6b4550',
      buttonBorder: '#e0c5cb',
      
      inputBg: '#ffffff',
      inputBorder: '#e0c5cb',
      inputText: '#4a2c34',
      inputPlaceholder: '#b0949a',
    },
  },

  // Sky - Blue-tinted light theme
  sky: {
    id: 'sky',
    name: 'Sky',
    colors: {
      bgPrimary: '#f5f9fd',
      bgSecondary: '#eaf2fa',
      bgTertiary: '#ffffff',
      bgHover: '#dce8f5',
      bgSelected: '#c5d9ed',
      
      textPrimary: '#1e3a5f',
      textSecondary: '#3d5a80',
      textMuted: '#6b8ab0',
      textAccent: '#0f2644',
      
      borderPrimary: '#d1e3f3',
      borderSecondary: '#b4d0e8',
      
      accentPrimary: '#0369a1',
      accentSecondary: '#0284c7',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#d97706',
      warningBg: '#fffbeb',
      success: '#059669',
      successBg: '#ecfdf5',
      exception: '#db2777',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#0369a1',
      podName: '#1e3a5f',
      containerName: '#6b8ab0',
      searchHighlight: '#fde047',
      searchHighlightText: '#1e3a5f',
      
      buttonBg: '#eaf2fa',
      buttonBgHover: '#dce8f5',
      buttonText: '#3d5a80',
      buttonBorder: '#b4d0e8',
      
      inputBg: '#ffffff',
      inputBorder: '#b4d0e8',
      inputText: '#1e3a5f',
      inputPlaceholder: '#8aa5c4',
    },
  },

  // Sand - Warm beige light theme
  sand: {
    id: 'sand',
    name: 'Sand',
    colors: {
      bgPrimary: '#fdfcf9',
      bgSecondary: '#f7f4ed',
      bgTertiary: '#ffffff',
      bgHover: '#efe9dd',
      bgSelected: '#e3dacb',
      
      textPrimary: '#44403c',
      textSecondary: '#5c5650',
      textMuted: '#857d73',
      textAccent: '#292524',
      
      borderPrimary: '#e7e0d5',
      borderSecondary: '#d6cdc0',
      
      accentPrimary: '#b45309',
      accentSecondary: '#d97706',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#b45309',
      warningBg: '#fffbeb',
      success: '#059669',
      successBg: '#ecfdf5',
      exception: '#db2777',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#b45309',
      podName: '#44403c',
      containerName: '#857d73',
      searchHighlight: '#fde68a',
      searchHighlightText: '#44403c',
      
      buttonBg: '#f7f4ed',
      buttonBgHover: '#efe9dd',
      buttonText: '#5c5650',
      buttonBorder: '#d6cdc0',
      
      inputBg: '#ffffff',
      inputBorder: '#d6cdc0',
      inputText: '#44403c',
      inputPlaceholder: '#a8a093',
    },
  },

  // Lavender Light - Soft purple light theme
  lavenderLight: {
    id: 'lavenderLight',
    name: 'Lavender Light',
    colors: {
      bgPrimary: '#faf8fc',
      bgSecondary: '#f3eef8',
      bgTertiary: '#ffffff',
      bgHover: '#e9e0f2',
      bgSelected: '#ddd0ea',
      
      textPrimary: '#3b2d4d',
      textSecondary: '#584766',
      textMuted: '#7f6d90',
      textAccent: '#2d2040',
      
      borderPrimary: '#e5dcef',
      borderSecondary: '#d3c5e2',
      
      accentPrimary: '#7c3aed',
      accentSecondary: '#8b5cf6',
      
      error: '#dc2626',
      errorBg: '#fef2f2',
      warning: '#d97706',
      warningBg: '#fffbeb',
      success: '#059669',
      successBg: '#ecfdf5',
      exception: '#be185d',
      exceptionBg: '#fdf2f8',
      
      timestamp: '#7c3aed',
      podName: '#3b2d4d',
      containerName: '#7f6d90',
      searchHighlight: '#fde047',
      searchHighlightText: '#3b2d4d',
      
      buttonBg: '#f3eef8',
      buttonBgHover: '#e9e0f2',
      buttonText: '#584766',
      buttonBorder: '#d3c5e2',
      
      inputBg: '#ffffff',
      inputBorder: '#d3c5e2',
      inputText: '#3b2d4d',
      inputPlaceholder: '#a090b3',
    },
  },
};

// Default theme
export const defaultTheme = themes.classicDark;

// Get theme by ID or return default
export function getTheme(id: string): Theme {
  return themes[id] || defaultTheme;
}

// Get all theme options for dropdown - organized by category
export function getThemeOptions(): { id: string; name: string }[] {
  const darkThemes = ['classicDark', 'midnight', 'ocean', 'forest', 'slate', 'sunset', 'lavender', 'coffee'];
  const lightThemes = ['daylight', 'arctic', 'paper', 'mint', 'rose', 'sky', 'sand', 'lavenderLight'];
  
  return [
    // Dark themes first
    ...darkThemes.map(id => ({ id, name: `🌙 ${themes[id].name}` })),
    // Then light themes
    ...lightThemes.map(id => ({ id, name: `☀️ ${themes[id].name}` })),
  ];
}
