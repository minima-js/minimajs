import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";

/**
 * Self-contained encrypted stream format:
 * [MAGIC:4][salt:32][iv:16][ciphertext...][authTag:16 — GCM only]
 *
 * The header (52 bytes) carries all decryption parameters — no metadata needed.
 * The auth tag is appended at the end; decryption uses a 16-byte lookahead buffer
 * so the stream is processed incrementally without holding it in memory.
 */
const MAGIC = new Uint8Array([0x4e, 0x4b, 0x44, 0x01]);
const HEADER_SIZE = 4 + 32 + 16; // magic(4) + salt(32) + iv(16) = 52 bytes
const GCM_TAG_SIZE = 16;

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

export interface EncryptionOptions {
  /** Encryption algorithm (default: aes-256-gcm) */
  algorithm?: string;
}

export class EncryptionManager {
  public readonly algorithm: string;
  private readonly isGcm: boolean;

  constructor(options: EncryptionOptions = {}) {
    this.algorithm = options.algorithm ?? "aes-256-gcm";
    this.isGcm = this.algorithm.includes("gcm");
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return createHash("sha256").update(password).update(salt).digest();
  }

  /**
   * Returns true if the first bytes match the encryption magic header.
   * Use this in the streaming hook to skip non-encrypted files.
   */
  static isEncrypted(firstBytes: Uint8Array): boolean {
    return firstBytes.length >= MAGIC.length && MAGIC.every((b, i) => firstBytes[i] === b);
  }

  /**
   * Encrypt a stream. Pipes through a TransformStream that prepends the header
   * and appends the GCM auth tag — backpressure is handled automatically.
   */
  encrypt(stream: ReadableStream<Uint8Array>, password: string): ReadableStream<Uint8Array> {
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const key = this.deriveKey(password, salt);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const { isGcm } = this;

    const header = new Uint8Array(HEADER_SIZE);
    header.set(MAGIC, 0);
    header.set(salt, 4);
    header.set(iv, 36);

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      start(controller) {
        controller.enqueue(header);
      },
      transform(chunk, controller) {
        const encrypted = cipher.update(chunk);
        if (encrypted.length > 0) controller.enqueue(new Uint8Array(encrypted));
      },
      flush(controller) {
        const final = cipher.final();
        if (final.length > 0) controller.enqueue(new Uint8Array(final));
        if (isGcm) controller.enqueue(new Uint8Array((cipher as any).getAuthTag()));
      },
    });

    return stream.pipeThrough(transform);
  }

  /**
   * Decrypt a stream produced by `encrypt`. Pipes through a TransformStream
   * with a stateful header parser + 16-byte GCM auth tag lookahead — O(chunk) memory.
   */
  decrypt(stream: ReadableStream<Uint8Array>, password: string): ReadableStream<Uint8Array> {
    const { algorithm, isGcm } = this;
    const deriveKey = this.deriveKey.bind(this);
    const tagSize = isGcm ? GCM_TAG_SIZE : 0;

    let buffer = new Uint8Array(0);
    let decipher: ReturnType<typeof createDecipheriv> | null = null;

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer = concat(buffer, chunk);

        // ── Phase 1: accumulate header ──────────────────────────────────
        if (!decipher) {
          if (buffer.length < HEADER_SIZE) return;
          const salt = Buffer.from(buffer.slice(4, 36));
          const iv = Buffer.from(buffer.slice(36, HEADER_SIZE));
          buffer = buffer.slice(HEADER_SIZE);
          decipher = createDecipheriv(algorithm, deriveKey(password, salt), iv);
        }

        // ── Phase 2: decrypt with GCM tag lookahead ─────────────────────
        if (buffer.length > tagSize) {
          const toProcess = buffer.slice(0, buffer.length - tagSize);
          buffer = buffer.slice(buffer.length - tagSize);
          const dec = decipher.update(toProcess);
          if (dec.length > 0) controller.enqueue(new Uint8Array(dec));
        }
      },
      flush(controller) {
        if (!decipher) {
          controller.error(new Error("Encrypted stream is too short"));
          return;
        }
        if (isGcm) {
          if (buffer.length < tagSize) {
            controller.error(new Error("Malformed encrypted stream: auth tag missing"));
            return;
          }
          const body = buffer.slice(0, buffer.length - tagSize);
          const authTag = buffer.slice(buffer.length - tagSize);
          if (body.length > 0) {
            const dec = decipher.update(body);
            if (dec.length > 0) controller.enqueue(new Uint8Array(dec));
          }
          (decipher as any).setAuthTag(authTag);
        } else if (buffer.length > 0) {
          const dec = decipher.update(buffer);
          if (dec.length > 0) controller.enqueue(new Uint8Array(dec));
        }
        const final = decipher.final();
        if (final.length > 0) controller.enqueue(new Uint8Array(final));
      },
    });

    return stream.pipeThrough(transform);
  }
}
