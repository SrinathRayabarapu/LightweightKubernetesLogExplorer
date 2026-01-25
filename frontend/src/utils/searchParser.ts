/**
 * Parse Splunk-style search queries with AND/OR/NOT operations.
 * Supports:
 * - Quoted strings (sentences): "error occurred"
 * - Unquoted words: error exception
 * - AND operation: word1 AND word2 (both must match)
 * - OR operation: word1 OR word2 (any must match)
 * - NOT operation: word1 NOT word2 (must NOT contain word2)
 * - Default: space-separated words are treated as AND
 */

export interface ParsedSearchQuery {
  type: 'AND' | 'OR';
  terms: string[];      // Terms that MUST match
  notTerms: string[];   // Terms that must NOT match
}

/**
 * Parse a search query into terms and operation type.
 * 
 * Examples:
 * - "error exception" -> { type: 'AND', terms: ['error', 'exception'], notTerms: [] }
 * - "error OR exception" -> { type: 'OR', terms: ['error', 'exception'], notTerms: [] }
 * - "error NOT timeout" -> { type: 'AND', terms: ['error'], notTerms: ['timeout'] }
 * - "error AND exception NOT debug" -> { type: 'AND', terms: ['error', 'exception'], notTerms: ['debug'] }
 * - '"error occurred" NOT "retry failed"' -> { type: 'AND', terms: ['error occurred'], notTerms: ['retry failed'] }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  if (!query || query.trim().length === 0) {
    return { type: 'AND', terms: [], notTerms: [] };
  }

  const trimmed = query.trim();
  
  // First, extract NOT terms from the query
  // Pattern: NOT followed by a quoted string or a word
  const notTerms: string[] = [];
  let remainingQuery = trimmed;
  
  // Handle NOT with quoted strings: NOT "phrase here" (can be at start or middle)
  const notQuotedRegex = /(?:^|\s+)NOT\s+"([^"]+)"/gi;
  let match;
  while ((match = notQuotedRegex.exec(trimmed)) !== null) {
    notTerms.push(match[1]);
  }
  remainingQuery = remainingQuery.replace(/(?:^|\s+)NOT\s+"[^"]+"/gi, '');
  
  // Handle NOT with single words: NOT word (can be at start or middle)
  const notWordRegex = /(?:^|\s+)NOT\s+(\S+)/gi;
  while ((match = notWordRegex.exec(trimmed)) !== null) {
    // Skip if this was already captured as a quoted string
    if (!notTerms.includes(match[1])) {
      notTerms.push(match[1]);
    }
  }
  remainingQuery = remainingQuery.replace(/(?:^|\s+)NOT\s+\S+/gi, '');
  
  // Clean up any extra whitespace
  remainingQuery = remainingQuery.trim();
  
  // If nothing left after removing NOT terms, return empty
  if (!remainingQuery) {
    return { type: 'AND', terms: [], notTerms };
  }
  
  // Check for explicit OR operation (case-insensitive)
  const orMatch = remainingQuery.match(/^(.+?)\s+OR\s+(.+)$/i);
  if (orMatch) {
    const left = parseTerms(orMatch[1].trim());
    const right = parseTerms(orMatch[2].trim());
    return {
      type: 'OR',
      terms: [...left, ...right],
      notTerms,
    };
  }

  // Check for explicit AND operation (case-insensitive)
  const andMatch = remainingQuery.match(/^(.+?)\s+AND\s+(.+)$/i);
  if (andMatch) {
    const left = parseTerms(andMatch[1].trim());
    const right = parseTerms(andMatch[2].trim());
    return {
      type: 'AND',
      terms: [...left, ...right],
      notTerms,
    };
  }

  // Default: treat space-separated as AND
  const terms = parseTerms(remainingQuery);
  return {
    type: 'AND',
    terms,
    notTerms,
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
 * Check if a term needs quoting for FTS5.
 * Terms need quoting if they contain:
 * - Spaces (multi-word phrases)
 * - FTS5 special characters that could be misinterpreted
 */
function needsQuoting(term: string): boolean {
  // Quote if contains spaces (phrase)
  if (term.includes(' ')) {
    return true;
  }
  // Quote if contains FTS5 special characters
  // These include: + - * ^ " ( ) : .
  const specialChars = /[+\-*^"():\.]/;
  return specialChars.test(term);
}

/**
 * Escape a term for FTS5 query.
 * If the term needs quoting (has spaces or special chars), wrap in quotes.
 * Otherwise, use as-is for better matching.
 */
function escapeFts5Term(term: string): string {
  if (needsQuoting(term)) {
    // Escape double quotes in the term by doubling them
    const escaped = term.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  // Single word without special chars - use as-is
  return term;
}

/**
 * Convert parsed query to FTS5 search query.
 * For AND: all terms must match (using FTS5 AND operator)
 * For OR: any term must match (using FTS5 OR operator)
 * NOT terms are appended with NOT operator
 */
export function toFts5Query(parsed: ParsedSearchQuery): string {
  if (parsed.terms.length === 0 && parsed.notTerms.length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Build positive terms part
  if (parsed.terms.length > 0) {
    const escapedTerms = parsed.terms.map(escapeFts5Term);
    if (parsed.type === 'OR') {
      parts.push(escapedTerms.join(' OR '));
    } else {
      parts.push(escapedTerms.join(' AND '));
    }
  }

  // Append NOT terms
  if (parsed.notTerms.length > 0) {
    const escapedNotTerms = parsed.notTerms.map(escapeFts5Term);
    for (const notTerm of escapedNotTerms) {
      parts.push(`NOT ${notTerm}`);
    }
  }

  return parts.join(' ');
}
