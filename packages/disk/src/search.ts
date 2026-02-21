import type { FileMetadata } from "./types.js";

/**
 * Search options
 */
export interface SearchOptions {
  /** Pattern to match against file paths (glob-style) */
  pattern?: string;
  /** Search in file content (default: false) */
  searchContent?: boolean;
  /** Content search query */
  contentQuery?: string;
  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean;
  /** Maximum results to return */
  limit?: number;
  /** File type filter (MIME types) */
  fileTypes?: string[];
  /** Minimum file size in bytes */
  minSize?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Modified after timestamp */
  modifiedAfter?: number;
  /** Modified before timestamp */
  modifiedBefore?: number;
}

/**
 * Search result
 */
export interface SearchResult {
  /** File key */
  key: string;
  /** File metadata */
  metadata: FileMetadata;
  /** Relevance score (0-1) */
  score: number;
  /** Matching content snippets */
  snippets?: string[];
}

/**
 * Search engine for files
 */
export class SearchEngine {
  /**
   * Check if a key matches a glob pattern
   */
  private matchesPattern(key: string, pattern: string, caseSensitive: boolean): boolean {
    const flags = caseSensitive ? "" : "i";

    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, flags);
    return regex.test(key);
  }

  /**
   * Search content for a query
   */
  private async searchInContent(
    content: string,
    query: string,
    caseSensitive: boolean
  ): Promise<{ found: boolean; snippets: string[] }> {
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

    const matches = content.match(regex);
    if (!matches || matches.length === 0) {
      return { found: false, snippets: [] };
    }

    // Extract snippets around matches
    const snippets: string[] = [];
    const snippetLength = 100;

    let match;
    const execRegex = new RegExp(regex.source, flags);

    while ((match = execRegex.exec(content)) !== null && snippets.length < 3) {
      const matchIndex = match.index;
      const start = Math.max(0, matchIndex - snippetLength / 2);
      const end = Math.min(content.length, matchIndex + match[0].length + snippetLength / 2);

      let snippet = content.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";

      snippets.push(snippet);
    }

    return { found: true, snippets };
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(key: string, metadata: FileMetadata, options: SearchOptions, hasContentMatch: boolean): number {
    let score = 0;

    // Pattern match score
    if (options.pattern) {
      const exactMatch = key === options.pattern;
      const patternMatch = this.matchesPattern(key, options.pattern, options.caseSensitive ?? false);

      if (exactMatch) score += 1.0;
      else if (patternMatch) score += 0.7;
    } else {
      score += 0.5;
    }

    // Content match score
    if (hasContentMatch) {
      score += 0.8;
    }

    // File type match score
    if (options.fileTypes && metadata.type && options.fileTypes.includes(metadata.type)) {
      score += 0.3;
    }

    // Recency score (files modified more recently score higher)
    if (metadata.lastModified) {
      const daysSinceModified = (Date.now() - metadata.lastModified) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceModified / 365);
      score += recencyScore * 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Check if metadata matches filters
   */
  matchesFilters(key: string, metadata: FileMetadata, options: SearchOptions): boolean {
    // Pattern matching
    if (options.pattern && !this.matchesPattern(key, options.pattern, options.caseSensitive ?? false)) {
      return false;
    }

    // File type filter
    if (options.fileTypes && options.fileTypes.length > 0) {
      if (!metadata.type || !options.fileTypes.includes(metadata.type)) {
        return false;
      }
    }

    // Size filters
    if (options.minSize !== undefined && metadata.size < options.minSize) {
      return false;
    }

    if (options.maxSize !== undefined && metadata.size > options.maxSize) {
      return false;
    }

    // Date filters
    if (metadata.lastModified) {
      if (options.modifiedAfter !== undefined && metadata.lastModified < options.modifiedAfter) {
        return false;
      }

      if (options.modifiedBefore !== undefined && metadata.lastModified > options.modifiedBefore) {
        return false;
      }
    }

    return true;
  }

  /**
   * Search files and create results
   */
  async createSearchResult(
    key: string,
    metadata: FileMetadata,
    options: SearchOptions,
    getContent?: () => Promise<string>
  ): Promise<SearchResult | null> {
    let hasContentMatch = false;
    let snippets: string[] = [];

    // Content search if requested
    if (options.searchContent && options.contentQuery && getContent) {
      try {
        const content = await getContent();
        const result = await this.searchInContent(content, options.contentQuery, options.caseSensitive ?? false);
        hasContentMatch = result.found;
        snippets = result.snippets;

        if (!hasContentMatch && options.contentQuery) {
          // If content search is enabled and query is provided, only return files with content matches
          return null;
        }
      } catch {
        // Ignore content read errors
      }
    }

    const score = this.calculateScore(key, metadata, options, hasContentMatch);

    return {
      key,
      metadata,
      score,
      snippets: snippets.length > 0 ? snippets : undefined,
    };
  }

  /**
   * Sort search results by score
   */
  sortResults(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => b.score - a.score);
  }
}
