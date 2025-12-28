import { type ErrorHookCallback, type HookCallback } from "../internal/context.js";
import { context } from "../context.js";

// Re-export all hook types from interfaces
export type {
  LifecycleHook,
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnSentHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
  HookCallback,
  HookStore,
} from "../interfaces/hooks.js";

export type { ErrorHookCallback };

/**
 * Registers a callback to execute after the response has been sent.
 * Useful for cleanup tasks, logging, or post-response processing.
 */
export function defer(cb: HookCallback) {
  const { callbacks: hooks } = context();
  hooks.sent.add(cb);
}

/**
 * Registers an error handling callback for the current request context.
 * Called when an error occurs during request processing.
 */
export function onError(cb: ErrorHookCallback) {
  const { callbacks: hooks } = context();
  hooks.error.add(cb);
}
