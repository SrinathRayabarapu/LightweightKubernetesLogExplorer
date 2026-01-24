/**
 * Theme configuration for K8s Log Explorer.
 * Contains multiple color themes that can be applied to the UI.
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
  // Default dark theme (current)
  dark: {
    id: 'dark',
    name: '🌙 Dark',
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

  // Light theme
  light: {
    id: 'light',
    name: '☀️ Light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      bgTertiary: '#fafafa',
      bgHover: '#f0f0f0',
      bgSelected: '#e8e8e8',
      
      textPrimary: '#1a1a1a',
      textSecondary: '#555',
      textMuted: '#888',
      textAccent: '#000',
      
      borderPrimary: '#e0e0e0',
      borderSecondary: '#ccc',
      
      accentPrimary: '#0066cc',
      accentSecondary: '#0088ff',
      
      error: '#d32f2f',
      errorBg: '#ffebee',
      warning: '#f57c00',
      warningBg: '#fff3e0',
      success: '#388e3c',
      successBg: '#e8f5e9',
      exception: '#c2185b',
      exceptionBg: '#fce4ec',
      
      timestamp: '#0066cc',
      podName: '#333',
      containerName: '#666',
      searchHighlight: '#ffeb3b',
      searchHighlightText: '#000',
      
      buttonBg: '#f5f5f5',
      buttonBgHover: '#e8e8e8',
      buttonText: '#333',
      buttonBorder: '#ccc',
      
      inputBg: '#fff',
      inputBorder: '#ccc',
      inputText: '#333',
      inputPlaceholder: '#999',
    },
  },

  // Dracula theme
  dracula: {
    id: 'dracula',
    name: '🧛 Dracula',
    colors: {
      bgPrimary: '#282a36',
      bgSecondary: '#21222c',
      bgTertiary: '#2d2f3d',
      bgHover: '#44475a',
      bgSelected: '#44475a',
      
      textPrimary: '#f8f8f2',
      textSecondary: '#bfbfbf',
      textMuted: '#6272a4',
      textAccent: '#fff',
      
      borderPrimary: '#44475a',
      borderSecondary: '#6272a4',
      
      accentPrimary: '#bd93f9',
      accentSecondary: '#ff79c6',
      
      error: '#ff5555',
      errorBg: '#3d2a2a',
      warning: '#f1fa8c',
      warningBg: '#3d3a2a',
      success: '#50fa7b',
      successBg: '#2a3d2a',
      exception: '#ff79c6',
      exceptionBg: '#3d2a35',
      
      timestamp: '#8be9fd',
      podName: '#f8f8f2',
      containerName: '#6272a4',
      searchHighlight: '#f1fa8c',
      searchHighlightText: '#282a36',
      
      buttonBg: '#44475a',
      buttonBgHover: '#6272a4',
      buttonText: '#f8f8f2',
      buttonBorder: '#6272a4',
      
      inputBg: '#44475a',
      inputBorder: '#6272a4',
      inputText: '#f8f8f2',
      inputPlaceholder: '#6272a4',
    },
  },

  // Monokai theme
  monokai: {
    id: 'monokai',
    name: '🎨 Monokai',
    colors: {
      bgPrimary: '#272822',
      bgSecondary: '#1e1f1a',
      bgTertiary: '#2d2e27',
      bgHover: '#3e3d32',
      bgSelected: '#49483e',
      
      textPrimary: '#f8f8f2',
      textSecondary: '#cfcfc2',
      textMuted: '#75715e',
      textAccent: '#fff',
      
      borderPrimary: '#3e3d32',
      borderSecondary: '#49483e',
      
      accentPrimary: '#a6e22e',
      accentSecondary: '#66d9ef',
      
      error: '#f92672',
      errorBg: '#3d272d',
      warning: '#e6db74',
      warningBg: '#3d3a27',
      success: '#a6e22e',
      successBg: '#2d3d27',
      exception: '#fd971f',
      exceptionBg: '#3d3027',
      
      timestamp: '#66d9ef',
      podName: '#f8f8f2',
      containerName: '#75715e',
      searchHighlight: '#e6db74',
      searchHighlightText: '#272822',
      
      buttonBg: '#3e3d32',
      buttonBgHover: '#49483e',
      buttonText: '#f8f8f2',
      buttonBorder: '#49483e',
      
      inputBg: '#3e3d32',
      inputBorder: '#49483e',
      inputText: '#f8f8f2',
      inputPlaceholder: '#75715e',
    },
  },

  // Nord theme
  nord: {
    id: 'nord',
    name: '❄️ Nord',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#292e39',
      bgTertiary: '#3b4252',
      bgHover: '#434c5e',
      bgSelected: '#4c566a',
      
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      textMuted: '#a0a8b7',
      textAccent: '#fff',
      
      borderPrimary: '#3b4252',
      borderSecondary: '#4c566a',
      
      accentPrimary: '#88c0d0',
      accentSecondary: '#81a1c1',
      
      error: '#bf616a',
      errorBg: '#3d2e31',
      warning: '#ebcb8b',
      warningBg: '#3d3a30',
      success: '#a3be8c',
      successBg: '#2e3d30',
      exception: '#b48ead',
      exceptionBg: '#362e3d',
      
      timestamp: '#88c0d0',
      podName: '#eceff4',
      containerName: '#a0a8b7',
      searchHighlight: '#ebcb8b',
      searchHighlightText: '#2e3440',
      
      buttonBg: '#3b4252',
      buttonBgHover: '#4c566a',
      buttonText: '#eceff4',
      buttonBorder: '#4c566a',
      
      inputBg: '#3b4252',
      inputBorder: '#4c566a',
      inputText: '#eceff4',
      inputPlaceholder: '#a0a8b7',
    },
  },

  // Solarized Dark theme
  solarizedDark: {
    id: 'solarizedDark',
    name: '🌅 Solarized Dark',
    colors: {
      bgPrimary: '#002b36',
      bgSecondary: '#001f27',
      bgTertiary: '#073642',
      bgHover: '#094452',
      bgSelected: '#0a5464',
      
      textPrimary: '#839496',
      textSecondary: '#93a1a1',
      textMuted: '#657b83',
      textAccent: '#fdf6e3',
      
      borderPrimary: '#073642',
      borderSecondary: '#094452',
      
      accentPrimary: '#268bd2',
      accentSecondary: '#2aa198',
      
      error: '#dc322f',
      errorBg: '#2b1f1f',
      warning: '#b58900',
      warningBg: '#2b2a1f',
      success: '#859900',
      successBg: '#1f2b1f',
      exception: '#d33682',
      exceptionBg: '#2b1f27',
      
      timestamp: '#2aa198',
      podName: '#839496',
      containerName: '#657b83',
      searchHighlight: '#b58900',
      searchHighlightText: '#002b36',
      
      buttonBg: '#073642',
      buttonBgHover: '#094452',
      buttonText: '#93a1a1',
      buttonBorder: '#094452',
      
      inputBg: '#073642',
      inputBorder: '#094452',
      inputText: '#839496',
      inputPlaceholder: '#657b83',
    },
  },

  // GitHub Dark theme
  githubDark: {
    id: 'githubDark',
    name: '🐙 GitHub Dark',
    colors: {
      bgPrimary: '#0d1117',
      bgSecondary: '#010409',
      bgTertiary: '#161b22',
      bgHover: '#21262d',
      bgSelected: '#30363d',
      
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      textAccent: '#f0f6fc',
      
      borderPrimary: '#21262d',
      borderSecondary: '#30363d',
      
      accentPrimary: '#58a6ff',
      accentSecondary: '#79c0ff',
      
      error: '#f85149',
      errorBg: '#21161b',
      warning: '#d29922',
      warningBg: '#211f17',
      success: '#3fb950',
      successBg: '#16211b',
      exception: '#f778ba',
      exceptionBg: '#21161f',
      
      timestamp: '#79c0ff',
      podName: '#c9d1d9',
      containerName: '#6e7681',
      searchHighlight: '#d29922',
      searchHighlightText: '#0d1117',
      
      buttonBg: '#21262d',
      buttonBgHover: '#30363d',
      buttonText: '#c9d1d9',
      buttonBorder: '#30363d',
      
      inputBg: '#0d1117',
      inputBorder: '#30363d',
      inputText: '#c9d1d9',
      inputPlaceholder: '#6e7681',
    },
  },

  // Cyberpunk theme
  cyberpunk: {
    id: 'cyberpunk',
    name: '🌆 Cyberpunk',
    colors: {
      bgPrimary: '#0a0a0f',
      bgSecondary: '#05050a',
      bgTertiary: '#12121a',
      bgHover: '#1a1a25',
      bgSelected: '#252535',
      
      textPrimary: '#00ffff',
      textSecondary: '#00cccc',
      textMuted: '#008888',
      textAccent: '#ff00ff',
      
      borderPrimary: '#1a1a2a',
      borderSecondary: '#ff00ff40',
      
      accentPrimary: '#ff00ff',
      accentSecondary: '#00ffff',
      
      error: '#ff0055',
      errorBg: '#1a0011',
      warning: '#ffff00',
      warningBg: '#1a1a00',
      success: '#00ff66',
      successBg: '#001a0d',
      exception: '#ff6600',
      exceptionBg: '#1a0d00',
      
      timestamp: '#00ffff',
      podName: '#ff00ff',
      containerName: '#008888',
      searchHighlight: '#ffff00',
      searchHighlightText: '#0a0a0f',
      
      buttonBg: '#1a1a25',
      buttonBgHover: '#ff00ff30',
      buttonText: '#00ffff',
      buttonBorder: '#ff00ff',
      
      inputBg: '#12121a',
      inputBorder: '#ff00ff60',
      inputText: '#00ffff',
      inputPlaceholder: '#008888',
    },
  },

  // High Contrast theme
  highContrast: {
    id: 'highContrast',
    name: '👁️ High Contrast',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#000000',
      bgTertiary: '#0a0a0a',
      bgHover: '#1a1a1a',
      bgSelected: '#2a2a2a',
      
      textPrimary: '#ffffff',
      textSecondary: '#ffffff',
      textMuted: '#cccccc',
      textAccent: '#ffff00',
      
      borderPrimary: '#ffffff',
      borderSecondary: '#ffff00',
      
      accentPrimary: '#00ffff',
      accentSecondary: '#ffff00',
      
      error: '#ff0000',
      errorBg: '#330000',
      warning: '#ffff00',
      warningBg: '#333300',
      success: '#00ff00',
      successBg: '#003300',
      exception: '#ff00ff',
      exceptionBg: '#330033',
      
      timestamp: '#00ffff',
      podName: '#ffffff',
      containerName: '#cccccc',
      searchHighlight: '#ffff00',
      searchHighlightText: '#000000',
      
      buttonBg: '#000000',
      buttonBgHover: '#333333',
      buttonText: '#ffffff',
      buttonBorder: '#ffffff',
      
      inputBg: '#000000',
      inputBorder: '#ffffff',
      inputText: '#ffffff',
      inputPlaceholder: '#888888',
    },
  },
};

// Default theme
export const defaultTheme = themes.dark;

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
