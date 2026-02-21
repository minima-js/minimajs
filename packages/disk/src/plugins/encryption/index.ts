import type { Disk } from "../../types.js";
import { DiskFile } from "../../file.js";
import { EncryptionManager, ENCRYPTION_DATA_KEY, ENCRYPTION_METADATA } from "./encryption.js";
import type { EncryptionMetadata, EncryptPluginOptions } from "./types.js";

/**
 * Encryption plugin for Disk
 * Automatically encrypts files on put and decrypts on get
 *
 * @example
 * ```ts
 * const disk = createDisk(fsDriver, encrypt({
 *   password: 'my-secret-password'
 * }));
 *
 * // Files are automatically encrypted
 * await disk.put('secret.txt', 'sensitive data');
 *
 * // Files are automatically decrypted
 * const file = await disk.get('secret.txt');
 * ```
 */

export function encrypt(options: EncryptPluginOptions) {
  return (disk: Disk) => {
    const manager = new EncryptionManager(options);
    const { password, encryptOnPut = true, decryptOnGet = true } = options;

    if (encryptOnPut) {
      // Hook into put operation to encrypt streams
      disk.hook("put", async (context) => {
        if (context.stream) {
          const { stream: encryptedStream, metadata } = manager.encrypt(context.stream, password);

          // Store encryption metadata for later decryption in driver metadata
          if (!context.options.metadata) {
            context.options.metadata = {};
          }
          context.options.metadata[ENCRYPTION_DATA_KEY] = JSON.stringify({
            iv: metadata.iv.toString("base64"),
            salt: metadata.salt.toString("base64"),
            algorithm: metadata.algorithm,
            authTag: metadata.authTag?.toString("base64"),
          });

          context.stream = encryptedStream;
        }
      });

      // Hook after file is stored to add encryption metadata to DiskFile
      disk.hook("stored", async (file, context) => {
        const encryptionData = context.options.metadata?.[ENCRYPTION_DATA_KEY];
        if (encryptionData && file) {
          // Store parsed encryption metadata using symbol in DiskFile.metadata
          file.metadata[ENCRYPTION_METADATA] = JSON.parse(encryptionData);
        }
      });
    }

    if (decryptOnGet) {
      // Hook into retrieved operation to decrypt files
      disk.hook("retrieved", async (file) => {
        if (!file) return file;

        // Check if file has encryption metadata using symbol
        const encryptionData = file.metadata[ENCRYPTION_METADATA] as any;

        if (!encryptionData) return file;

        // Parse metadata
        const metadata: EncryptionMetadata = {
          iv: Buffer.from(encryptionData.iv, "base64"),
          salt: Buffer.from(encryptionData.salt, "base64"),
          algorithm: encryptionData.algorithm,
          authTag: encryptionData.authTag ? Buffer.from(encryptionData.authTag, "base64") : undefined,
        };

        // Return a new DiskFile with decryption in the stream factory
        // This way we don't mutate the original file
        return new DiskFile(file.name, {
          href: file.href,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          metadata: file.metadata,
          stream: async () => {
            const encryptedStream = file.stream();
            return manager.decrypt(encryptedStream, password, metadata);
          },
        });
      });
    }
  };
}
