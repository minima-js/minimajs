import { DiskConfigError } from "../../errors.js";
import type { Disk } from "../../types.js";
import { EncryptionManager } from "./encryption.js";
import type { EncryptionOptions } from "./encryption.js";

export type { EncryptionOptions };

/** String metadata key written to the driver — signals the file is encrypted */
const ENC_FLAG = "x-minimajs-encrypt";

/**
 * Encryption plugin — transparently encrypts files on write and decrypts on read.
 *
 * Uses AES-256-GCM by default. All crypto parameters (salt, IV, auth tag) are
 * embedded in the stream itself — no external metadata or sidecar files needed.
 *
 * **Requires `capabilities.metadata = true` on the driver.** The encryption flag
 * (`x-minimajs-encrypt`) is stored in file metadata so the decryption hook knows
 * which files to decrypt. Drivers that do not support metadata cannot use this plugin.
 *
 * @example
 * const disk = createDisk({ driver }, encrypt({ password: process.env.SECRET! }))
 * await disk.put('secret.txt', 'sensitive data') // stored encrypted
 * const file = await disk.get('secret.txt')      // automatically decrypted
 */
export function encryption(options: EncryptionOptions) {
  const manager = new EncryptionManager(options);

  return (disk: Disk) => {
    if (!disk.driver.capabilities?.metadata) {
      throw new DiskConfigError(
        `encryption() requires driver metadata support, but "${disk.driver.name}" driver ` +
          `has capabilities.metadata = false or unset. Enable metadata on the driver to use this plugin.`
      );
    }

    // Mark the file as encrypted in its driver-persisted metadata
    disk.hook("put", (path, data, opts) => {
      return [path, data, { ...opts, metadata: { ...opts.metadata, [ENC_FLAG]: manager.algorithm } }];
    });

    // Wrap the stream with encryption just before it reaches the driver
    disk.hook("storing", (_path, stream) => {
      return manager.encrypt(stream);
    });

    // Wrap the stream with decryption when the file is read back
    disk.hook("streaming", (stream, file) => {
      if (!file.metadata[ENC_FLAG]) return;
      return manager.decrypt(stream);
    });
  };
}
