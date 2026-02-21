/**
 * Storage quota management and enforcement
 */

export interface QuotaConfig {
  /** Maximum total storage in bytes */
  maxStorage?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum size per file in bytes */
  maxFileSize?: number;
  /** Callback when quota is exceeded */
  onQuotaExceeded?: (type: "storage" | "files" | "fileSize", current: number, limit: number) => void;
}

export interface QuotaStats {
  /** Total storage used in bytes */
  totalStorage: number;
  /** Number of files */
  totalFiles: number;
  /** Largest file size in bytes */
  largestFileSize: number;
  /** Available storage in bytes (null if no limit) */
  availableStorage: number | null;
  /** Available file slots (null if no limit) */
  availableFiles: number | null;
}

/**
 * Manages storage quotas and enforces limits
 */
export class QuotaManager {
  private totalStorage = 0;
  private totalFiles = 0;
  private largestFileSize = 0;
  private fileSizes = new Map<string, number>();

  private readonly maxStorage?: number;
  private readonly maxFiles?: number;
  private readonly maxFileSize?: number;
  private readonly onQuotaExceeded?: QuotaConfig["onQuotaExceeded"];

  constructor(config: QuotaConfig = {}) {
    this.maxStorage = config.maxStorage;
    this.maxFiles = config.maxFiles;
    this.maxFileSize = config.maxFileSize;
    this.onQuotaExceeded = config.onQuotaExceeded;
  }

  /**
   * Check if a file upload would exceed quotas
   */
  canUpload(size: number): { allowed: boolean; reason?: string } {
    // Check file size limit
    if (this.maxFileSize !== undefined && size > this.maxFileSize) {
      this.onQuotaExceeded?.("fileSize", size, this.maxFileSize);
      return {
        allowed: false,
        reason: `File size ${size} bytes exceeds maximum ${this.maxFileSize} bytes`,
      };
    }

    // Check storage limit
    if (this.maxStorage !== undefined && this.totalStorage + size > this.maxStorage) {
      this.onQuotaExceeded?.("storage", this.totalStorage + size, this.maxStorage);
      return {
        allowed: false,
        reason: `Upload would exceed storage quota (${this.totalStorage + size} > ${this.maxStorage} bytes)`,
      };
    }

    // Check file count limit
    if (this.maxFiles !== undefined && this.totalFiles >= this.maxFiles) {
      this.onQuotaExceeded?.("files", this.totalFiles + 1, this.maxFiles);
      return {
        allowed: false,
        reason: `Maximum number of files reached (${this.maxFiles})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Track a new file upload
   */
  trackUpload(key: string, size: number): void {
    const existingSize = this.fileSizes.get(key);

    if (existingSize !== undefined) {
      // Update existing file
      this.totalStorage = this.totalStorage - existingSize + size;
      this.fileSizes.set(key, size);
    } else {
      // New file
      this.totalStorage += size;
      this.totalFiles++;
      this.fileSizes.set(key, size);
    }

    if (size > this.largestFileSize) {
      this.largestFileSize = size;
    }
  }

  /**
   * Track a file deletion
   */
  trackDeletion(key: string): void {
    const size = this.fileSizes.get(key);
    if (size !== undefined) {
      this.totalStorage -= size;
      this.totalFiles--;
      this.fileSizes.delete(key);

      // Recalculate largest file size if needed
      if (size === this.largestFileSize) {
        this.largestFileSize = Math.max(0, ...this.fileSizes.values());
      }
    }
  }

  /**
   * Get current quota statistics
   */
  getStats(): QuotaStats {
    return {
      totalStorage: this.totalStorage,
      totalFiles: this.totalFiles,
      largestFileSize: this.largestFileSize,
      availableStorage: this.maxStorage !== undefined ? this.maxStorage - this.totalStorage : null,
      availableFiles: this.maxFiles !== undefined ? this.maxFiles - this.totalFiles : null,
    };
  }

  /**
   * Get file size for a specific key
   */
  getFileSize(key: string): number | null {
    return this.fileSizes.get(key) ?? null;
  }

  /**
   * Reset quota tracking
   */
  reset(): void {
    this.totalStorage = 0;
    this.totalFiles = 0;
    this.largestFileSize = 0;
    this.fileSizes.clear();
  }

  /**
   * Get quota usage percentage
   */
  getUsagePercentage(): { storage: number | null; files: number | null } {
    return {
      storage: this.maxStorage !== undefined ? (this.totalStorage / this.maxStorage) * 100 : null,
      files: this.maxFiles !== undefined ? (this.totalFiles / this.maxFiles) * 100 : null,
    };
  }
}
