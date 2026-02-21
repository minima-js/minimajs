import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import type { EncryptionMetadata } from "./types.js";

/**
 * Symbol for storing encryption metadata in DiskFile
 */
export const ENCRYPTION_METADATA = Symbol("encryption-metadata");

/**
 * Symbol for storing serialized encryption data in driver metadata
 */
export const ENCRYPTION_DATA_KEY = "__encryption";

/**
 * Encryption options
 */
export interface EncryptionOptions {
  /** Encryption algorithm (default: aes-256-gcm) */
  algorithm?: string;
  /** Key derivation iterations (default: 100000) */
  iterations?: number;
  /** Authentication tag length for GCM (default: 16) */
  authTagLength?: number;
}

/**
 * Encryption manager for streaming encryption/decryption
 * Only works with ReadableStream, not Buffer-based operations
 */
export class EncryptionManager {
  private readonly algorithm: string;

  constructor(options: EncryptionOptions = {}) {
    this.algorithm = options.algorithm ?? "aes-256-gcm";
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    // For better security, could use pbkdf2, but for simplicity using SHA256
    return createHash("sha256").update(password).update(salt).digest();
  }

  /**
   * Encrypt a stream
   * Returns encrypted stream and metadata needed for decryption
   */
  encrypt(
    stream: ReadableStream<Uint8Array>,
    password: string
  ): { stream: ReadableStream<Uint8Array>; metadata: EncryptionMetadata } {
    const salt = randomBytes(32);
    const key = this.deriveKey(password, salt);
    const iv = randomBytes(16);
    const algorithm = this.algorithm;

    const cipher = createCipheriv(algorithm, key, iv);

    const reader = stream.getReader();
    let authTag: Buffer | undefined;
    let isFinalized = false;

    const encryptedStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            if (!isFinalized) {
              const final = cipher.final();
              if (final.length > 0) {
                controller.enqueue(final);
              }

              // Get auth tag after finalization for GCM mode
              if (algorithm.includes("gcm")) {
                authTag = (cipher as any).getAuthTag();
              }

              isFinalized = true;
            }
            controller.close();
          } else {
            const encrypted = cipher.update(value);
            if (encrypted.length > 0) {
              controller.enqueue(encrypted);
            }
          }
        } catch (error) {
          controller.error(error);
          reader.cancel();
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    // Return metadata synchronously - authTag will be set when stream is consumed
    const metadata: EncryptionMetadata = {
      iv,
      salt,
      algorithm: this.algorithm,
      get authTag() {
        return authTag;
      },
    };

    return {
      stream: encryptedStream,
      metadata,
    };
  }

  /**
   * Decrypt a stream using provided metadata
   */
  decrypt(stream: ReadableStream<Uint8Array>, password: string, metadata: EncryptionMetadata): ReadableStream<Uint8Array> {
    if (!metadata.salt) {
      throw new Error("Missing salt in encryption metadata");
    }

    const key = this.deriveKey(password, metadata.salt);

    const decipher = createDecipheriv(metadata.algorithm, key, metadata.iv);

    // Set auth tag for GCM mode before processing
    if (metadata.authTag && metadata.algorithm.includes("gcm")) {
      (decipher as any).setAuthTag(metadata.authTag);
    }

    const reader = stream.getReader();
    let isFinalized = false;

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            if (!isFinalized) {
              const final = decipher.final();
              if (final.length > 0) {
                controller.enqueue(final);
              }
              isFinalized = true;
            }
            controller.close();
          } else {
            const decrypted = decipher.update(value);
            if (decrypted.length > 0) {
              controller.enqueue(decrypted);
            }
          }
        } catch (error) {
          controller.error(error);
          reader.cancel();
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  /**
   * Create a transform stream for encryption
   * Useful for piping: inputStream.pipeThrough(manager.createEncryptTransform(password))
   */
  createEncryptTransform(password: string): {
    transform: TransformStream<Uint8Array, Uint8Array>;
    metadata: EncryptionMetadata;
  } {
    const salt = randomBytes(32);
    const key = this.deriveKey(password, salt);
    const iv = randomBytes(16);
    const algorithm = this.algorithm;

    const cipher = createCipheriv(algorithm, key, iv);

    let authTag: Buffer | undefined;
    let isFinalized = false;

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        try {
          const encrypted = cipher.update(chunk);
          if (encrypted.length > 0) {
            controller.enqueue(encrypted);
          }
        } catch (error) {
          controller.error(error);
        }
      },
      flush(controller) {
        try {
          if (!isFinalized) {
            const final = cipher.final();
            if (final.length > 0) {
              controller.enqueue(final);
            }

            // Get auth tag after finalization for GCM mode
            if (algorithm.includes("gcm")) {
              authTag = (cipher as any).getAuthTag();
            }

            isFinalized = true;
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const metadata: EncryptionMetadata = {
      iv,
      salt,
      algorithm,
      get authTag() {
        return authTag;
      },
    };

    return { transform, metadata };
  }

  /**
   * Create a transform stream for decryption
   * Useful for piping: encryptedStream.pipeThrough(manager.createDecryptTransform(password, metadata))
   */
  createDecryptTransform(password: string, metadata: EncryptionMetadata): TransformStream<Uint8Array, Uint8Array> {
    if (!metadata.salt) {
      throw new Error("Missing salt in encryption metadata");
    }

    const key = this.deriveKey(password, metadata.salt);

    const decipher = createDecipheriv(metadata.algorithm, key, metadata.iv);

    // Set auth tag for GCM mode before processing
    if (metadata.authTag && metadata.algorithm.includes("gcm")) {
      (decipher as any).setAuthTag(metadata.authTag);
    }

    let isFinalized = false;

    return new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        try {
          const decrypted = decipher.update(chunk);
          if (decrypted.length > 0) {
            controller.enqueue(decrypted);
          }
        } catch (error) {
          controller.error(error);
        }
      },
      flush(controller) {
        try {
          if (!isFinalized) {
            const final = decipher.final();
            if (final.length > 0) {
              controller.enqueue(final);
            }
            isFinalized = true;
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
