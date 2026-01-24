/**
 * Log filter configuration.
 * 
 * Add patterns or text strings to exclude certain logs from being displayed.
 * Patterns are case-insensitive and will match if the log message contains the pattern.
 * 
 * You can use:
 * - Simple text: "healthcheck" - matches any log containing "healthcheck"
 * - Regex patterns: "^DEBUG:" - matches logs starting with "DEBUG:"
 */

export interface LogFilterConfig {
  // Patterns to exclude from log display (case-insensitive)
  excludePatterns: string[];
  
  // Whether exclusion filtering is enabled
  enabled: boolean;
}

// Default log exclusion patterns
// Add your patterns here to exclude unwanted logs
export const logFilterConfig: LogFilterConfig = {
  enabled: true,
  excludePatterns: [
    // Health check and readiness probe logs
    'healthcheck',
    'health-check',
    'readiness',
    'liveness',
    '/health',
    '/ready',
    '/actuator/health',
    
    // Heartbeat and ping logs
    'heartbeat',
    'ping',
    
    // Metrics endpoint logs
    '/metrics',
    '/actuator/prometheus',
    
    // Add more patterns below as needed:
    'com.jio.ngo',
    'jio.ngo.common.service'
  ],
};

/**
 * Check if a log message should be excluded based on the configured patterns.
 * 
 * @param message - The log message to check
 * @returns true if the message should be excluded, false otherwise
 */
export function shouldExcludeLog(message: string): boolean {
  if (!logFilterConfig.enabled || !message) {
    return false;
  }
  
  const lowerMessage = message.toLowerCase();
  
  return logFilterConfig.excludePatterns.some(pattern => {
    const lowerPattern = pattern.toLowerCase();
    
    // Check if pattern looks like a regex (starts with ^ or contains special chars)
    if (pattern.startsWith('^') || pattern.startsWith('.*') || pattern.includes('\\')) {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(message);
      } catch {
        // If regex is invalid, treat as plain text
        return lowerMessage.includes(lowerPattern);
      }
    }
    
    // Simple text match
    return lowerMessage.includes(lowerPattern);
  });
}

/**
 * Filter logs based on exclusion patterns.
 * 
 * @param logs - Array of log entries
 * @returns Filtered array with excluded logs removed
 */
export function filterLogs<T extends { message: string }>(logs: T[]): T[] {
  if (!logFilterConfig.enabled) {
    return logs;
  }
  
  return logs.filter(log => !shouldExcludeLog(log.message));
}
