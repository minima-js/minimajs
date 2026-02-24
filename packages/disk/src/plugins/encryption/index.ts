import type { Disk } from "../../types.js";
import { EncryptionManager } from "./encryption.js";
import type { EncryptionOptions } from "./encryption.js";

/** String metadata key written to the driver — signals the file is encrypted */
const ENC_FLAG = "x-minimajs-encrypt";

export interface EncryptPluginOptions extends EncryptionOptions {
  /** Password for encryption/decryption */
  password: string;
}

/**
 * Encryption plugin — transparently encrypts files on write and decrypts on read.
 *
 * Uses AES-256-GCM by default. All crypto parameters (salt, IV, auth tag) are
 * embedded in the stream itself — no external metadata or sidecar files needed.
 *
 * @example
 * const disk = createDisk({ driver }, encrypt({ password: process.env.SECRET! }))
 * await disk.put('secret.txt', 'sensitive data') // stored encrypted
 * const file = await disk.get('secret.txt')      // automatically decrypted
 */
export function encryption(options: EncryptPluginOptions) {
  const { password } = options;
  const manager = new EncryptionManager(options);

  return (disk: Disk) => {
    // Mark the file as encrypted in its driver-persisted metadata
    disk.hook("put", (path, data, opts) => {
      return [path, data, { ...opts, metadata: { ...opts.metadata, [ENC_FLAG]: manager.algorithm } }];
    });

    // Wrap the stream with encryption just before it reaches the driver
    disk.hook("storing", (stream) => {
      return manager.encrypt(stream, password);
    });

    // Wrap the stream with decryption when the file is read back
    disk.hook("streaming", (stream, file) => {
      if (!file.metadata[ENC_FLAG]) return;
      return manager.decrypt(stream, password);
    });
  };
}
