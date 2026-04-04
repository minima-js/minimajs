import yoctoSpinner from "yocto-spinner";

export interface Spinner {
  start(text?: string): void;
  text: string;
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
}

export async function withSpinner<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
  const spinner = createSpinner();
  spinner.start(label);
  try {
    const result = await fn();
    spinner.succeed(label);
    return result;
  } catch (err) {
    spinner.fail(label);
    throw err;
  }
}

export function createSpinner(): Spinner {
  const inner = yoctoSpinner();

  return {
    get text() {
      return inner.text;
    },
    set text(val: string) {
      inner.text = val;
    },
    start(text?: string) {
      if (text) inner.text = text;
      inner.start(inner.text);
    },
    succeed(text?: string) {
      inner.success(text ?? inner.text);
    },
    fail(text?: string) {
      inner.error(text ?? inner.text);
    },
    stop() {
      inner.stop();
    },
  };
}
