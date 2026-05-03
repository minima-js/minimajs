import yoctoSpinner from "yocto-spinner";

/**
 * Minimal interface over `yocto-spinner` exposed to callers.
 * Use {@link createSpinner} to obtain an instance.
 */
export interface Spinner {
  /** Updates the spinner label without stopping it. */
  text: string;
  /** Starts spinning, optionally overriding the current label. */
  start(text?: string): void;
  /** Stops with a success indicator, optionally overriding the label. */
  succeed(text?: string): void;
  /** Stops with a failure indicator, optionally overriding the label. */
  fail(text?: string): void;
  /** Stops the spinner without printing a status indicator. */
  stop(): void;
}

/**
 * Runs `fn` under a spinner labelled `label`.
 *
 * Calls `spinner.succeed` when `fn` resolves and `spinner.fail` when it
 * throws, then re-throws the error so callers still receive it.
 */
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

/**
 * Creates and returns a {@link Spinner} backed by `yocto-spinner`.
 *
 * The spinner is not started automatically — call `spinner.start()` when ready.
 */
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
