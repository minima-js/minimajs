export function startsWith(buffer1: Buffer, buffer2: Buffer): boolean {
  if (buffer1.length < buffer2.length) {
    return false;
  }
  for (let i = 0; i < buffer2.length; i++) {
    if (buffer1[i] !== buffer2[i]) {
      return false;
    }
  }
  return true;
}

export function* lines(chunk: Buffer): Generator<Buffer> {
  let lineStart = 0;
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === 10) {
      yield chunk.subarray(lineStart, i + 1);
      lineStart = i + 1;
    }
  }
  if (lineStart < chunk.length) {
    yield chunk.subarray(lineStart);
  }
}
