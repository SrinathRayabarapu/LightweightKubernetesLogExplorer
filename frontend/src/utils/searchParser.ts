/**
 * Parse Splunk-style search queries with AND/OR operations.
 * Supports:
 * - Quoted strings (sentences): "error occurred"
 * - Unquoted words: error exception
 * - AND operation: word1 AND word2 (both must match)
 * - OR operation: word1 OR word2 (any must match)
 * - Default: space-separated words are treated as AND
 */

export interface ParsedSearchQuery {
  type: 'AND' | 'OR';
  terms: string[];
}

/**
 * Parse a search query into terms and operation type.
 * 
 * Examples:
 * - "error exception" -> { type: 'AND', terms: ['error', 'exception'] }
 * - "error OR exception" -> { type: 'OR', terms: ['error', 'exception'] }
 * - '"error occurred" AND exception' -> { type: 'AND', terms: ['error occurred', 'exception'] }
 * - '"error occurred" OR "exception thrown"' -> { type: 'OR', terms: ['error occurred', 'exception thrown'] }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  if (!query || query.trim().length === 0) {
    return { type: 'AND', terms: [] };
  }

  const trimmed = query.trim();
  
  // Check for explicit OR operation (case-insensitive)
  const orMatch = trimmed.match(/^(.+?)\s+OR\s+(.+)$/i);
  if (orMatch) {
    const left = parseTerms(orMatch[1].trim());
    const right = parseTerms(orMatch[2].trim());
    return {
      type: 'OR',
      terms: [...left, ...right],
    };
  }

  // Check for explicit AND operation (case-insensitive)
  const andMatch = trimmed.match(/^(.+?)\s+AND\s+(.+)$/i);
  if (andMatch) {
    const left = parseTerms(andMatch[1].trim());
    const right = parseTerms(andMatch[2].trim());
    return {
      type: 'AND',
      terms: [...left, ...right],
    };
  }

  // Default: treat space-separated as AND
  const terms = parseTerms(trimmed);
  return {
    type: 'AND',
    terms,
  };
}

/**
 * Parse a string into terms, handling quoted strings.
 * 
 * Examples:
 * - 'error exception' -> ['error', 'exception']
 * - '"error occurred" exception' -> ['error occurred', 'exception']
 * - '"error occurred" "exception thrown"' -> ['error occurred', 'exception thrown']
 */
function parseTerms(input: string): string[] {
  const terms: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes) {
        // End of quoted string
        if (current.trim()) {
          terms.push(current.trim());
          current = '';
        }
        inQuotes = false;
      } else {
        // Start of quoted string
        if (current.trim()) {
          terms.push(current.trim());
          current = '';
        }
        inQuotes = true;
      }
    } else if (char === ' ' && !inQuotes) {
      // Space outside quotes - term separator
      if (current.trim()) {
        terms.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }

    i++;
  }

  // Add remaining term
  if (current.trim()) {
    terms.push(current.trim());
  }

  return terms.filter(term => term.length > 0);
}

/**
 * Convert parsed query to FTS5 search query.
 * For AND: all terms must match (using FTS5 AND operator)
 * For OR: any term must match (using FTS5 OR operator)
 */
export function toFts5Query(parsed: ParsedSearchQuery): string {
  if (parsed.terms.length === 0) {
    return '';
  }

  // Escape each term and wrap in quotes for FTS5
  const escapedTerms = parsed.terms.map(term => {
    // Escape double quotes in the term
    const escaped = term.replace(/"/g, '""');
    return `"${escaped}"`;
  });

  if (parsed.type === 'OR') {
    // OR: term1 OR term2 OR term3
    return escapedTerms.join(' OR ');
  } else {
    // AND: term1 AND term2 AND term3
    return escapedTerms.join(' AND ');
  }
}
