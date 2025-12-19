import { hooks } from "../internal/context.js";

/**
 * Dispatches all registered onSent hooks for the current request.
 * Called after a response has been sent to execute cleanup or post-response tasks.
 */
export async function dispatchSent() {
  for (const hook of hooks().onSent) {
    await hook();
  }
}

/**
 * Dispatches all registered onError hooks for the current request.
 * Called when an error occurs to execute error handling callbacks.
 */
export async function dispatchError(_: {}, _1: {}, error: unknown) {
  for (const hook of hooks().onError) {
    await hook(error);
  }
}
