/**
 * Base class for all disk-related errors
 */
export class DiskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when a file cannot be read from storage
 */
export class DiskReadError extends DiskError {
  constructor(
    public readonly href: string,
    message?: string
  ) {
    super(message || `Failed to read file: ${href}`);
  }
}

/**
 * Thrown when a file cannot be written to storage
 */
export class DiskWriteError extends DiskError {
  constructor(
    public readonly href: string,
    message?: string
  ) {
    super(message || `Failed to write file: ${href}`);
  }
}

/**
 * Thrown when a file is not found in storage
 */
export class DiskFileNotFoundError extends DiskError {
  constructor(public readonly href: string) {
    super(`File not found: ${href}`);
  }
}

/**
 * Thrown when a file already exists and overwrite is not allowed
 */
export class DiskFileExistsError extends DiskError {
  constructor(public readonly href: string) {
    super(`File already exists: ${href}`);
  }
}

/**
 * Thrown when a copy operation fails
 */
export class DiskCopyError extends DiskError {
  constructor(
    public readonly from: string,
    public readonly to: string,
    message?: string
  ) {
    super(message || `Failed to copy file from ${from} to ${to}`);
  }
}

/**
 * Thrown when a move operation fails
 */
export class DiskMoveError extends DiskError {
  constructor(
    public readonly from: string,
    public readonly to: string,
    message?: string
  ) {
    super(message || `Failed to move file from ${from} to ${to}`);
  }
}

/**
 * Thrown when a delete operation fails
 */
export class DiskDeleteError extends DiskError {
  constructor(
    public readonly href: string,
    message?: string
  ) {
    super(message || `Failed to delete file: ${href}`);
  }
}

/**
 * Thrown when URL generation fails
 */
export class DiskUrlError extends DiskError {
  constructor(
    public readonly href: string,
    message?: string
  ) {
    super(message || `Failed to generate URL for file: ${href}`);
  }
}

/**
 * Thrown when metadata cannot be retrieved
 */
export class DiskMetadataError extends DiskError {
  constructor(
    public readonly href: string,
    message?: string
  ) {
    super(message || `Failed to get metadata for file: ${href}`);
  }
}

/**
 * Thrown when a driver configuration is invalid
 */
export class DiskConfigError extends DiskError {
  constructor(message: string) {
    super(message);
  }
}
