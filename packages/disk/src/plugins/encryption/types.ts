import type { EncryptionOptions } from "./encryption.js";

/**
 * Encryption plugin options
 */

export interface EncryptPluginOptions extends EncryptionOptions {
  /** Password for encryption/decryption */
  password: string;
  /** Enable encryption on put operations (default: true) */
  encryptOnPut?: boolean;
  /** Enable decryption on get operations (default: true) */
  decryptOnGet?: boolean;
} /**
 * Encryption metadata structure
 */

export interface EncryptionMetadata {
  /** Initialization vector */
  iv: Buffer;
  /** Authentication tag (for AEAD ciphers) */
  authTag?: Buffer;
  /** Salt used for key derivation */
  salt: Buffer;
  /** Algorithm used */
  algorithm: string;
}
